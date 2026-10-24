'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { getExplorePools, getExploreTokens } from './data'
import { ExplorePoolTable } from './ExplorePoolTable'
import { ExploreTokenTable } from './ExploreTokenTable'
import {
  filterPools,
  filterTokens,
  getChain,
  poolVolumeRanks,
  sortPools,
  sortTokens,
  tokenVolumeRanks,
} from './filters'
import { ExploreActiveFilters, type ExploreViewChip } from './parts/ExploreActiveFilters'
import { ExploreFilterBar } from './parts/ExploreFilterBar'
import { ExploreTabs, exploreTabId } from './parts/ExploreTabs'
import { POOL_COLUMNS, tokenColumns } from './parts/columns'
import { DEFAULT_EXPLORE_STATE } from './presets'
import type {
  ExploreChain,
  ExplorePoolStats,
  ExploreState,
  ExploreTab,
  ExploreTimePeriod,
  ExploreTokenStats,
} from './types'

/*
 * Uniswap web's Explore page, Tokens and Pools tabs: the tab row, the filter
 * controls beside it, and the table. Stateful: it owns ExploreState (tab,
 * network, period, search, both sorts, status) and runs the mock "server"
 * (filters.ts over data.ts).
 *
 * Latency is simulated for what would refetch in production: a network or
 * period change keeps the current rows on screen, pulsing, and swaps them
 * after ~600ms; Retry (from the error state) shows the first-load skeleton for
 * as long. Sorting, search and tab switches are instant. A status that comes
 * in with `initialState` is held (presets show a state, not a transition);
 * pass `firstLoadMs` to have an initial "loading" resolve.
 *
 * Production lays the Tokens filters out on a separate row beside category
 * chips; with no chips here, both tabs put them in the tab row (as Pools
 * does): network and search on both, the volume period in the Volume header.
 * The row stacks under 768px. "/" focuses the search when focus isn't
 * already in a field.
 *
 * Under it, ExploreActiveFilters shows while anything differs from the tab's
 * default (all networks, no search, the tab's default sort, 1D): the count,
 * a chip per change, and Reset. Tabs, filters and that row stick together
 * (opaque surface1, at `stickyTop`); the block's height is measured into
 * --explore-controls-height so the table header sticks right under it, and
 * the header's stuck hairline marks the bottom of the whole stack.
 *
 * # is the volume rank on the loaded network (filters.ts), so it survives
 * search and sorting.
 *
 * initialState is read on mount: remount (key) to apply another one.
 */

export type ExploreRowSelection = { tab: 'tokens'; row: ExploreTokenStats } | { tab: 'pools'; row: ExplorePoolStats }

/**
 * Regions marked with data-explode, top to bottom (showcase exploded view).
 * The filters part is two marked elements: the bar ("filters") and the
 * active-filters row ("active-filters") when it shows.
 */
export type ExplorePartId = 'tabs' | 'filters' | 'header' | 'rows'

export const EXPLORE_PARTS: { id: ExplorePartId; label: string }[] = [
  { id: 'tabs', label: 'Tabs' },
  { id: 'filters', label: 'Filters' },
  { id: 'header', label: 'Table header' },
  { id: 'rows', label: 'Rows' },
]

export interface ExploreTablesProps {
  initialState?: ExploreState
  onStateChange?: (state: ExploreState) => void
  onRowSelect?: (selection: ExploreRowSelection) => void
  /** Resolve an initial "loading" status after this many ms (default: held) */
  firstLoadMs?: number
  /** Simulated refetch latency for network and period changes */
  refetchMs?: number
  /** The controls stick this far below their scroll container's top (e.g. under an app bar), the table header under them */
  stickyTop?: number
  /** "/" focuses the search (turn off when several instances share a page) */
  searchShortcut?: boolean
  className?: string
}

/** Sort and period are the tab's defaults. */
type ViewState = Pick<ExploreState, 'tab' | 'period' | 'tokenSort' | 'poolSort'>

const DEFAULT_TOKEN_SORT = DEFAULT_EXPLORE_STATE.tokenSort
const DEFAULT_POOL_SORT = DEFAULT_EXPLORE_STATE.poolSort
const DEFAULT_PERIOD = DEFAULT_EXPLORE_STATE.period

const sameSort = <F extends string>(a: { field: F; direction: string }, b: { field: F; direction: string }) =>
  a.field === b.field && a.direction === b.direction

const sortNames: Record<string, string> = Object.fromEntries(
  [...tokenColumns(), ...POOL_COLUMNS].filter((c) => c.sortField).map((c) => [c.sortField, c.sortLabel ?? c.label]),
)

/**
 * The active-filters row's view chip, when sort or period isn't the tab's
 * default: "Sorted by FDV ↑", "1W volume", "Sorted by FDV ↑ · 1W volume".
 * The period only counts on Tokens (Pools has no period).
 */
