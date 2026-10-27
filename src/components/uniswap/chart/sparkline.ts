import type { ChartPeriod, PricePoint } from './mockPriceHistory'

/*
 * Geometry and formatting for the sparkline, ported from Uniswap's
 * SparklineChart / PriceChart (apps/web/src/components/Charts) without d3 or
 * lightweight-charts: points are mapped into a fixed viewBox and drawn as a
 * monotone cubic spline. The SVG stretches to its box (preserveAspectRatio="none")
 * with non-scaling strokes, so no measuring is needed.
 */

export const VIEW_W = 1000
export const VIEW_H = 100
/** Vertical inset (viewBox units) so the line and hover dot don't touch the edges */
const PAD_Y = 8

/**
 * Stablecoins keep a minimum visible range (as a fraction of price), like
 * Uniswap's isStablecoin chart option: a peg wobbling by a few hundredths of a
 * percent should read as flat, not as a mountain range. 2% of the price
 * (±1%), so the usual drift moves the line a few pixels.
 */
const STABLECOIN_MIN_RANGE = 0.02

export function xAt(index: number, count: number) {
  return count <= 1 ? VIEW_W / 2 : (index / (count - 1)) * VIEW_W
}

/**
 * The value range the chart spans, centered on the data and anything in
 * `include` (the live tip's eased value, a limit price line)
 */
