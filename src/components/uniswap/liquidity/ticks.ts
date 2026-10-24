import type { FeeTier, PairPricePoint, Pool, PriceRange, PriceStrategyId, TickRange } from './types'

/*
 * Tick math for the range selector, after Uniswap's v3-sdk and
 * features/Liquidity/.../D3LiquidityRangeChart/utils.
 *
 * Canonical vs visual ticks: the pool prices token1 per token0
 * (price = 1.0001^tick). When the token toggle inverts the price, Uniswap's
 * chart works in VISUAL ticks, visual = -tick, so that "up" always means a
 * higher displayed price and every visual tick displays as 1.0001^visual.
 * The UI parts (chart, inputs, strategies) work in visual ticks; state keeps
 * canonical ticks; toVisualRange / fromVisualRange convert at the boundary.
 */

export const TICK_BASE = 1.0001
const LN_BASE = Math.log(TICK_BASE)

export const MIN_TICK = -887272
export const MAX_TICK = 887272

/** v3-sdk TICK_SPACINGS */
export const TICK_SPACINGS: Record<FeeTier, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 }

export const FEE_TIERS: { fee: FeeTier; label: string; description: string }[] = [
  { fee: 100, label: '0.01%', description: 'Best for very stable pairs.' },
  { fee: 500, label: '0.05%', description: 'Best for stable pairs.' },
  { fee: 3000, label: '0.30%', description: 'Best for most pairs.' },
  { fee: 10000, label: '1.00%', description: 'Best for exotic pairs.' },
]

export const feeLabel = (fee: FeeTier) => FEE_TIERS.find((t) => t.fee === fee)?.label ?? `${fee / 10000}%`

/* Ticks and prices -------------------------------------------------------- */

export const tickToPrice = (tick: number) => Math.pow(TICK_BASE, tick)

/** Floors, like TickMath.getTickAtSqrtRatio */
export const priceToTick = (price: number) => Math.floor(Math.log(price) / LN_BASE)

export function usableTickBounds(tickSpacing: number): TickRange {
  return {
    minTick: Math.ceil(MIN_TICK / tickSpacing) * tickSpacing,
    maxTick: Math.floor(MAX_TICK / tickSpacing) * tickSpacing,
  }
}

/** v3-sdk nearestUsableTick: rounds to the spacing, kept inside the usable bounds */
export function nearestUsableTick(tick: number, tickSpacing: number) {
  const { minTick, maxTick } = usableTickBounds(tickSpacing)
  const rounded = Math.round(tick / tickSpacing) * tickSpacing
  return Math.min(maxTick, Math.max(minTick, rounded))
}

export const toVisualTick = (tick: number, inverted: boolean) => (inverted ? -tick : tick)
export const fromVisualTick = toVisualTick

/** Visual bounds of a range: `lower` is the displayed Min price, `upper` the Max */
export interface VisualRange {
  lower: number
  upper: number
}

export function toVisualRange({ minTick, maxTick }: TickRange, inverted: boolean): VisualRange {
  return inverted ? { lower: -maxTick, upper: -minTick } : { lower: minTick, upper: maxTick }
}

export function fromVisualRange({ lower, upper }: VisualRange, inverted: boolean): TickRange {
  return inverted ? { minTick: -upper, maxTick: -lower } : { minTick: lower, maxTick: upper }
}

export const currentVisualTick = (pool: Pool, inverted: boolean) => toVisualTick(pool.currentTick, inverted)

/** Displayed price of the pool (quote per base) */
export const currentPrice = (pool: Pool, inverted: boolean) => tickToPrice(currentVisualTick(pool, inverted))

/** Base and quote of the displayed price: "<price> quote = 1 base" */
export function pairTokens(pool: Pool, inverted: boolean) {
  return inverted ? { base: pool.token1, quote: pool.token0 } : { base: pool.token0, quote: pool.token1 }
}

/* Ranges ------------------------------------------------------------------ */

export function fullRangeTicks(tickSpacing: number): PriceRange {
  return { ...usableTickBounds(tickSpacing), fullRange: true }
}

/** Both ends at the usable limits: displays as 0 and ∞ */
export function isAtLimits({ minTick, maxTick }: TickRange, tickSpacing: number) {
  const bounds = usableTickBounds(tickSpacing)
  return minTick <= bounds.minTick && maxTick >= bounds.maxTick
}

/** Uniswap's priceRangeInfo.isInvalidRange */
export const isInvalidRange = ({ minTick, maxTick }: TickRange) => minTick >= maxTick

/**
 * Setting one end from a stepper or a typed price (utils/clampTickRange): the
 * new end is snapped, and stops one spacing short of the other end. Visual ticks.
 */
export function withLower(range: VisualRange, lower: number, tickSpacing: number): VisualRange {
  const next = nearestUsableTick(lower, tickSpacing)
  return { lower: next >= range.upper ? range.upper - tickSpacing : next, upper: range.upper }
}

export function withUpper(range: VisualRange, upper: number, tickSpacing: number): VisualRange {
  const next = nearestUsableTick(upper, tickSpacing)
  return { lower: range.lower, upper: next <= range.lower ? range.lower + tickSpacing : next }
}

/* Strategies (utils/priceStrategies.ts) ------------------------------------ */

const WIDE_DOWN = Math.round(Math.log(0.5) / LN_BASE)
const WIDE_UP = Math.round(Math.log(2) / LN_BASE)