export function exploreViewChip({ tab, period, tokenSort, poolSort }: ViewState): ExploreViewChip | undefined {
  const sort = tab === 'tokens' ? tokenSort : poolSort
  const sortChanged = !sameSort(sort, tab === 'tokens' ? DEFAULT_TOKEN_SORT : DEFAULT_POOL_SORT)
  const periodChanged = tab === 'tokens' && period !== DEFAULT_PERIOD
  if (!sortChanged && !periodChanged) return undefined
  const direction = sort.direction === 'asc' ? 'ascending' : 'descending'
  if (!sortChanged) return { label: `${period} volume`, description: `${period} volume` }
  const name = tab === 'tokens' && sort.field === 'volume' ? `${period} volume` : sortNames[sort.field]
  // A period that isn't the sort's own is named after the arrow
  const extra = periodChanged && sort.field !== 'volume' ? ` · ${period} volume` : ''
  return {
    label: `Sorted by ${name}`,
    direction: sort.direction,
    description: `Sorted by ${name}, ${direction}${extra}`,
    suffix: extra || undefined,
  }
}

/** What the rows on screen were loaded for; lags the filters while a refetch is in flight. */
type Loaded = { chain: ExploreChain; period: ExploreTimePeriod }

const isEditable = (el: Element | null) =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable)