export function valueRange(
  points: PricePoint[],
  { stablecoin = false, include }: { stablecoin?: boolean; include?: number | (number | undefined)[] } = {},
): { lo: number; range: number } {
  let min = Infinity
  let max = -Infinity
  for (const v of Array.isArray(include) ? include : [include]) {
    if (v === undefined || !Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  for (const p of points) {
    if (p.value < min) min = p.value
    if (p.value > max) max = p.value
  }
  const mid = (min + max) / 2
  const range = Math.max(max - min, stablecoin ? mid * STABLECOIN_MIN_RANGE : 0, mid * 1e-9)
  return { lo: mid - range / 2, range }
}

/** viewBox y for a value within a range */
export function valueToViewY(value: number, { lo, range }: { lo: number; range: number }) {
  return PAD_Y + (1 - (value - lo) / range) * (VIEW_H - PAD_Y * 2)
}

/** The value at a viewBox y: valueToViewY's inverse (dragging a price line) */
export function viewYToValue(y: number, { lo, range }: { lo: number; range: number }) {
  return lo + (1 - (y - PAD_Y) / (VIEW_H - PAD_Y * 2)) * range
}

/** viewBox y for each point */
export function toViewY(points: PricePoint[], { stablecoin = false } = {}): number[] {
  if (points.length === 0) return []
  const scale = valueRange(points, { stablecoin })
  return points.map((p) => valueToViewY(p.value, scale))
}

/** A gentle wave for the loading state and the first frame of the reveal (Uniswap's WaveLoader) */
export function waveY(count: number): number[] {
  return Array.from({ length: count }, (_, i) => VIEW_H * 0.55 + Math.sin((i / (count - 1)) * Math.PI * 3) * VIEW_H * 0.08)
}

const r = (n: number) => Math.round(n * 10) / 10

/**
 * Smooth path through the points; evenly spaced unless `xs` places them (the
 * live chart). Monotone cubic (Fritsch-Carlson), as in Liveline: the curve
 * never overshoots a point, so peaks and troughs are the real highs and lows.
 */
export function linePath(ys: number[], xs?: number[]): string {
  const n = ys.length
  if (n === 0) return ''
  const x = (i: number) => (xs ? xs[i] : xAt(i, n))
  let d = `M${r(x(0))},${r(ys[0])}`
  if (n === 1) return d
  if (n === 2) return `${d}L${r(x(1))},${r(ys[1])}`

  const h: number[] = []
  const delta: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(x(i + 1) - x(i))
    delta.push(h[i] === 0 ? 0 : (ys[i + 1] - ys[i]) / h[i])
  }
  // Tangents: zero at turning points, else the mean of the neighboring slopes
  const m = new Array<number>(n)
  m[0] = delta[0]
  m[n - 1] = delta[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2
  // Limit them so each segment stays monotone
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / delta[i]
    const b = m[i + 1] / delta[i]
    const s2 = a * a + b * b
    if (s2 > 9) {
      const k = 3 / Math.sqrt(s2)
      m[i] = k * a * delta[i]
      m[i + 1] = k * b * delta[i]
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const third = h[i] / 3
    d += `C${r(x(i) + third)},${r(ys[i] + m[i] * third)},${r(x(i + 1) - third)},${r(ys[i + 1] - m[i + 1] * third)},${r(x(i + 1))},${r(ys[i + 1])}`
  }
  return d
}

/** y of a drawn line at `x`, linearly between its points (for morphing between series of different lengths) */
export function sampleY(xs: number[], ys: number[], x: number): number {
  const n = xs.length
  if (x <= xs[0]) return ys[0]
  if (x >= xs[n - 1]) return ys[n - 1]
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid
  }
  const span = xs[hi] - xs[lo]
  return span === 0 ? ys[lo] : ys[lo] + ((ys[hi] - ys[lo]) * (x - xs[lo])) / span
}

/** The line closed down to the bottom edge, for the gradient fill */
export function areaPath(ys: number[], xs?: number[]): string {
  if (ys.length === 0) return ''
  const first = xs ? xs[0] : 0
  const last = xs ? xs[xs.length - 1] : VIEW_W
  return `${linePath(ys, xs)}L${r(last)},${VIEW_H}L${r(first)},${VIEW_H}Z`
}

/* Candles ----------------------------------------------------------------- */

export type ChartType = 'line' | 'candles'

/** OHLC over a run of points; `first` / `last` are the point indices of its open and close */
export interface Candle {
  first: number
  last: number
  /** Unix ms span the candle covers */
  start: number
  end: number
  open: number
  high: number
  low: number
  close: number
}

/** Fixed periods: each candle spans this many point intervals (97 points: 24 candles, hourly on 1D) */
export const CANDLE_SPAN = 4
/** Live: a candle per 5 seconds (10 ticks), 24 across the window */
export const LIVE_CANDLE_MS = 5_000
/** Body width as a share of the candle's slot */
export const CANDLE_BODY = 0.6
/** Minimum body height (viewBox units), so a doji still shows a tick */
const MIN_BODY = 0.8

/** Deterministic noise in [0, 1) from a number (a fixed candle's extra wick) */
const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function candleOver(points: PricePoint[], first: number, last: number, start: number, end: number): Candle {
  let high = -Infinity
  let low = Infinity
  for (let i = first; i <= last; i++) {
    if (points[i].value > high) high = points[i].value
    if (points[i].value < low) low = points[i].value
  }
  return { first, last, start, end, open: points[first].value, high, low, close: points[last].value }
}

/**
 * Candles from a price series. Fixed periods group every CANDLE_SPAN
 * intervals, sharing boundary points so each opens at the last one's close;
 * with only five points a candle would rarely show a wick, so each gets a
 * seeded one, kept inside the series' range so the y scale still fits. Live
 * groups ticks into LIVE_CANDLE_MS buckets of feed time (the newest is still
 * forming), each opening at the previous close.
 */
export function toCandles(points: PricePoint[], { live = false }: { live?: boolean } = {}): Candle[] {
  const n = points.length
  const candles: Candle[] = []
  if (n < 2) return n ? [candleOver(points, 0, 0, points[0].timestamp, points[0].timestamp)] : []
  if (live) {
    const bucket = (i: number) => Math.floor(points[i].timestamp / LIVE_CANDLE_MS)
    let from = 0
    for (let i = 1; i <= n; i++) {
      if (i < n && bucket(i) === bucket(from)) continue
      const start = bucket(from) * LIVE_CANDLE_MS
      candles.push(candleOver(points, Math.max(from - 1, 0), i - 1, start, start + LIVE_CANDLE_MS))
      from = i
    }
    return candles
  }
  let seriesHigh = -Infinity
  let seriesLow = Infinity
  for (const p of points) {
    if (p.value > seriesHigh) seriesHigh = p.value
    if (p.value < seriesLow) seriesLow = p.value
  }
  for (let first = 0; first < n - 1; first += CANDLE_SPAN) {
    const last = Math.min(first + CANDLE_SPAN, n - 1)
    const c = candleOver(points, first, last, points[first].timestamp, points[last].timestamp)
    let step = 0
    for (let i = first + 1; i <= last; i++) step += Math.abs(points[i].value - points[i - 1].value)
    step /= last - first
    const seed = points[last].timestamp / 3_600_000 + points[last].value
    c.high = Math.min(c.high + step * noise(seed) * 0.8, seriesHigh)
    c.low = Math.max(c.low - step * noise(seed + 1) * 0.8, seriesLow)
    candles.push(c)
  }
  return candles
}

/** The candle holding point `index` (its open is the previous candle's close) */
export function candleIndexAt(candles: Candle[], index: number): number {
  let lo = 0
  let hi = candles.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (candles[mid].last < index) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** A candle in viewBox units: center x, body width, and the y of each value */
export interface CandleGlyph {
  x: number
  w: number
  open: number
  high: number
  low: number
  close: number
}

/** Fixed periods: candles spaced like the line's points */
export function candleGlyphs(candles: Candle[], count: number, scale: { lo: number; range: number }): CandleGlyph[] {
  return candles.map((c) => {
    const x0 = xAt(c.first, count)
    const x1 = xAt(c.last, count)
    return glyph(c, (x0 + x1) / 2, (x1 - x0) * CANDLE_BODY, scale)
  })
}

export function glyph(c: Pick<Candle, 'open' | 'high' | 'low' | 'close'>, x: number, w: number, scale: { lo: number; range: number }): CandleGlyph {
  return {
    x,
    w,
    open: valueToViewY(c.open, scale),
    high: valueToViewY(c.high, scale),
    low: valueToViewY(c.low, scale),
    close: valueToViewY(c.close, scale),
  }
}

/** Bodies (filled) and wicks (stroked), split by direction so each takes its color */
export function candlePaths(glyphs: CandleGlyph[]) {
  const out = { upBody: '', upWick: '', downBody: '', downWick: '' }
  for (const g of glyphs) {
    // Up when it closes at or above its open (y grows downward)
    const up = g.close <= g.open
    let top = Math.min(g.open, g.close)
    let bottom = Math.max(g.open, g.close)
    if (bottom - top < MIN_BODY) {
      const mid = (top + bottom) / 2
      top = mid - MIN_BODY / 2
      bottom = mid + MIN_BODY / 2
    }
    const left = r(g.x - g.w / 2)
    const right = r(g.x + g.w / 2)
    const body = `M${left},${r(top)}H${right}V${r(bottom)}H${left}Z`
    const wick = `M${r(g.x)},${r(g.high)}V${r(g.low)}`
    if (up) {
      out.upBody += body
      out.upWick += wick
    } else {
      out.downBody += body
      out.downWick += wick
    }
  }
  return out
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

/** Hover timestamp, Uniswap's FORMAT_DATE_MONTH_DAY_TIME ("Oct 23, 2:15 PM"); the year view adds the year, live is the time to the second */
export function formatChartTime(timestamp: number, period: ChartPeriod): string {
  const date = new Date(timestamp)
  if (period === '1Y') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (period === 'LIVE') return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/* X axis ------------------------------------------------------------------ */

/**
 * Axis ticks between two timestamps, on round local times: every 30 seconds
 * (live), 6 hours (1D), day (1W), Monday (1M), quarter (1Y).
 */
export function axisTicks(start: number, end: number, period: ChartPeriod): number[] {
  const ticks: number[] = []
  if (period === 'LIVE') {
    const step = 30_000
    for (let t = Math.ceil(start / step) * step; t <= end; t += step) ticks.push(t)
    return ticks
  }
  const d = new Date(start)
  let onTick: () => boolean
  let advance: () => void
  if (period === '1D') {
    d.setMinutes(0, 0, 0)
    onTick = () => d.getHours() % 6 === 0
    advance = () => d.setHours(d.getHours() + 1)
  } else if (period === '1Y') {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    onTick = () => d.getMonth() % 3 === 0
    advance = () => d.setMonth(d.getMonth() + 1)
  } else {
    d.setHours(0, 0, 0, 0)
    onTick = () => period === '1W' || d.getDay() === 1
    advance = () => d.setDate(d.getDate() + 1)
  }
  for (; d.getTime() <= end; advance()) {
    if (d.getTime() >= start && onTick()) ticks.push(d.getTime())
  }
  return ticks
}

/** Axis label: "2:15:30" (live), "6 PM", "Sat", "Oct 20", "Apr" (January shows the year) */
export function formatAxisTime(timestamp: number, period: ChartPeriod): string {
  const date = new Date(timestamp)
  switch (period) {
    case 'LIVE': {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${date.getHours() % 12 || 12}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }
    case '1D':
      return date.toLocaleTimeString('en-US', { hour: 'numeric' })
    case '1W':
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    case '1M':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case '1Y':
      return date.getMonth() === 0 ? String(date.getFullYear()) : date.toLocaleDateString('en-US', { month: 'short' })
  }
}
