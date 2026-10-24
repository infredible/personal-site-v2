import { POOLS, getPairPriceHistory } from './pools'
import {
  TICK_SPACINGS,
  currentVisualTick,
  fromVisualRange,
  fullRangeTicks,
  getDefaultRange,
  getStrategyRange,
  visualHistory,
} from './ticks'
import type { FeeTier, Pool, PriceStrategyId, RangeInputMode, RangePeriod, RangeSelectorState } from './types'

/*
 * Named selector states shared by the showcase's preset menu and canvas.
 * Ranges are computed, not hard-coded: the custom default is what Uniswap's
 * reset gives for the pool's price history, a strategy is its own formula.
 */

interface StateOptions {
  inverted?: boolean
  /** A strategy card's range, or the default custom range when omitted */
  strategy?: PriceStrategyId
  fullRange?: boolean
  inputMode?: RangeInputMode
  period?: RangePeriod
}

/** A pool of the same pair at another fee tier (spacing follows the tier) */
export const poolAtFee = (pool: Pool, fee: FeeTier): Pool => ({
  ...pool,
  id: `${pool.id}-${fee}`,
  fee,
  tickSpacing: TICK_SPACINGS[fee],
})

export function createRangeState(pool: Pool, options: StateOptions = {}): RangeSelectorState {
  const { inverted = false, strategy, fullRange = false, inputMode = 'price', period = '1M' } = options
  const base = { pool, inverted, period, inputMode }
  if (fullRange) return { ...base, range: fullRangeTicks(pool.tickSpacing), strategy: null }
  const tick = currentVisualTick(pool, inverted)
  const visual = strategy
    ? getStrategyRange(strategy, tick, pool.tickSpacing)
    : getDefaultRange(tick, visualHistory(getPairPriceHistory(pool, period), inverted), pool.tickSpacing)
  return { ...base, range: { ...fromVisualRange(visual, inverted), fullRange: false }, strategy: strategy ?? null }
}

export interface LiquidityRangePreset {
  id: string
  label: string
  state: RangeSelectorState
}

export const LIQUIDITY_RANGE_PRESETS: LiquidityRangePreset[] = [
  { id: 'eth-usdc', label: 'ETH/USDC 0.05% · custom', state: createRangeState(POOLS['eth-usdc']) },
  { id: 'full-range', label: 'ETH/USDC · full range', state: createRangeState(POOLS['eth-usdc'], { fullRange: true }) },
  { id: 'inverted', label: 'ETH/USDC · inverted (ETH per USDC)', state: createRangeState(POOLS['eth-usdc'], { inverted: true }) },
  { id: 'wide', label: 'ETH/USDC · Wide strategy', state: createRangeState(POOLS['eth-usdc'], { strategy: 'wide' }) },
  {
    id: 'out-of-range',
    label: 'ETH/USDC · one-sided (out of range)',
    state: createRangeState(POOLS['eth-usdc'], { strategy: 'one-sided-upper' }),
  },
  { id: 'wbtc-eth', label: 'WBTC/ETH 0.3%', state: createRangeState(POOLS['wbtc-eth']) },
  { id: 'stable', label: 'USDC/USDT 0.01% · Stable', state: createRangeState(POOLS['usdc-usdt'], { strategy: 'stable' }) },
  { id: 'pepe-eth', label: 'PEPE/ETH 1% · Wide', state: createRangeState(POOLS['pepe-eth'], { strategy: 'wide' }) },
  { id: 'percent', label: 'ETH/USDC · percent inputs', state: createRangeState(POOLS['eth-usdc'], { inputMode: 'percent' }) },
]

export const getLiquidityRangePreset = (id: string | undefined) =>
  LIQUIDITY_RANGE_PRESETS.find((p) => p.id === id) ?? LIQUIDITY_RANGE_PRESETS[0]
