import { CHAINS } from '../swap/tokens'
import type { Chain, ChainId } from '../swap/types'
import { EXPLORE_POOL_STATS, EXPLORE_TOKEN_STATS, getExplorePools, getExploreTokens } from './data'
import type {
  ExploreChain,
  ExplorePoolStats,
  ExploreTab,
  ExploreTimePeriod,
  ExploreTokenStats,
  PoolSortField,
  SortState,
  TokenSortField,
} from './types'

/*
 * Client-side sort, search and network helpers for the Explore tables.
 * Production sorts and filters on the server (useListTokens / useListPools
 * with sortMethod, filterString); here the data is local, so the stateful
 * ExploreTables runs these and hands the display tables finished rows.
 */

/** Networks that have Explore data, in CHAINS order. */
export const EXPLORE_NETWORKS: Chain[] = CHAINS.filter((chain) =>
  EXPLORE_TOKEN_STATS.some((row) => row.chain === chain.id) || EXPLORE_POOL_STATS.some((row) => row.chain === chain.id),
)

export function getChain(id: ChainId): Chain | undefined {
  return CHAINS.find((chain) => chain.id === id)
}

/** Row counts per network for the network menu (and 'all'). */
export function exploreNetworkCounts(tab: ExploreTab): Record<ExploreChain, number> {
  const count = (chain: ExploreChain) => (tab === 'tokens' ? getExploreTokens(chain) : getExplorePools(chain)).length
  return Object.fromEntries([
    ['all', count('all')],
    ...EXPLORE_NETWORKS.map((chain) => [chain.id, count(chain.id)]),
  ]) as Record<ExploreChain, number>
}

/** The networks a token trades on, highest 1D volume first (production's NetworkIconList order). */
const networksBySymbol = new Map<string, Chain[]>()

export function tokenNetworks(symbol: string): Chain[] {
  let networks = networksBySymbol.get(symbol)
  if (!networks) {
    networks = EXPLORE_TOKEN_STATS.filter((row) => row.token.symbol === symbol)
      .sort((a, b) => b.volumeUsd['1D'] - a.volumeUsd['1D'])
      .map((row) => getChain(row.chain))
      .filter((chain): chain is Chain => !!chain)
    networksBySymbol.set(symbol, networks)
  }
  return networks
}

/* Sorting ----------------------------------------------------------------- */

/**
 * Production's sort cycle (tokenTableSortStore.setSort): a new column starts
 * descending, the same column toggles. No unsorted state.
 */
export function nextSort<F extends string>(current: SortState<F>, field: F): SortState<F> {
  if (current.field !== field) return { field, direction: 'desc' }
  return { field, direction: current.direction === 'desc' ? 'asc' : 'desc' }
}

function tokenValue(row: ExploreTokenStats, field: TokenSortField, period: ExploreTimePeriod): number {
  switch (field) {
    case 'price':
      return row.priceUsd
    case 'change1h':
      return row.change1h
    case 'change1d':
      return row.change1d
    case 'fdv':
      return row.fdvUsd
    case 'volume':
      return row.volumeUsd[period]
  }
}

function poolValue(row: ExplorePoolStats, field: PoolSortField): number {
  switch (field) {
    case 'tvl':
      return row.tvlUsd
    case 'apr':
      return row.apr
    case 'volume1d':
      return row.volume1dUsd
    case 'volume30d':
      return row.volume30dUsd
    case 'volumeTvl':
      return poolVolumeOverTvl(row)
  }
}

export function poolVolumeOverTvl(row: ExplorePoolStats): number {
  return row.tvlUsd === 0 ? 0 : row.volume1dUsd / row.tvlUsd
}

/** Stable: ties keep their id order, so equal values never shuffle between sorts. */
function sortBy<T extends { id: string }>(rows: T[], value: (row: T) => number, direction: 'asc' | 'desc'): T[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => sign * (value(a) - value(b)) || a.id.localeCompare(b.id))
}

export function sortTokens(
  rows: ExploreTokenStats[],
  sort: SortState<TokenSortField>,
  period: ExploreTimePeriod,
): ExploreTokenStats[] {
  return sortBy(rows, (row) => tokenValue(row, sort.field, period), sort.direction)
}

export function sortPools(rows: ExplorePoolStats[], sort: SortState<PoolSortField>): ExplorePoolStats[] {
  return sortBy(rows, (row) => poolValue(row, sort.field), sort.direction)
}

/* Rank ------------------------------------------------------------------- */

/*
 * # is the row's volume rank among everything on the network, computed
 * before search and independent of the sort: ETH stays #1 when you sort by
 * price or search "eth". Tokens rank by the selected period's volume, pools
 * by 1D volume.
 */

export type ExploreRanks = ReadonlyMap<string, number>

function ranksBy<T extends { id: string }>(rows: T[], value: (row: T) => number): ExploreRanks {
  return new Map(sortBy(rows, value, 'desc').map((row, i) => [row.id, i + 1]))
}

export function tokenVolumeRanks(rows: ExploreTokenStats[], period: ExploreTimePeriod): ExploreRanks {
  return ranksBy(rows, (row) => row.volumeUsd[period])
}

export function poolVolumeRanks(rows: ExplorePoolStats[]): ExploreRanks {
  return ranksBy(rows, (row) => row.volume1dUsd)
}

/* Search ------------------------------------------------------------------ */

const normalize = (query: string) => query.trim().toLowerCase()

/** Name or symbol contains the query. */
export function filterTokens(rows: ExploreTokenStats[], query: string): ExploreTokenStats[] {
  const q = normalize(query)
  if (!q) return rows
  return rows.filter((row) => row.token.symbol.toLowerCase().includes(q) || row.token.name.toLowerCase().includes(q))
}

/** Either token's name or symbol contains the query, or the pair label does ("eth/usdc"). */
export function filterPools(rows: ExplorePoolStats[], query: string): ExplorePoolStats[] {
  const q = normalize(query)
  if (!q) return rows
  return rows.filter((row) => {
    const pair = `${row.token0.symbol}/${row.token1.symbol}`.toLowerCase()
    return (
      pair.includes(q) ||
      [row.token0, row.token1].some((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    )
  })
}

/** Splits text around the first case-insensitive match, for highlighting. */
export function splitMatch(text: string, query: string): { before: string; match: string; after: string } | null {
  const q = normalize(query)
  if (!q) return null
  // Offsets come from the original text: toLowerCase() can change length (e.g. 'İ')
  const found = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').exec(text)
  if (!found) return null
  const end = found.index + found[0].length
  return { before: text.slice(0, found.index), match: found[0], after: text.slice(end) }
}
