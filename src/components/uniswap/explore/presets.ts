import type { ExploreState } from './types'

/*
 * Named Explore states, shared by a showcase's preset menu and its canvas
 * frames. Statuses set here are held (a "Loading" frame stays loading);
 * ExploreTables only simulates latency for changes made in it.
 */

export const DEFAULT_EXPLORE_STATE: ExploreState = {
  tab: 'tokens',
  chain: 'all',
  period: '1D',
  query: '',
  // Production defaults: Volume and 1D vol, descending
  tokenSort: { field: 'volume', direction: 'desc' },
  poolSort: { field: 'volume1d', direction: 'desc' },
  status: 'ready',
}

const preset = (patch: Partial<ExploreState>): ExploreState => ({ ...DEFAULT_EXPLORE_STATE, ...patch })

export const EXPLORE_PRESETS = [
  { id: 'tokens', label: 'Tokens', state: DEFAULT_EXPLORE_STATE },
  { id: 'pools', label: 'Pools', state: preset({ tab: 'pools' }) },
  { id: 'sorted-1h', label: 'Sorted by 1H', state: preset({ tokenSort: { field: 'change1h', direction: 'desc' } }) },
  { id: 'base', label: 'On Base', state: preset({ chain: 'base' }) },
  { id: 'search-eth', label: 'Search "eth"', state: preset({ query: 'eth' }) },
  // PEPE isn't on Base: the empty state offers "Search all networks", which finds it
  { id: 'no-results', label: 'No results', state: preset({ chain: 'base', query: 'pepe' }) },
  { id: 'loading', label: 'Loading', state: preset({ status: 'loading' }) },
  { id: 'refetching', label: 'Refetching', state: preset({ status: 'refetching' }) },
  { id: 'error', label: 'Error', state: preset({ status: 'error' }) },
] as const satisfies readonly { id: string; label: string; state: ExploreState }[]

export type ExplorePresetId = (typeof EXPLORE_PRESETS)[number]['id']
export type ExplorePreset = (typeof EXPLORE_PRESETS)[number]

/** The preset with this id, or the default (Tokens). */
export function getExplorePreset(id: string | null | undefined): ExplorePreset {
  return EXPLORE_PRESETS.find((p) => p.id === id) ?? EXPLORE_PRESETS[0]
}