/** A strategy's range around the current visual tick, in visual ticks */
export function getStrategyRange(id: PriceStrategyId, currentTick: number, tickSpacing: number): VisualRange {
  const s = tickSpacing
  const snap = (t: number) => nearestUsableTick(t, s)
  const wide = { lower: snap(currentTick + WIDE_DOWN), upper: snap(currentTick + WIDE_UP) }
  switch (id) {
    case 'stable': {
      const base = Math.floor(currentTick / s) * s
      return { lower: snap(base - 3 * s), upper: snap(base + 3 * s) }
    }
    case 'wide':
      return wide
    case 'one-sided-lower':
      return { lower: wide.lower, upper: snap(currentTick - s) }
    case 'one-sided-upper':
      return { lower: snap(currentTick + s), upper: wide.upper }
  }
}

export const PRICE_STRATEGY_IDS: PriceStrategyId[] = ['stable', 'wide', 'one-sided-lower', 'one-sided-upper']

/** Stable's "± X%": (1.0001^(3·spacing) - 1)·100, two decimals, trailing zeros trimmed */
export function stablePercentLabel(tickSpacing: number) {
  const pct = (Math.pow(TICK_BASE, 3 * tickSpacing) - 1) * 100
  return `± ${Number(pct.toFixed(2))}%`
}

/** The strategy a range matches (within one tick), or null */
export function detectStrategy(range: VisualRange, currentTick: number, tickSpacing: number): PriceStrategyId | null {
  for (const id of PRICE_STRATEGY_IDS) {
    const r = getStrategyRange(id, currentTick, tickSpacing)
    if (Math.abs(r.lower - range.lower) <= 1 && Math.abs(r.upper - range.upper) <= 1) return id
  }
  return null
}

/**
 * Default custom range (store/actions/viewActions reset + utils/defaultPriceRange):
 * in log space, a viewport centered on the current price that reaches the
 * further of the history's low and high; the range is its middle 60%. With no
 * usable history it falls back to Stable. `history` holds displayed prices.
 */
export function getDefaultRange(currentTick: number, history: number[], tickSpacing: number): VisualRange {
  if (history.length > 1) {
    const cur = Math.log(tickToPrice(currentTick))
    const lo = Math.log(Math.min(...history))
    const hi = Math.log(Math.max(...history))
    const spread = Math.max(cur - lo, hi - cur)
    const vpMin = cur - spread
    const lower = nearestUsableTick(priceToTick(Math.exp(vpMin + 0.2 * 2 * spread)), tickSpacing)
    const upper = nearestUsableTick(priceToTick(Math.exp(vpMin + 0.8 * 2 * spread)), tickSpacing)
    if (upper > lower) return { lower, upper }
  }
  return getStrategyRange('stable', currentTick, tickSpacing)
}

/** Displayed (visual) prices of a canonical history */
export const visualHistory = (history: PairPricePoint[], inverted: boolean) =>
  history.map((p) => (inverted ? 1 / p.price : p.price))

/* Formatting and parsing --------------------------------------------------- */

/** A % from the current price, as a fraction: (price - current) / current */
export const percentFromCurrent = (tick: number, currentTick: number) => tickToPrice(tick - currentTick) - 1

/** "+12.34%", "-8.00%" */
export function formatSignedPercent(fraction: number) {
  const pct = fraction * 100
  const abs = Math.abs(pct)
  const text = abs >= 1e6 ? '>999,999' : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${pct < 0 && text !== '0.00' ? '-' : '+'}${text}%`
}

function fractionDigits(price: number) {
  const abs = Math.abs(price)
  if (abs >= 10000) return { maximumFractionDigits: 2 }
  if (abs >= 1) return { maximumSignificantDigits: 6 }
  return { maximumSignificantDigits: 5 }
}

/** Display price: "3,412.55", "0.00029303", "∞" */
export function formatRangePrice(price: number) {
  if (price === Infinity) return '∞'
  if (!Number.isFinite(price) || price <= 0) return '0'
  if (price >= 1e15) return price.toExponential(2)
  return price.toLocaleString('en-US', fractionDigits(price))
}

/** An input's committed text: like formatRangePrice, without digit grouping */
export function formatInputPrice(price: number) {
  if (price === Infinity) return '∞'
  if (!Number.isFinite(price) || price <= 0) return '0'
  return price.toLocaleString('en-US', { ...fractionDigits(price), useGrouping: false })
}

/** Displayed price of a visual end; the usable limits read as 0 and ∞ in full range */
export function rangeEndPrice(tick: number, end: 'lower' | 'upper', tickSpacing: number, fullRange: boolean) {
  if (fullRange) {
    const bounds = usableTickBounds(tickSpacing)
    if (end === 'lower' && tick <= bounds.minTick) return 0
    if (end === 'upper' && tick >= bounds.maxTick) return Infinity
  }
  return tickToPrice(tick)
}

/**
 * Typed input -> visual tick (state/mint/v3/utils tryParseTick): price -> tick,
 * snapped to the spacing. "∞" is the usable max; 0, empty or junk is null.
 * Percent mode reads the text as a % from the current price.
 */
export function parseInputTick(
  text: string,
  { tickSpacing, currentTick, mode }: { tickSpacing: number; currentTick: number; mode: 'price' | 'percent' },
): number | null {
  const raw = text.replace(/,/g, '').trim()
  if (raw === '∞') return usableTickBounds(tickSpacing).maxTick
  const value = Number(raw)
  if (raw === '' || !Number.isFinite(value)) return null
  const price = mode === 'percent' ? tickToPrice(currentTick) * (1 + value / 100) : value
  if (price <= 0) return null
  return nearestUsableTick(priceToTick(price), tickSpacing)
}
