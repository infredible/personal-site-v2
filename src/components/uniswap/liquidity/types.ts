// Shared contracts for the LP range selection recreation (Uniswap's Create
// Position "Set price range" step). Display parts render from these shapes;
// LiquidityRangeSelector owns and updates them.

import type { Token } from '../swap/types'

/** Fee tiers, in hundredths of a bip (Uniswap's FeeAmount): 100 = 0.01% */
export type FeeTier = 100 | 500 | 3000 | 10000

export interface Pool {
  id: string
  /**
   * Canonical price is token1 per token0, in whole-token units:
   * price = 1.0001^tick. (The real SDK works in raw units and adjusts for
   * decimals; the mock skips that, so a tick reads directly as a price.)
   */
  token0: Token
  token1: Token
  fee: FeeTier
  tickSpacing: number
  /** Canonical tick of the pool's current price */
  currentTick: number
}

/** Price history periods of the range chart (Uniswap's 1D | 1W | 1M | 1Y | All time) */
export type RangePeriod = '1D' | '1W' | '1M' | '1Y' | 'ALL'

/** Canonical ticks (token1 per token0). In full range they're the usable limits. */
export interface TickRange {
  minTick: number
  maxTick: number
}

export interface PriceRange extends TickRange {
  fullRange: boolean
}

/**
 * The chart's visible window, in VISUAL ticks (see toVisualTick): `top` is the
 * tick drawn at the top edge, `bottom` the one at the bottom edge; top > bottom.
 */
export interface RangeView {
  bottom: number
  top: number
}

export type PriceStrategyId = 'stable' | 'wide' | 'one-sided-lower' | 'one-sided-upper'

/** What the min/max inputs edit: a price, or a % from the current price */
export type RangeInputMode = 'price' | 'percent'

export interface PairPricePoint {
  /** Unix ms */
  timestamp: number
  /** Canonical price: token1 per token0 */
  price: number
}

/**
 * Active liquidity over a tick interval. Segments tile the usable tick range
 * with no gaps; `liquidity` is the pool's active liquidity anywhere in
 * [tickLower, tickUpper) (prefix sum of liquidityNet in a real pool).
 */
export interface LiquiditySegment {
  tickLower: number
  tickUpper: number
  liquidity: number
}

/** The selector's whole state, as presets and the canvas describe it */
export interface RangeSelectorState {
  pool: Pool
  /** Price shown as token0 per token1 (the token toggle's second option) */
  inverted: boolean
  range: PriceRange
  period: RangePeriod
  inputMode: RangeInputMode
  /** The strategy card the range came from; null once edited by hand */
  strategy: PriceStrategyId | null
}
