import { getMockPriceHistory, type ChartPeriod } from '../chart/mockPriceHistory'
import { TOKENS } from '../swap/tokens'
import type { Token } from '../swap/types'
import { TICK_SPACINGS, priceToTick } from './ticks'
import type { FeeTier, PairPricePoint, Pool, RangePeriod } from './types'

/*
 * Mock pools for the range selector. The current price comes from the token
 * list's fixed USD prices, so it agrees with the swap recreation.
 */

function pool(id: string, token0: Token, token1: Token, fee: FeeTier): Pool {
  return {
    id,
    token0,
    token1,
    fee,
    tickSpacing: TICK_SPACINGS[fee],
    currentTick: priceToTick(token0.priceUsd / token1.priceUsd),
  }
}

export const POOLS = {
  'eth-usdc': pool('eth-usdc', TOKENS.ETH, TOKENS.USDC, 500),
  'wbtc-eth': pool('wbtc-eth', TOKENS.WBTC, TOKENS.ETH, 3000),
  'usdc-usdt': pool('usdc-usdt', TOKENS.USDC, TOKENS.USDT, 100),
  'uni-eth': pool('uni-eth', TOKENS.UNI, TOKENS.ETH, 3000),
  'pepe-eth': pool('pepe-eth', TOKENS.PEPE, TOKENS.ETH, 10000),
} satisfies Record<string, Pool>

export type PoolId = keyof typeof POOLS

/**
 * Token colors for the chart. Uniswap extracts them from each logo
 * (useColor); these are the brand colors those logos give.
 */
const TOKEN_COLORS: Record<string, string> = {
  ETH: '#627EEA',
  WETH: '#627EEA',
  USDC: '#2775CA',
  USDT: '#26A17B',
  DAI: '#F5AC37',
  WBTC: '#F09242',
  UNI: '#FF007A',
  PEPE: '#4C9540',
  LINK: '#2A5ADA',
  AAVE: '#B6509E',
}

export const tokenColor = (token: Token) => TOKEN_COLORS[token.symbol] ?? '#FF37C7'

export const RANGE_PERIODS: { value: RangePeriod; label: string; description: string }[] = [
  { value: '1D', label: '1D', description: '1 Day' },
  { value: '1W', label: '1W', description: '1 Week' },
  { value: '1M', label: '1M', description: '1 Month' },
  { value: '1Y', label: '1Y', description: '1 Year' },
  { value: 'ALL', label: 'All time', description: 'All time' },
]

/** The sparkline's mock only goes back a year, so All time reads its 1Y series */
const SERIES: Record<RangePeriod, ChartPeriod> = { '1D': '1D', '1W': '1W', '1M': '1M', '1Y': '1Y', ALL: '1Y' }

const cache = new Map<string, PairPricePoint[]>()

/**
 * The pair's price history (token1 per token0): the ratio of the two tokens'
 * mock USD series, which share timestamps. Ends at the pool's current price.
 */
export function getPairPriceHistory(pool: Pool, period: RangePeriod): PairPricePoint[] {
  const key = `${pool.id}:${period}`
  const cached = cache.get(key)
  if (cached) return cached
  const a = getMockPriceHistory(pool.token0, SERIES[period])
  const b = getMockPriceHistory(pool.token1, SERIES[period])
  const points = a.map((p, i) => ({ timestamp: p.timestamp, price: p.value / b[i].value }))
  cache.set(key, points)
  return points
}
