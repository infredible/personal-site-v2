'use client'

import * as React from 'react'
import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { UniswapScope } from '@/components/uniswap'
import {
  EXPLORE_PARTS,
  EXPLORE_PRESETS,
  ExploreActiveFilters,
  ExploreFilterBar,
  ExplorePoolTable,
  ExploreTabs,
  ExploreTable,
  ExploreTableHeaderCell,
  ExploreTables,
  ExploreTokenTable,
  POOL_COLUMNS,
  PoolLogos,
  PoolTableRow,
  PoolTableSkeletonRow,
  PriceChangeCell,
  TokenSparklineCell,
  TokenTableRow,
  TokenTableSkeletonRow,
  EXPLORE_POOL_STATS,
  filterPools,
  filterTokens,
  getExplorePools,
  getChain,
  getExploreTokens,
  exploreViewChip,
  nextSort,
  poolVolumeRanks,
  sortPools,
  sortTokens,
  tokenColumns,
  tokenNetworks,
  tokenVolumeRanks,
  type ExploreActiveFiltersProps,
  type ExploreChain,
  type ExplorePartId,
  type ExplorePoolStats,
  type ExploreState,
  type ExploreTab,
  type ExploreTimePeriod,
  type PoolSortField,
  type SortState,
  type TokenSortField,
} from '@/components/uniswap/explore'
import { TOKENS } from '@/components/uniswap/swap/tokens'
import { cn } from '@/lib/utils'

/*
 * Canvas view of the Explore tables: the live tables taken apart (anatomy),
 * then rows, cells, states, the narrow layout and both themes. Every frame is
 * the real component: ExploreTables, the display tables, or one of their parts.
 */

// Tokens tables reach their full layout at 1104px; Pools at 850px
const TOKENS_WIDTH = 1120
const POOLS_WIDTH = 1000
const PHONE_WIDTH = 375

const presetState = (id: (typeof EXPLORE_PRESETS)[number]['id']) => EXPLORE_PRESETS.find((p) => p.id === id)!.state

const noop = () => {}

/** Static token frames still show the Volume header's period menu, as the live table does */
const staticPeriod = { columnId: 'volume', value: '1D', onValueChange: noop } as const

/** A Uniswap-scoped surface for a frame. Follows the site theme unless forced. */
function Stage({
  theme,
  width,
  card = false,
  className,
  children,
}: {
  theme?: 'light' | 'dark'
  width: number
  /** Exploded-view card: its background fades in behind a part flying into it */
  card?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <UniswapScope
      theme={theme}
      data-explode-card={card ? '' : undefined}
      className={cn('@container/explore rounded-uni-20 bg-surface1 px-uni-8 pb-uni-8', className)}
      style={{ width, maxWidth: '100%' }}
    >
      {children}
    </UniswapScope>
  )
}

/* Anatomy ----------------------------------------------------------------- */

const PART_NOTES: Record<ExplorePartId, string> = {
  tabs: 'Tokens and Pools; ←/→ move between them',
  filters: 'Network and search, on both tabs (“/” focuses it); chips and Reset when not at the default',
  header: 'A new column sorts descending, the same one toggles; Volume holds its period; # is volume rank',
  rows: '64px rows, focusable: ↑↓ Home End move, ←/→ scroll sideways when columns overflow, ↵ opens',
}

