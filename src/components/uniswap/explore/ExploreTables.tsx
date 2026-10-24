'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { getExplorePools, getExploreTokens } from './data'
import { ExplorePoolTable } from './ExplorePoolTable'
import { ExploreTokenTable } from './ExploreTokenTable'
import { filterPools, filterTokens, sortPools, sortTokens } from './filters'
import { ExploreFilterBar } from './parts/ExploreFilterBar'
import { ExploreTabs, exploreTabId } from './parts/ExploreTabs'
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
 * does). The row stacks under 768px. "/" focuses the search when focus isn't
 * already in a field.
 *
 * initialState is read on mount: remount (key) to apply another one.
 */

export type ExploreRowSelection = { tab: 'tokens'; row: ExploreTokenStats } | { tab: 'pools'; row: ExplorePoolStats }

/** Regions marked with data-explode, top to bottom (showcase exploded view). */
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
  /** The table header sticks this far below its scroll container's top (e.g. under an app bar) */
  stickyTop?: number
  /** "/" focuses the search (turn off when several instances share a page) */
  searchShortcut?: boolean
  className?: string
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
  stickyTop,
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
      if (isEditable(document.activeElement)) return
      e.preventDefault()
      searchRef.current?.focus({ preventScroll: true })
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

  // First-load skeletons match the rows that will arrive, so nothing jumps when they do
  const expected = state.tab === 'tokens'
    ? filterTokens(getExploreTokens(state.chain), state.query).length
    : filterPools(getExplorePools(state.chain), state.query).length
  const skeletonRows = Math.min(Math.max(expected, 4), 20)

  const panelId = `${idBase}-panel`
  const shared = {
    status: state.status,
    query: state.query,
    chain: loaded.chain,
    onRetry: retry,
    onClearSearch: () => {
      update({ query: '' })
      searchRef.current?.focus({ preventScroll: true })
    },
    onSearchAllNetworks: () => refetch({ chain: 'all' }),
    skeletonRows,
    stickyTop,
    explode: true,
  }

  const count = state.tab === 'tokens' ? tokenRows.length : poolRows.length
  const noun = state.tab === 'tokens' ? (count === 1 ? 'token' : 'tokens') : count === 1 ? 'pool' : 'pools'
  const announcement =
    state.status === 'loading'
      ? `Loading ${state.tab}`
      : state.status === 'ready' && state.query.trim()
        ? `${count} ${noun} found`
        : ''

  return (
    <div data-slot="explore-tables" className={cn('@container/explore mx-auto flex w-full max-w-[1200px] min-w-0 flex-col', className)}>
      <div
        className={cn(
          'mb-uni-4 flex items-center justify-between gap-uni-16',
          '@max-[768px]/explore:mb-uni-12 @max-[768px]/explore:flex-col @max-[768px]/explore:items-start',
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
            period={state.period}
            onPeriodChange={(period) => period !== state.period && refetch({ period })}
            chain={state.chain}
            onChainChange={(chain) => chain !== state.chain && refetch({ chain })}
            query={state.query}
            onQueryChange={(query) => update({ query })}
            searchRef={searchRef}
            className="@max-[768px]/explore:w-full"
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
            onRowSelect={onRowSelect ? (row) => onRowSelect({ tab: 'tokens', row }) : undefined}
          />
        ) : (
          <ExplorePoolTable
            {...shared}
            rows={poolRows}
            sort={state.poolSort}
            onSortChange={(poolSort) => update({ poolSort })}
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
