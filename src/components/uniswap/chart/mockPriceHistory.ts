import type { Token, TokenCategory } from '../swap/types'

/*
 * Deterministic mock price history for the sparkline. Each token + period gets
 * its own seeded random walk, pinned at both ends (a Brownian bridge in log
 * space): it always ends at `token.priceUsd`, and the 1D series starts where
 * `token.change24h` says it did 24h ago, so the header's 1D change matches the
 * token list. Same inputs, same series, on the server and in every browser.
 */

export type ChartPeriod = '1H' | '1D' | '1W' | '1M' | '1Y'

export interface PricePoint {
  /** Unix ms */
  timestamp: number
  /** USD */
  value: number
}

export const CHART_PERIODS: { value: ChartPeriod; label: string; description: string }[] = [
  { value: '1H', label: '1H', description: 'Past hour' },
  { value: '1D', label: '1D', description: 'Past day' },
  { value: '1W', label: '1W', description: 'Past week' },
  { value: '1M', label: '1M', description: 'Past month' },
  { value: '1Y', label: '1Y', description: 'Past year' },
]

/** Every period has the same number of points, so a period change can morph point to point. */
export const POINTS_PER_SERIES = 97

const DAY = 24 * 60 * 60 * 1000
const PERIOD_DAYS: Record<ChartPeriod, number> = { '1H': 1 / 24, '1D': 1, '1W': 7, '1M': 30, '1Y': 365 }

/** "Now" for the mock: fixed, so timestamps are deterministic too. */
export const MOCK_NOW = Date.UTC(2026, 9, 23, 18, 30)

// Rough daily volatility by category
const DAILY_VOL: Record<TokenCategory, number> = {
  native: 0.03,
  wrapped: 0.028,
  defi: 0.05,
  layer2: 0.055,
  meme: 0.09,
  stablecoin: 0.0004,
}

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

export function isStablecoin(token: Pick<Token, 'category'>) {
  return token.category === 'stablecoin'
}

/** Change over the period, as a fraction. 1D is the token's own 24h change. */
function periodChange(token: Token, period: ChartPeriod, random: () => number, totalVol: number) {
  const day = token.change24h ?? 0
  if (period === '1D') return day
  if (isStablecoin(token)) return (random() - 0.5) * 0.0006
  // Loosely correlated with the day's direction, so 1H and 1W tend to agree with 1D
  const lean = period === '1H' ? day * 0.15 : day * 0.6
  return Math.max(-0.85, lean + normal(random) * totalVol * 0.5)
}

const cache = new Map<string, PricePoint[]>()

export function getMockPriceHistory(token: Token, period: ChartPeriod): PricePoint[] {
  const key = `${token.symbol}:${period}`
  const cached = cache.get(key)
  if (cached) return cached

  const random = rng(hash(key))
  const n = POINTS_PER_SERIES
  const days = PERIOD_DAYS[period]
  const dailyVol = DAILY_VOL[token.category ?? 'defi']
  // Stablecoins stay pegged however long the window
  const totalVol = isStablecoin(token) ? Math.min(dailyVol * Math.sqrt(days), 0.0012) : dailyVol * Math.sqrt(days)
  const stepVol = totalVol / Math.sqrt(n - 1)

  // Random walk with a little momentum, so moves come in runs like real charts
  const walk = [0]
  let step = 0
  for (let i = 1; i < n; i++) {
    step = 0.35 * step + normal(random) * stepVol
    walk.push(walk[i - 1] + step)
  }

  // Bridge: pin the walk to log(start) and log(end)
  const end = token.priceUsd
  const start = end / (1 + periodChange(token, period, random, totalVol))
  const logStart = Math.log(start)
  const logEnd = Math.log(end)
  const last = walk[n - 1]
  const stepMs = (days * DAY) / (n - 1)

  const points = walk.map((w, i) => {
    const f = i / (n - 1)
    const value = i === n - 1 ? end : Math.exp(logStart + f * (logEnd - logStart) + (w - f * last))
    return { timestamp: MOCK_NOW - (n - 1 - i) * stepMs, value }
  })
  cache.set(key, points)
  return points
}
