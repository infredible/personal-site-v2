// Shared contracts for the Explore tables recreation (Uniswap web's /explore
// Tokens and Pools tabs). Display parts render from these shapes; the stateful
// ExploreTables owns the filters and sort.

import type { ChainId, Token } from '../swap/types'

/** Explore tabs we recreate. */
export type ExploreTab = 'tokens' | 'pools'

/** Volume window for the token table (production's time-period filter). */
export type ExploreTimePeriod = '1H' | '1D' | '1W' | '1M' | '1Y'

/** Network filter: one chain, or every chain. */
export type ExploreChain = ChainId | 'all'

export type SortDirection = 'asc' | 'desc'

export type TokenSortField = 'price' | 'change1h' | 'change1d' | 'fdv' | 'volume'
export type PoolSortField = 'tvl' | 'apr' | 'volume1d' | 'volume30d' | 'volumeTvl'

export interface SortState<F extends string> {
  field: F
  direction: SortDirection
}

/** One row of the Tokens table: a token's stats on one chain. */
export interface ExploreTokenStats {
  /** Stable id: `${chain}:${symbol}` */
  id: string
  token: Token
  chain: ChainId
  priceUsd: number
  /** Fractions, 0.0123 = +1.23% */
  change1h: number
  change1d: number
  /** Fully diluted valuation, USD */
  fdvUsd: number
  /** Volume over each window, USD */
  volumeUsd: Record<ExploreTimePeriod, number>
}

export type PoolProtocol = 'v2' | 'v3' | 'v4'

/** One row of the Pools table. */
export interface ExplorePoolStats {
  /** Stable id: `${chain}:${protocol}:${token0}-${token1}:${feeTier}` */
  id: string
  token0: Token
  token1: Token
  chain: ChainId
  protocol: PoolProtocol
  /** Fee tier as a fraction: 0.0005 = 0.05%. v2 pools are always 0.003. */
  feeTier: number
  /** v4 pools with a hook show its name */
  hook?: string
  tvlUsd: number
  volume1dUsd: number
  volume30dUsd: number
  /** Annualized fee APR as a fraction (1D volume × fee × 365 / TVL) */
  apr: number
  /** Extra incentive APR as a fraction, when the pool has rewards */
  rewardApr?: number
}

/** Data status: first load (skeletons), refetch (old values pulse), ready, or failed. */
export type ExploreStatus = 'loading' | 'refetching' | 'ready' | 'error'

/** Everything the stateful ExploreTables owns; presets are snapshots of it. */
export interface ExploreState {
  tab: ExploreTab
  chain: ExploreChain
  /** Volume window (Tokens tab only) */
  period: ExploreTimePeriod
  query: string
  tokenSort: SortState<TokenSortField>
  poolSort: SortState<PoolSortField>
  status: ExploreStatus
}