/** The live table as a display table: header and rows frames share the anatomy's state. */
function AnatomyTable({
  state,
  onChange,
  maxRows,
}: {
  state: ExploreState
  onChange: (patch: Partial<ExploreState>) => void
  maxRows?: number
}) {
  const { chain, period, query, status, tokenSort, poolSort } = state
  const tokenRanks = React.useMemo(() => tokenVolumeRanks(getExploreTokens(chain), period), [chain, period])
  const poolRanks = React.useMemo(() => poolVolumeRanks(getExplorePools(chain)), [chain])
  const tokens = React.useMemo(
    () => sortTokens(filterTokens(getExploreTokens(chain), query), tokenSort, period),
    [chain, period, query, tokenSort],
  )
  const pools = React.useMemo(
    () => sortPools(filterPools(getExplorePools(chain), query), poolSort),
    [chain, query, poolSort],
  )
  const shared = { status, query, chain, onRetry: noop, onClearSearch: noop, onSearchAllNetworks: noop, skeletonRows: maxRows ?? 8 }
  return state.tab === 'tokens' ? (
    <ExploreTokenTable
      {...shared}
      rows={maxRows ? tokens.slice(0, maxRows) : tokens}
      sort={tokenSort}
      onSortChange={(next) => onChange({ tokenSort: next })}
      period={period}
      onPeriodChange={(next) => onChange({ period: next })}
      ranks={tokenRanks}
    />
  ) : (
    <ExplorePoolTable
      {...shared}
      rows={maxRows ? pools.slice(0, maxRows) : pools}
      sort={poolSort}
      onSortChange={(next) => onChange({ poolSort: next })}
      ranks={poolRanks}
    />
  )
}

/** The active-filters row's props for a state, with handlers that patch it (no latency here). */
function activeFiltersFor(
  state: ExploreState,
  onChange: (patch: Partial<ExploreState>) => void,
): ExploreActiveFiltersProps {
  const { tab, chain } = state
  const rows = tab === 'tokens' ? filterTokens(getExploreTokens(chain), state.query) : filterPools(getExplorePools(chain), state.query)
  const defaults = presetState('tokens')
  const defaultView = tab === 'tokens' ? { tokenSort: defaults.tokenSort, period: defaults.period } : { poolSort: defaults.poolSort }
  return {
    noun: tab,
    count: rows.length,
    status: state.status,
    chain: chain === 'all' ? undefined : getChain(chain),
    query: state.query,
    view: exploreViewChip(state),
    onRemoveChain: () => onChange({ chain: 'all' }),
    onRemoveQuery: () => onChange({ query: '' }),
    onResetView: () => onChange(defaultView),
    onReset: () => onChange({ chain: 'all', query: '', ...defaultView }),
  }
}

/**
 * The live tables taken apart, one region per frame in an exploded vertical
 * stack, rendered from the Component view's current state (then live here:
 * the frames share it, so sorting in the header frame reorders the rows
 * frame). The exploded-view transition flies each region (data-explode-target)
 * between here and the page; the filters frame holds two, the bar and the
 * active-filters row. The header and rows regions are the same table with the
 * other half hidden.
 */
function ExploreAnatomy({ state: initialState }: { state: ExploreState }) {
  const [state, setState] = React.useState(initialState)
  const update = React.useCallback((patch: Partial<ExploreState>) => setState((s) => ({ ...s, ...patch })), [])
  const width = TOKENS_WIDTH
  const activeFilters = activeFiltersFor(state, update)
  const filtered = !!(activeFilters.chain || state.query.trim() || activeFilters.view)

  const parts: Record<ExplorePartId, React.ReactNode> = {
    tabs: (
      <div data-explode-target="tabs" className="w-fit px-uni-8 pt-uni-8">
        <ExploreTabs value={state.tab} onValueChange={(tab) => update({ tab })} />
      </div>
    ),
    filters: (
      <div className="px-uni-8 pt-uni-8">
        <div data-explode-target="filters" className="flex">
          <ExploreFilterBar
            tab={state.tab}
            chain={state.chain}
            query={state.query}
            onChainChange={(chain) => update({ chain })}
            onQueryChange={(query) => update({ query })}
          />
        </div>
        <div data-explode-target={filtered ? 'active-filters' : undefined} className={cn(filtered && 'pt-uni-4')}>
          <ExploreActiveFilters {...activeFilters} />
        </div>
      </div>
    ),
    header: (
      <div data-explode-target="header" className="[&_tbody]:hidden">
        <AnatomyTable state={state} onChange={update} />
      </div>
    ),
    rows: (
      <div data-explode-target="rows" className="max-h-[430px] overflow-hidden [&_thead]:hidden">
        <AnatomyTable
          state={state}
          onChange={update}
          maxRows={state.status === 'ready' || state.status === 'refetching' ? 6 : undefined}
        />
      </div>
    ),
  }

  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live tables, taken apart. Each region is the same component, in the state you left it: tabs, filters (with the active-filters row when something isn’t default), the table header, and the rows."
      direction="column"
    >
      {EXPLORE_PARTS.map((part) => (
        <CanvasFrame key={part.id} id={`part-${part.id}`} title={part.label} note={PART_NOTES[part.id]} labelPlacement="side">
          <Stage card width={width} className={part.id === 'tabs' || part.id === 'filters' ? 'pb-uni-8' : undefined}>
            {parts[part.id]}
          </Stage>
        </CanvasFrame>
      ))}
    </CanvasSection>
  )
}

