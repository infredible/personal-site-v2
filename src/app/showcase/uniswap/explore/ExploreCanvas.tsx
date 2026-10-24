'use client'

import * as React from 'react'
import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { UniswapScope } from '@/components/uniswap'
import {
  EXPLORE_PARTS,
  EXPLORE_PRESETS,
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
  nextSort,
  sortPools,
  sortTokens,
  tokenColumns,
  tokenNetworks,
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
  filters: 'Volume period (Tokens), network menu, and search; “/” focuses the search',
  header: 'Sortable columns: a new column starts descending, the same one toggles',
  rows: '64px rows, focusable: ↑↓ Home End move, ←/→ scroll sideways, ↵ opens',
}

/** The live table as a display table, with its own sort so the header frame responds. */
function AnatomyTable({ state, maxRows }: { state: ExploreState; maxRows?: number }) {
  const [tokenSort, setTokenSort] = React.useState<SortState<TokenSortField>>(state.tokenSort)
  const [poolSort, setPoolSort] = React.useState<SortState<PoolSortField>>(state.poolSort)
  const { chain, period, query, status } = state
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
      onSortChange={setTokenSort}
      period={period}
    />
  ) : (
    <ExplorePoolTable
      {...shared}
      rows={maxRows ? pools.slice(0, maxRows) : pools}
      sort={poolSort}
      onSortChange={setPoolSort}
    />
  )
}

/**
 * The live tables taken apart, one region per frame in an exploded vertical
 * stack, rendered from the Component view's current state. The exploded-view
 * transition flies each region (data-explode-target) between here and the page.
 * The header and rows regions are the same table with the other half hidden.
 */
function ExploreAnatomy({ state }: { state: ExploreState }) {
  const [tab, setTab] = React.useState<ExploreTab>(state.tab)
  const [tabFilters, setTabFilters] = React.useState({ period: state.period, chain: state.chain, query: state.query })
  const width = TOKENS_WIDTH

  const parts: Record<ExplorePartId, React.ReactNode> = {
    tabs: (
      <div data-explode-target="tabs" className="w-fit px-uni-8 pt-uni-8">
        <ExploreTabs value={tab} onValueChange={setTab} />
      </div>
    ),
    filters: (
      <div data-explode-target="filters" className="flex px-uni-8 pt-uni-8">
        <ExploreFilterBar
          tab={tab}
          {...tabFilters}
          onPeriodChange={(period) => setTabFilters((f) => ({ ...f, period }))}
          onChainChange={(chain) => setTabFilters((f) => ({ ...f, chain }))}
          onQueryChange={(query) => setTabFilters((f) => ({ ...f, query }))}
        />
      </div>
    ),
    header: (
      <div data-explode-target="header" className="[&_tbody]:hidden">
        <AnatomyTable state={state} />
      </div>
    ),
    rows: (
      <div data-explode-target="rows" className="max-h-[430px] overflow-hidden [&_thead]:hidden">
        <AnatomyTable state={state} maxRows={state.status === 'ready' || state.status === 'refetching' ? 6 : undefined} />
      </div>
    ),
  }

  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live tables, taken apart. Each region is the same component, in the state you left it: tabs, filters, the table header, and the rows."
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

const priceColumn = tokenColumnSet.find((c) => c.id === 'price')!

/** A header cell by itself, in a header row. */
function HeaderCellFrame({ sort }: { sort: SortState<TokenSortField> }) {
  const [current, setCurrent] = React.useState(sort)
  return (
    <UniswapScope className="@container/explore-table rounded-uni-20 bg-surface1 p-uni-8">
      <table role="table" aria-label="Sort header" className="block">
        <thead role="rowgroup" className="block">
          <tr role="row" className="flex w-fit rounded-uni-12 bg-surface2">
            <ExploreTableHeaderCell column={priceColumn} sort={current} onSort={() => setCurrent((s) => nextSort(s, 'price'))} />
          </tr>
        </thead>
      </table>
    </UniswapScope>
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
        description="The pieces rows are made of: change, sparkline and logo cells, and the sort header."
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
        description="At phone width the table follows its own container: the # column hides and the name column pins as logo and symbol while the rest scrolls sideways."
      >
        <CanvasFrame id="narrow-tokens" title="Tokens · 375px" note="Pinned: logo and symbol">
          <Stage width={PHONE_WIDTH}>
            <ExploreTokenTable
              rows={sixTokens}
              sort={presetState('tokens').tokenSort}
              onSortChange={noop}
              status="ready"
            />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="narrow-pools" title="Pools · 375px" note="Pinned: pair and details">
          <Stage width={PHONE_WIDTH}>
            <ExplorePoolTable
              rows={sortPools(getExplorePools('all'), presetState('pools').poolSort).slice(0, 6)}
              sort={presetState('pools').poolSort}
              onSortChange={noop}
              status="ready"
            />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="narrow-page" title="Whole component · 375px" note="Filters stack under the tabs; scrolls inside">
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
