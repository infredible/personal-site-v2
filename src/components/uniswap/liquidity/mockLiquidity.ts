import { usableTickBounds } from './ticks'
import type { LiquiditySegment, Pool } from './types'

/*
 * Mock liquidity for the range chart's histogram, standing in for Uniswap's
 * useDensityChartData / useAllPoolTicks. Each pool gets a seeded set of LP
 * positions, summed into liquidityNet at their edges and prefix-summed into
 * segments (buildSegmentsFromRawTicks), so the shape reads like a real pool:
 *
 * - a dense cluster of overlapping positions around the current price, the
 *   narrow ones deeper (the same capital in fewer ticks), each a log-normal
 *   width around a normally scattered centre. Stable pairs sit within a few
 *   spacings of the peg;
 * - a few "ladders" further out: runs of equal adjacent positions, the way
 *   range-order bots and DCA-style LPs place them;
 * - a thin full-range floor, so no visible bucket is ever empty.
 *
 * Same pool, same liquidity, on the server and in every browser.
 */

/** FNV-1a: string -> 32-bit seed */
function hash(input: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 PRNG: uniform [0, 1) */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal (Box-Muller) */
function normal(random: () => number) {
  const u = Math.max(random(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

/**
 * How far LPs spread around the price, in spacings: the cluster's scatter and
 * its positions' median width. Wider tiers carry more volatile pairs, so their
 * LPs bracket larger moves (0.05% ETH/USDC ≈ ±6%, 1% PEPE/ETH ≈ ±50%).
 */
const SPREAD: Record<number, { scatter: number; width: number }> = {
  1: { scatter: 2, width: 3 },
  10: { scatter: 55, width: 45 },
  60: { scatter: 24, width: 20 },
  200: { scatter: 18, width: 14 },
}

interface Position {
  lower: number
  upper: number
  liquidity: number
}

function buildPositions(pool: Pool): Position[] {
  const random = rng(hash(`${pool.id}:liquidity`))
  const s = pool.tickSpacing
  const { minTick, maxTick } = usableTickBounds(s)
  const spread = SPREAD[s] ?? SPREAD[60]
  const c = pool.currentTick
  const positions: Position[] = []

  const add = (lower: number, upper: number, liquidity: number) => {
    let lo = Math.floor(lower / s) * s
    let hi = Math.ceil(upper / s) * s
    if (hi <= lo) hi = lo + s
    lo = Math.max(minTick, lo)
    hi = Math.min(maxTick, hi)
    if (hi > lo && liquidity > 0) positions.push({ lower: lo, upper: hi, liquidity })
  }

  // Cluster around the price: narrow positions hold the same capital in fewer
  // ticks, so they're deeper (L ∝ 1/width, softened)
  const count = 46
  for (let i = 0; i < count; i++) {
    const center = c + normal(random) * spread.scatter * s
    const width = Math.max(s, spread.width * s * Math.exp(normal(random) * 0.7))
    const depth = Math.exp(normal(random) * 0.55) * Math.pow(spread.width * s / width, 0.75)
    add(center - width / 2, center + width / 2, 100 * depth)
  }

  // A few whales right at the price
  for (let i = 0; i < 3; i++) {
    const width = Math.max(s, spread.width * s * (0.25 + random() * 0.35))
    const center = c + (random() - 0.5) * width * 0.6
    add(center - width / 2, center + width / 2, 260 + random() * 140)
  }

  // Ladders further out: runs of equal, adjacent steps on one side of the price
  const ladders = 3
  for (let l = 0; l < ladders; l++) {
    const side = l % 2 === 0 ? 1 : -1
    const start = c + side * spread.scatter * s * (1.6 + random() * 1.6)
    const steps = 3 + Math.floor(random() * 4)
    const step = Math.max(s, Math.round(spread.width * s * (0.4 + random() * 0.4)))
    const depth = 18 + random() * 22
    for (let k = 0; k < steps; k++) {
      const lo = start + side * k * step
      add(Math.min(lo, lo + side * step), Math.max(lo, lo + side * step), depth * (1 - k * 0.08))
    }
  }

  // Scattered wide positions, thinning with distance
  for (let i = 0; i < 10; i++) {
    const center = c + normal(random) * spread.scatter * s * 3.5
    const width = spread.width * s * (3 + random() * 6)
    add(center - width / 2, center + width / 2, 6 + random() * 10)
  }

  // The full-range floor (v2-style LPs)
  add(minTick, maxTick, 3.5)
  return positions
}

const cache = new Map<string, LiquiditySegment[]>()

/** The pool's active liquidity, as segments tiling the usable range (canonical ticks) */
export function getMockLiquidity(pool: Pool): LiquiditySegment[] {
  const cached = cache.get(pool.id)
  if (cached) return cached

  // liquidityNet per initialized tick, then a prefix sum across them
  const net = new Map<number, number>()
  for (const p of buildPositions(pool)) {
    net.set(p.lower, (net.get(p.lower) ?? 0) + p.liquidity)
    net.set(p.upper, (net.get(p.upper) ?? 0) - p.liquidity)
  }
  const ticks = [...net.keys()].sort((a, b) => a - b)
  const segments: LiquiditySegment[] = []
  let active = 0
  for (let i = 0; i < ticks.length - 1; i++) {
    active += net.get(ticks[i])!
    // Float noise where everything but the floor has closed
    const liquidity = active < 1e-9 ? 0 : active
    const last = segments[segments.length - 1]
    if (last && Math.abs(last.liquidity - liquidity) < 1e-9) last.tickUpper = ticks[i + 1]
    else segments.push({ tickLower: ticks[i], tickUpper: ticks[i + 1], liquidity })
  }
  cache.set(pool.id, segments)
  return segments
}

/* Buckets ----------------------------------------------------------------- */

/** One histogram bar, in VISUAL ticks: [lower, upper) */
export interface LiquidityBucket {
  lower: number
  upper: number
  /** Max active liquidity among the segments the bucket overlaps */
  liquidity: number
}

/** Bars per view, whatever the zoom (CHART_BEHAVIOR.DESIRED_BUCKETS) */
export const DESIRED_BUCKETS = 20

/** First segment whose tickUpper is past `tick` (segments are sorted and contiguous) */
function firstSegmentAfter(segments: LiquiditySegment[], tick: number) {
  let lo = 0
  let hi = segments.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (segments[mid].tickUpper <= tick) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Max liquidity over the canonical interval [lo, hi) */
function maxLiquidity(segments: LiquiditySegment[], lo: number, hi: number) {
  let max = 0
  for (let i = firstSegmentAfter(segments, lo); i < segments.length && segments[i].tickLower < hi; i++) {
    if (segments[i].liquidity > max) max = segments[i].liquidity
  }
  return max
}

/**
 * Buckets for the visible window (liquidityBucketing buildBuckets with
 * fixedGrid): a step of about a twentieth of the span, in whole spacings, on a
 * global grid (multiples of the step from tick 0) so bars keep their ticks
 * while panning, plus one bucket of margin past each edge so bars scroll in
 * whole. A bucket's liquidity is the MAX of the segments it overlaps, not the
 * sum. Visible bounds and returned buckets are VISUAL ticks; segments are
 * canonical (inverted: visual [a, b) is canonical (-b, -a]).
 */
export function buildLiquidityBuckets(
  segments: LiquiditySegment[],
  visibleLower: number,
  visibleUpper: number,
  tickSpacing: number,
  inverted: boolean,
  desired = DESIRED_BUCKETS,
): LiquidityBucket[] {
  if (segments.length === 0) return []
  const span = Math.max(tickSpacing, visibleUpper - visibleLower)
  // The epsilon keeps an exact N.5 from flipping between frames on float noise
  const step = Math.max(tickSpacing, Math.round(span / desired / tickSpacing + 1e-9) * tickSpacing)
  // Usable bounds are symmetric, so the same in visual ticks
  const { minTick, maxTick } = usableTickBounds(tickSpacing)
  const start = Math.max(minTick, Math.floor(visibleLower / step) * step - step)
  const end = Math.min(maxTick, Math.ceil(visibleUpper / step) * step + step)

  const buckets: LiquidityBucket[] = []
  for (let lower = start; lower < end; lower += step) {
    const upper = Math.min(end, lower + step)
    // Canonical (-upper, -lower] reads the same as [-upper, -lower) here: edges sit on spacings
    const liquidity = inverted ? maxLiquidity(segments, -upper, -lower) : maxLiquidity(segments, lower, upper)
    buckets.push({ lower, upper, liquidity })
  }
  return buckets
}