/* Rows -------------------------------------------------------------------- */

const tokenColumnSet = tokenColumns()
const uni = getExploreTokens('all').find((r) => r.token.symbol === 'UNI')!
const baseUsdc = getExploreTokens('base').find((r) => r.token.symbol === 'USDC')!

const findPool = (match: (p: ExplorePoolStats) => boolean) => EXPLORE_POOL_STATS.find(match)!
const plainPool = findPool((p) => p.protocol === 'v3' && p.chain === 'ethereum' && p.token0.symbol === 'ETH' && p.token1.symbol === 'USDC' && p.feeTier === 0.0005)
const rewardPool = findPool((p) => p.chain === 'base' && p.rewardApr !== undefined)
const hookPool = findPool((p) => p.chain === 'ethereum' && p.protocol === 'v4' && p.hook === 'Dynamic Fee')
const rewardHookPool = findPool((p) => p.chain === 'unichain' && p.hook === 'Dynamic Fee' && p.rewardApr !== undefined)

/**
 * Forced row states for static frames. Hover and keyboard focus are pseudo-classes,
 * so these mirror their classes on the row and its pinned cells.
 */
const FORCE = {
  hover: '[&_tbody_[role=row]]:bg-surface1Hovered [&_tbody_[role=cell]]:bg-surface1Hovered',
  focus: '[&_tbody_[role=row]]:bg-surface1Hovered [&_tbody_[role=cell]]:bg-surface1Hovered [&_tbody_[role=row]]:after:ring-2 [&_tbody_[role=row]]:after:ring-accent1 [&_tbody_[role=row]]:after:ring-inset',
}

/** A table holding the given rows, for showing a row on its own. */
function RowTable({
  tab,
  rowId,
  force,
  pulse,
  children,
}: {
  tab: ExploreTab
  rowId: string
  force?: keyof typeof FORCE
  pulse?: boolean
  children: React.ReactNode
}) {
  return (
    <ExploreTable
      label={tab === 'tokens' ? 'Tokens' : 'Pools'}
      columns={tab === 'tokens' ? tokenColumnSet : POOL_COLUMNS}
      sort={tab === 'tokens' ? { field: 'volume', direction: 'desc' } : { field: 'volume1d', direction: 'desc' }}
      period={tab === 'tokens' ? staticPeriod : undefined}
      rowIds={[rowId]}
      pulse={pulse}
      className={force && FORCE[force]}
    >
      {children}
    </ExploreTable>
  )
}

function TokenRowFrame({
  row = uni,
  query,
  force,
  pulse,
  chain,
  period = '1D',
}: {
  row?: typeof uni
  query?: string
  force?: keyof typeof FORCE
  pulse?: boolean
  chain?: ExploreChain
  period?: ExploreTimePeriod
}) {
  const info = chain && chain !== 'all' ? getChain(chain) : undefined
  const networks = info ? undefined : tokenNetworks(row.token.symbol)
  return (
    <Stage width={TOKENS_WIDTH}>
      <RowTable tab="tokens" rowId={row.id} force={force} pulse={pulse}>
        <TokenTableRow
          row={row}
          rank={1}
          columns={tokenColumnSet}
          period={period}
          query={query}
          badge={info ?? (networks?.length === 1 ? networks[0] : undefined)}
          networks={networks}
        />
      </RowTable>
    </Stage>
  )
}

function PoolRowFrame({
  row = plainPool,
  query,
  force,
  pulse,
}: {
  row?: ExplorePoolStats
  query?: string
  force?: keyof typeof FORCE
  pulse?: boolean
}) {
  return (
    <Stage width={POOLS_WIDTH}>
      <RowTable tab="pools" rowId={row.id} force={force} pulse={pulse}>
        <PoolTableRow row={row} rank={1} columns={POOL_COLUMNS} query={query} badge={getChain(row.chain)} />
      </RowTable>
    </Stage>
  )
}

