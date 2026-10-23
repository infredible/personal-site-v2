import type { ChartPeriod, PricePoint } from './mockPriceHistory'

/*
 * Geometry and formatting for the sparkline, ported from Uniswap's
 * SparklineChart / PriceChart (apps/web/src/components/Charts) without d3 or
 * lightweight-charts: points are mapped into a fixed viewBox and drawn as a
 * cardinal spline. The SVG stretches to its box (preserveAspectRatio="none")
 * with non-scaling strokes, so no measuring is needed.
 */

export const VIEW_W = 1000
export const VIEW_H = 100
/** Vertical inset (viewBox units) so the line and hover dot don't touch the edges */
const PAD_Y = 8

/**
 * Stablecoins keep a minimum visible range (as a fraction of price), like
 * Uniswap's isStablecoin chart option: a peg wobbling by 0.01% should read as
 * flat, not as a mountain range.
 */
const STABLECOIN_MIN_RANGE = 0.004

export function xAt(index: number, count: number) {
  return count <= 1 ? VIEW_W / 2 : (index / (count - 1)) * VIEW_W
}

/** viewBox y for each point */
export function toViewY(points: PricePoint[], { stablecoin = false } = {}): number[] {
  if (points.length === 0) return []
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    if (p.value < min) min = p.value
    if (p.value > max) max = p.value
  }
  const mid = (min + max) / 2
  const range = Math.max(max - min, stablecoin ? mid * STABLECOIN_MIN_RANGE : 0, mid * 1e-9)
  const lo = mid - range / 2
  return points.map((p) => PAD_Y + (1 - (p.value - lo) / range) * (VIEW_H - PAD_Y * 2))
}

/** A gentle wave for the loading state and the first frame of the reveal (Uniswap's WaveLoader) */
export function waveY(count: number): number[] {
  return Array.from({ length: count }, (_, i) => VIEW_H * 0.55 + Math.sin((i / (count - 1)) * Math.PI * 3) * VIEW_H * 0.08)
}

// Cardinal spline control-point factor: (1 - tension) / 6. Uniswap's sparkline
// uses a tight cardinal; a little looser reads smoother at card size.
const K = 0.75 / 6

const r = (n: number) => Math.round(n * 10) / 10

/** Smooth path through evenly spaced points */
export function linePath(ys: number[]): string {
  const n = ys.length
  if (n === 0) return ''
  const pt = (i: number) => [xAt(Math.min(Math.max(i, 0), n - 1), n), ys[Math.min(Math.max(i, 0), n - 1)]] as const
  let d = `M${r(pt(0)[0])},${r(pt(0)[1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pt(i - 1)
    const [x1, y1] = pt(i)
    const [x2, y2] = pt(i + 1)
    const [x3, y3] = pt(i + 2)
    d += `C${r(x1 + (x2 - x0) * K)},${r(y1 + (y2 - y0) * K)},${r(x2 - (x3 - x1) * K)},${r(y2 - (y3 - y1) * K)},${r(x2)},${r(y2)}`
  }
  return d
}

/** The line closed down to the bottom edge, for the gradient fill */
export function areaPath(ys: number[]): string {
  if (ys.length === 0) return ''
  return `${linePath(ys)}L${VIEW_W},${VIEW_H}L0,${VIEW_H}Z`
}

/* Values ------------------------------------------------------------------ */

export type PriceDirection = 'up' | 'down' | 'flat'

export function percentChange(start: number, end: number) {
  return start === 0 ? 0 : (end - start) / start
}

/** Flat when the change rounds to 0.00%, like Uniswap's DeltaArrow isDeltaZero */
export function directionOf(change: number): PriceDirection {
  if (Math.abs(change) < 0.00005) return 'flat'
  return change > 0 ? 'up' : 'down'
}

/** Token prices: $3,412.58; under $1, four significant digits ($0.7800, $0.00001842) */
export function formatTokenPrice(value: number): string {
  if (!Number.isFinite(value)) return '-'
  const abs = Math.abs(value)
  if (abs >= 1) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return `$${value.toLocaleString('en-US', { minimumSignificantDigits: 2, maximumSignificantDigits: 4 })}`
}

/** Absolute fiat delta: $62.07; small deltas keep two significant digits ($0.0002) */
export function formatFiatDelta(abs: number): string {
  if (abs >= 0.01 || abs === 0) {
    return abs.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return `$${abs.toLocaleString('en-US', { maximumSignificantDigits: 2 })}`
}

export function formatPercentAbs(change: number): string {
  return `${(Math.abs(change) * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

/** Hover timestamp, Uniswap's FORMAT_DATE_MONTH_DAY_TIME ("Oct 23, 2:15 PM"); the year view adds the year */
export function formatChartTime(timestamp: number, period: ChartPeriod): string {
  const date = new Date(timestamp)
  if (period === '1Y') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