export function ExploreTables({
  initialState = DEFAULT_EXPLORE_STATE,
  onStateChange,
  onRowSelect,
  firstLoadMs,
  refetchMs = 600,
  stickyTop = 0,
  searchShortcut = true,
  className,
}: ExploreTablesProps) {
  const [state, setState] = React.useState<ExploreState>(initialState)
  const [loaded, setLoaded] = React.useState<Loaded>({ chain: initialState.chain, period: initialState.period })
  // A simulated request in flight: bumping the id restarts the timer
  const [request, setRequest] = React.useState<{ id: number; ms: number } | null>(() =>
    initialState.status === 'loading' && firstLoadMs !== undefined ? { id: 0, ms: firstLoadMs } : null,
  )
  const idBase = React.useId()
  const searchRef = React.useRef<HTMLInputElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const controlsRef = React.useRef<HTMLDivElement>(null)

  // The sticky controls' height, for the table header's offset. A CSS variable, not state:
  // the active-filters row animates its height, and re-rendering the table each frame isn't needed.
  React.useLayoutEffect(() => {
    const controls = controlsRef.current
    const root = rootRef.current
    if (!controls || !root) return
    const measure = () => root.style.setProperty('--explore-controls-height', `${controls.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(controls)
    return () => observer.disconnect()
  }, [])

  const update = React.useCallback((patch: Partial<ExploreState>) => setState((s) => ({ ...s, ...patch })), [])

  const startRequest = React.useCallback((ms: number) => setRequest((r) => ({ id: (r?.id ?? 0) + 1, ms })), [])

  const latest = React.useRef(state)
  React.useLayoutEffect(() => {
    latest.current = state
  }, [state])

  // Resolve the request: the latest filters' data replaces what's on screen
  React.useEffect(() => {
    if (!request) return
    const timer = window.setTimeout(() => {
      const { chain, period } = latest.current
      setLoaded({ chain, period })
      setState((s) => ({ ...s, status: 'ready' }))
      setRequest(null)
    }, request.ms)
    return () => window.clearTimeout(timer)
  }, [request])

  // Report changes (not the initial state)
  const reported = React.useRef(state)
  React.useEffect(() => {
    if (reported.current === state) return
    reported.current = state
    onStateChange?.(state)
  }, [state, onStateChange])

  /** Network and period changes refetch: keep rows and pulse them (skeletons if nothing is loaded yet) */
  const refetch = (patch: Partial<ExploreState>) => {
    setState((s) => ({ ...s, ...patch, status: s.status === 'ready' || s.status === 'refetching' ? 'refetching' : 'loading' }))
    startRequest(refetchMs)
  }

  const retry = () => {
    update({ status: 'loading' })
    startRequest(refetchMs)
  }

  // "/" focuses the search
  React.useEffect(() => {
    if (!searchShortcut) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const active = document.activeElement
      if (isEditable(active) || active?.closest('[role=dialog],[role=menu],[role=listbox]')) return
      // Focusing expands the collapsed search; skip (and keep the "/") when it's hidden
      const input = searchRef.current
      if (!input || input.offsetParent === null) return
      e.preventDefault()
      input.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [searchShortcut])

  const tokenRows = React.useMemo(
    () => sortTokens(filterTokens(getExploreTokens(loaded.chain), state.query), state.tokenSort, loaded.period),
    [loaded, state.query, state.tokenSort],
  )
  const poolRows = React.useMemo(
    () => sortPools(filterPools(getExplorePools(loaded.chain), state.query), state.poolSort),
    [loaded.chain, state.query, state.poolSort],
  )
  // Before search, whatever the sort
  const tokenRanks = React.useMemo(() => tokenVolumeRanks(getExploreTokens(loaded.chain), loaded.period), [loaded])
  const poolRanks = React.useMemo(() => poolVolumeRanks(getExplorePools(loaded.chain)), [loaded.chain])

  // First-load skeletons match the rows that will arrive, so nothing jumps when they do
  const expected = state.tab === 'tokens'
    ? filterTokens(getExploreTokens(state.chain), state.query).length
    : filterPools(getExplorePools(state.chain), state.query).length
  const skeletonRows = Math.min(Math.max(expected, 4), 20)

  const focusSearch = () => searchRef.current?.focus({ preventScroll: true })

  /** Sort and period back to the tab's default (the period refetches) */
  const resetView = () => {
    if (state.tab === 'pools') return update({ poolSort: DEFAULT_POOL_SORT })
    if (state.period !== DEFAULT_PERIOD) refetch({ tokenSort: DEFAULT_TOKEN_SORT, period: DEFAULT_PERIOD })
    else update({ tokenSort: DEFAULT_TOKEN_SORT })
  }

  /** Everything the active-filters row shows, back to the tab's default */
  const reset = () => {
    const patch: Partial<ExploreState> = { chain: 'all', query: '' }
    if (state.tab === 'tokens') Object.assign(patch, { tokenSort: DEFAULT_TOKEN_SORT, period: DEFAULT_PERIOD })
    else patch.poolSort = DEFAULT_POOL_SORT
    const refetches = state.chain !== 'all' || (state.tab === 'tokens' && state.period !== DEFAULT_PERIOD)
    if (refetches) refetch(patch)
    else update(patch)
  }

  const view = exploreViewChip(state)
  const filtered = state.chain !== 'all' || state.query.trim() !== '' || !!view

  const panelId = `${idBase}-panel`
  const shared = {
    status: state.status,
    query: state.query,
    chain: loaded.chain,
    onRetry: retry,
    onClearSearch: () => {
      update({ query: '' })
      focusSearch()
    },
    onSearchAllNetworks: () => {
      refetch({ chain: 'all' })
      // The button unmounts with the empty state; keep focus in the filters
      focusSearch()
    },
    skeletonRows,
    stickyTop: `calc(${stickyTop}px + var(--explore-controls-height, 0px))`,
    explode: true,
  }

  const count = state.tab === 'tokens' ? tokenRows.length : poolRows.length
  const noun = state.tab === 'tokens' ? (count === 1 ? 'token' : 'tokens') : count === 1 ? 'pool' : 'pools'
  // The visible count (active-filters row) isn't live; this announces it
  const announcement =
    state.status === 'loading' ? `Loading ${state.tab}` : state.status === 'ready' && filtered ? `${count} ${noun}` : ''

  return (
    <div
      ref={rootRef}
      data-slot="explore-tables"
      className={cn('@container/explore mx-auto flex w-full max-w-[1200px] min-w-0 flex-col', className)}
    >
      <div
        ref={controlsRef}
        data-slot="explore-controls"
        // Opaque lead-in above the tabs (offset by the negative margin): once
        // stuck it clears whatever sits at the top edge, e.g. the mobile frame's corner
        className="sticky z-20 -mt-uni-20 bg-surface1 pt-uni-20"
        style={{ top: stickyTop }}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-uni-16 pb-uni-4',
            '@max-[768px]/explore:flex-col @max-[768px]/explore:items-start @max-[768px]/explore:gap-uni-12 @max-[768px]/explore:pb-uni-12',
          )}
        >
          <div data-explode="tabs">
            <ExploreTabs
              value={state.tab}
              onValueChange={(tab: ExploreTab) => update({ tab })}
              idBase={idBase}
              panelId={panelId}
            />
          </div>
          <div data-explode="filters" className="flex min-w-0 @max-[768px]/explore:w-full">
            <ExploreFilterBar
              tab={state.tab}
              chain={state.chain}
              onChainChange={(chain) => chain !== state.chain && refetch({ chain })}
              query={state.query}
              onQueryChange={(query) => update({ query })}
              searchRef={searchRef}
              className="@max-[768px]/explore:w-full"
            />
          </div>
        </div>
        <div data-explode={filtered ? 'active-filters' : undefined}>
          <ExploreActiveFilters
            noun={state.tab}
            count={count}
            status={state.status}
            chain={state.chain === 'all' ? undefined : getChain(state.chain)}
            query={state.query}
            view={view}
            onRemoveChain={() => refetch({ chain: 'all' })}
            onRemoveQuery={() => update({ query: '' })}
            onResetView={resetView}
            onReset={reset}
            onEmpty={focusSearch}
          />
        </div>
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={exploreTabId(idBase, state.tab)}>
        {state.tab === 'tokens' ? (
          <ExploreTokenTable
            {...shared}
            rows={tokenRows}
            sort={state.tokenSort}
            onSortChange={(tokenSort) => update({ tokenSort })}
            period={loaded.period}
            selectedPeriod={state.period}
            onPeriodChange={(period) => period !== state.period && refetch({ period })}
            ranks={tokenRanks}
            onRowSelect={onRowSelect ? (row) => onRowSelect({ tab: 'tokens', row }) : undefined}
          />
        ) : (
          <ExplorePoolTable
            {...shared}
            rows={poolRows}
            sort={state.poolSort}
            onSortChange={(poolSort) => update({ poolSort })}
            ranks={poolRanks}
            onRowSelect={onRowSelect ? (row) => onRowSelect({ tab: 'pools', row }) : undefined}
          />
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