function SkeletonFrame({ tab }: { tab: ExploreTab }) {
  return (
    <Stage width={tab === 'tokens' ? TOKENS_WIDTH : POOLS_WIDTH}>
      <ExploreTable
        label={tab === 'tokens' ? 'Tokens' : 'Pools'}
        columns={tab === 'tokens' ? tokenColumnSet : POOL_COLUMNS}
        sort={tab === 'tokens' ? { field: 'volume', direction: 'desc' } : { field: 'volume1d', direction: 'desc' }}
        period={tab === 'tokens' ? staticPeriod : undefined}
        rowIds={[]}
        shimmer
        busy
      >
        {Array.from({ length: 3 }, (_, i) =>
          tab === 'tokens' ? (
            <TokenTableSkeletonRow key={i} columns={tokenColumnSet} />
          ) : (
            <PoolTableSkeletonRow key={i} columns={POOL_COLUMNS} />
          ),
        )}
      </ExploreTable>
    </Stage>
  )
}

/* Cells ------------------------------------------------------------------- */

/** A small surface for a cell on its own, in the table's row type. */
function CellStage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <UniswapScope
      className={cn('flex min-h-[64px] min-w-[200px] items-center justify-center rounded-uni-20 bg-surface1 px-uni-24 text-body2 text-neutral1 [font-variant-numeric:lining-nums_tabular-nums]', className)}
    >
      {children}
    </UniswapScope>
  )
}

/** A header cell by itself, in a header row. Volume gets its period menu. */
function HeaderCellFrame({
  columnId = 'price',
  sort,
  period: initialPeriod = '1D',
}: {
  columnId?: 'index' | 'price' | 'volume'
  sort: SortState<TokenSortField>
  period?: ExploreTimePeriod
}) {
  const [current, setCurrent] = React.useState(sort)
  const [period, setPeriod] = React.useState(initialPeriod)
  const column = tokenColumns(undefined, period).find((c) => c.id === columnId)!
  return (
    // No @container/explore-table: inline-size containment would collapse the fitted frame; with no
    // container the cell's container-query variants stay off, as in the full-width table
    <UniswapScope className="w-fit rounded-uni-20 bg-surface1 p-uni-8">
      <table role="table" aria-label="Sort header" className="block">
        <thead role="rowgroup" className="block">
          <tr role="row" className="flex w-fit rounded-uni-12 bg-surface2">
            <ExploreTableHeaderCell
              column={column}
              sort={current}
              onSort={(field) => setCurrent((s) => nextSort(s, field))}
              period={columnId === 'volume' ? { columnId, value: period, onValueChange: setPeriod } : undefined}
            />
          </tr>
        </thead>
      </table>
    </UniswapScope>
  )
}

/** The active-filters row on its own, live: chips remove, and the row comes back after Reset. */
function ActiveFiltersFrame({ presetId }: { presetId: (typeof EXPLORE_PRESETS)[number]['id'] }) {
  const [state, setState] = React.useState(() => presetState(presetId))
  const props = activeFiltersFor(state, (patch) => setState((s) => ({ ...s, ...patch })))
  const empty = !props.chain && !state.query.trim() && !props.view
  return (
    <Stage width={TOKENS_WIDTH} className="min-h-[54px] pt-uni-8">
      <ExploreActiveFilters {...props} />
      {empty && (
        <button
          type="button"
          onClick={() => setState(presetState(presetId))}
          className="h-[38px] cursor-pointer px-uni-4 text-buttonLabel4 text-neutral2 hover:text-neutral1"
        >
          Hidden at the tab’s default · show again
        </button>
      )}
    </Stage>
  )
}

/* States ------------------------------------------------------------------ */

const sixTokens = sortTokens(getExploreTokens('all'), presetState('tokens').tokenSort, '1D').slice(0, 6)

function StateTable({ status }: { status: 'loading' | 'refetching' | 'error' }) {
  return (
    <Stage width={TOKENS_WIDTH}>
      <ExploreTokenTable
        rows={sixTokens}
        sort={presetState('tokens').tokenSort}
        onSortChange={noop}
        status={status}
        skeletonRows={6}
        onRetry={noop}
        onPeriodChange={noop}
      />
    </Stage>
  )
}

/** The whole stateful component, held in a preset's state. */
function ExploreInStage({
  presetId,
  width,
  theme,
  height,
}: {
  presetId: (typeof EXPLORE_PRESETS)[number]['id']
  width: number
  theme?: 'light' | 'dark'
  /** Clip to this height and scroll inside the frame */
  height?: number
}) {
  return (
    <Stage theme={theme} width={width} className="pt-uni-16">
      <div className={cn(height && 'overflow-y-auto overscroll-contain')} style={height ? { height } : undefined}>
        <ExploreTables initialState={presetState(presetId)} searchShortcut={false} />
      </div>
    </Stage>
  )
}

/* Narrow ------------------------------------------------------------------ */

/** A phone-width display table with its own sort, so the sort menu works in the frame. */
function NarrowTable({
  tab,
  tokenSort: initialTokenSort = presetState('tokens').tokenSort,
  poolSort: initialPoolSort = presetState('pools').poolSort,
  status = 'ready',
}: {
  tab: ExploreTab
  tokenSort?: SortState<TokenSortField>
  poolSort?: SortState<PoolSortField>
  status?: 'ready' | 'loading'
}) {
  const [tokenSort, setTokenSort] = React.useState(initialTokenSort)
  const [poolSort, setPoolSort] = React.useState(initialPoolSort)
  const [period, setPeriod] = React.useState<ExploreTimePeriod>('1D')
  const tokens = React.useMemo(() => sortTokens(getExploreTokens('all'), tokenSort, period).slice(0, 6), [tokenSort, period])
  const pools = React.useMemo(() => sortPools(getExplorePools('all'), poolSort).slice(0, 6), [poolSort])
  return (
    <Stage width={PHONE_WIDTH}>
      {tab === 'tokens' ? (
        <ExploreTokenTable
          rows={tokens}
          sort={tokenSort}
          onSortChange={setTokenSort}
          period={period}
          onPeriodChange={setPeriod}
          status={status}
          skeletonRows={4}
        />
      ) : (
        <ExplorePoolTable rows={pools} sort={poolSort} onSortChange={setPoolSort} status={status} skeletonRows={4} />
      )}
    </Stage>
  )
}

/* Canvas ------------------------------------------------------------------ */

export function ExploreCanvas({
  controller,
  anatomyState,
}: {
  controller: CanvasController
  anatomyState: ExploreState
}) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2400} initialFocus="anatomy" aria-label="Explore tables component canvas">
      <ExploreAnatomy state={anatomyState} />

      <CanvasSection
        id="rows"
        title="Rows"
        description="64px rows with a 12px hover fill. Tokens show name and symbol (a network count on hover for multi-network tokens); pools show the pair, protocol, fee tier and hook."
      >
        <CanvasFrame id="row-token" title="Token · default" note="Hover to swap the symbol for its networks">
          <TokenRowFrame />
        </CanvasFrame>
        <CanvasFrame id="row-token-hover" title="Token · hover" note="surface1Hovered fill, pinned cells included">
          <TokenRowFrame force="hover" />
        </CanvasFrame>
        <CanvasFrame id="row-token-focus" title="Token · focused" note="Keyboard focus: the same fill plus a 2px accent ring">
          <TokenRowFrame force="focus" />
        </CanvasFrame>
        <CanvasFrame id="row-token-refetching" title="Token · refetching" note="Old values stay and pulse until the new ones arrive">
          <TokenRowFrame pulse />
        </CanvasFrame>
        <CanvasFrame id="row-token-search" title="Token · search “un”" note="Matches are highlighted in the name and symbol">
          <TokenRowFrame query="un" />
        </CanvasFrame>
        <CanvasFrame id="row-token-network" title="Token · one network" note="Network selected: its badge sits on the logo">
          <TokenRowFrame row={baseUsdc} chain="base" />
        </CanvasFrame>
        <CanvasFrame id="row-pool" title="Pool · default" note="v3 · 0.05%">
          <PoolRowFrame />
        </CanvasFrame>
        <CanvasFrame id="row-pool-hover" title="Pool · hover" note="Same fill as a token row">
          <PoolRowFrame force="hover" />
        </CanvasFrame>
        <CanvasFrame id="row-pool-focus" title="Pool · focused">
          <PoolRowFrame force="focus" />
        </CanvasFrame>
        <CanvasFrame id="row-pool-refetching" title="Pool · refetching">
          <PoolRowFrame pulse />
        </CanvasFrame>
        <CanvasFrame id="row-pool-search" title="Pool · search “eth”" note="Highlights either side of the pair">
          <PoolRowFrame query="eth" />
        </CanvasFrame>
        <CanvasFrame id="row-pool-reward" title="Pool · reward APR" note="Incentive APR under the fee APR; hover explains the split">
          <PoolRowFrame row={rewardPool} />
        </CanvasFrame>
        <CanvasFrame id="row-pool-hook" title="Pool · v4 with hook" note="v4 · 0.05% · Dynamic Fee">
          <PoolRowFrame row={hookPool} />
        </CanvasFrame>
        <CanvasFrame id="row-pool-hook-reward" title="Pool · hook and rewards" note="On Unichain">
          <PoolRowFrame row={rewardHookPool} />
        </CanvasFrame>
        <CanvasFrame id="row-skeleton-token" title="Skeleton · token" note="Each cell sized to the text it stands in for">
          <SkeletonFrame tab="tokens" />
        </CanvasFrame>
        <CanvasFrame id="row-skeleton-pool" title="Skeleton · pool">
          <SkeletonFrame tab="pools" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="cells"
        title="Cells"
        description="The pieces rows are made of: change, sparkline and logo cells, the sort header (Volume’s split into sort label and period menu), and the active-filters row."
      >
        <CanvasFrame id="cell-change-up" title="Change · up" note="Green arrow, absolute value">
          <CellStage>
            <PriceChangeCell change={0.0423} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-change-down" title="Change · down" note="Red arrow">
          <CellStage>
            <PriceChangeCell change={-0.0187} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-change-flat" title="Change · flat" note="Rounds to zero: neutral arrow">
          <CellStage>
            <PriceChangeCell change={0.00001} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-spark-up" title="Sparkline · up" note="Green unless the 1D change is negative">
          <CellStage>
            <TokenSparklineCell token={TOKENS.ETH} change={0.02} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-spark-down" title="Sparkline · down">
          <CellStage>
            <TokenSparklineCell token={TOKENS.UNI} change={-0.03} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-spark-stable" title="Sparkline · stable" note="Stablecoins keep a calm range">
          <CellStage>
            <TokenSparklineCell token={TOKENS.USDC} change={0} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-pool-logos" title="Pool logos" note="One circle split between the pair">
          <CellStage>
            <PoolLogos token0={TOKENS.ETH} token1={TOKENS.USDC} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-pool-logos-chain" title="Pool logos · network" note="Network badge at 40% of the size">
          <CellStage>
            <PoolLogos token0={TOKENS.UNI} token1={TOKENS.ETH} chain={getChain('base')} />
          </CellStage>
        </CanvasFrame>
        <CanvasFrame id="cell-sort-inactive" title="Sort header · inactive" note="Click to sort">
          <HeaderCellFrame sort={{ field: 'volume', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="cell-sort-asc" title="Sort header · ascending" note="Arrow up">
          <HeaderCellFrame sort={{ field: 'price', direction: 'asc' }} />
        </CanvasFrame>
        <CanvasFrame id="cell-sort-desc" title="Sort header · descending" note="Hover for its description">
          <HeaderCellFrame sort={{ field: 'price', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="cell-volume-inactive" title="Volume header · not sorted" note="Two tab stops: “Sort by volume”, then “Volume period, 1D”">
          <HeaderCellFrame columnId="volume" sort={{ field: 'price', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="cell-volume-sorted" title="Volume header · sorted" note="The default sort; the period menu opens 1H … 1Y">
          <HeaderCellFrame columnId="volume" sort={{ field: 'volume', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="cell-volume-1w" title="Volume header · 1W" note="Changing the period refetches; sorted by volume, rows then reorder">
          <HeaderCellFrame columnId="volume" sort={{ field: 'volume', direction: 'desc' }} period="1W" />
        </CanvasFrame>
        <CanvasFrame id="cell-rank" title="# header" note="Always the volume rank, whatever the sort; the tooltip names the period">
          <HeaderCellFrame columnId="index" sort={{ field: 'volume', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="cell-active-filters" title="Active filters · network, search, sort" note="Count, a chip per change, Reset; each ✕ removes one">
          <ActiveFiltersFrame presetId="filtered" />
        </CanvasFrame>
        <CanvasFrame id="cell-active-filters-view" title="Active filters · sort only" note="Shown whenever the view isn’t the tab’s default">
          <ActiveFiltersFrame presetId="sorted-1h" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="states"
        title="States"
        description="First load shimmers skeleton rows; a refetch keeps old values on screen and pulses them. Empty and error say what to do next."
      >
        <CanvasFrame id="state-loading" title="Loading" note="Skeleton rows; the header stays usable">
          <StateTable status="loading" />
        </CanvasFrame>
        <CanvasFrame id="state-refetching" title="Refetching" note="Old rows pulse until the new ones arrive">
          <StateTable status="refetching" />
        </CanvasFrame>
        <CanvasFrame id="state-empty" title="Empty search · on Base" note="“Search all networks” widens the search and finds PEPE">
          <ExploreInStage presetId="no-results" width={TOKENS_WIDTH} />
        </CanvasFrame>
        <CanvasFrame id="state-error" title="Error" note="Dimmed header over static skeleton rows">
          <StateTable status="error" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="narrow"
        title="Narrow"
        description="Under 640px of table width (the table's own container, so a 375px frame is a phone) rows drop to two columns and nothing scrolls sideways. Left: logo, name, and a subline whose metric follows the sort; right: values, right-aligned. The header becomes the label and a sort menu."
      >
        <CanvasFrame id="narrow-tokens" title="Tokens · 375px" note="Price over 1D change; the subline shows volume by default">
          <NarrowTable tab="tokens" />
        </CanvasFrame>
        <CanvasFrame id="narrow-tokens-fdv" title="Tokens · sorted by FDV" note="The subline follows the sort: SYMBOL · $410.0B FDV">
          <NarrowTable tab="tokens" tokenSort={{ field: 'fdv', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="narrow-tokens-1h" title="Tokens · sorted by 1H" note="Sort menu: pick a field; the current one reverses; Volume carries its period inline">
          <NarrowTable tab="tokens" tokenSort={{ field: 'change1h', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="narrow-pools" title="Pools · 375px" note="TVL over the sort's metric: 1D vol by default">
          <NarrowTable tab="pools" />
        </CanvasFrame>
        <CanvasFrame id="narrow-pools-apr" title="Pools · sorted by APR" note="Rewards shrink to the UNI logo; hover for the split">
          <NarrowTable tab="pools" poolSort={{ field: 'apr', direction: 'desc' }} />
        </CanvasFrame>
        <CanvasFrame id="narrow-loading" title="Loading · 375px" note="Skeletons in the two-column shape">
          <NarrowTable tab="tokens" status="loading" />
        </CanvasFrame>
        <CanvasFrame id="narrow-page" title="Whole component · 375px" note="Filters stack under the tabs; tabs, filters and the table header stick while it scrolls inside">
          <ExploreInStage presetId="tokens" width={PHONE_WIDTH} height={720} />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="themes"
        title="Themes"
        description="The same tables, forced light and dark."
      >
        <CanvasFrame id="theme-light" title="Light">
          <ExploreInStage presetId="tokens" width={TOKENS_WIDTH} theme="light" height={620} />
        </CanvasFrame>
        <CanvasFrame id="theme-dark" title="Dark">
          <ExploreInStage presetId="tokens" width={TOKENS_WIDTH} theme="dark" height={620} />
        </CanvasFrame>
      </CanvasSection>
    </Canvas>
  )
}
