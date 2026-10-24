// Mock data for the Explore tables (Tokens and Pools tabs). Everything is
// deterministic: derived numbers (1H/1W/1M/1Y volume, 1H change, pool 30D
// volume) come from a seeded hash of the row id, so server and client render
// the same values. Rows are unsorted; the UI sorts them.
//
// Tokens: one row per (token, chain), limited to EXPLORE_CHAINS.
// Pools: TVL and 1D volume are literals; 30D volume and APR are derived.

import { TOKEN_LIST, TOKENS } from '../swap/tokens'
import type { TokenSymbol } from '../swap/tokens'
import type { ChainId, Token } from '../swap/types'
import type {
  ExploreChain,
  ExplorePoolStats,
  ExploreTimePeriod,
  ExploreTokenStats,
  PoolProtocol,
} from './types'

const EXPLORE_CHAINS: ChainId[] = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'unichain']

const PERIODS: ExploreTimePeriod[] = ['1H', '1D', '1W', '1M', '1Y']

/** FNV-1a hash of a string, mapped to [0, 1). Same key, same value. */
function seeded(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 0x100000000
}

// Fully diluted valuation, USD (rough, mock).
const FDV_USD: Record<TokenSymbol, number> = {
  ETH: 410e9, WETH: 410e9, USDC: 60e9, USDT: 140e9, DAI: 5.3e9, PYUSD: 3.1e9,
  WBTC: 15e9, UNI: 11e9, AAVE: 5e9, LINK: 16.2e9, MKR: 1.1e9, LDO: 1.9e9,
  ENS: 3.2e9, ARB: 7.8e9, OP: 8e9, PEPE: 7.7e9, SHIB: 14.3e9,
}

// 1D volume on Ethereum mainnet, USD. Other chains scale from this.
const ETHEREUM_VOLUME_1D: Record<TokenSymbol, number> = {
  ETH: 820e6, WETH: 300e6, USDC: 700e6, USDT: 590e6, DAI: 60e6, PYUSD: 16e6,
  WBTC: 130e6, UNI: 40e6, AAVE: 26e6, LINK: 33e6, MKR: 8e6, LDO: 13e6,
  ENS: 5e6, ARB: 11e6, OP: 4e6, PEPE: 38e6, SHIB: 21e6,
}

// Share of Ethereum volume each chain carries.
const CHAIN_VOLUME_SHARE: Partial<Record<ChainId, number>> = {
  ethereum: 1, base: 0.32, arbitrum: 0.28, optimism: 0.12, polygon: 0.1, unichain: 0.05,
}

// Tokens with a native L2 get a boost on that chain.
const HOME_CHAIN: Partial<Record<TokenSymbol, ChainId>> = { ARB: 'arbitrum', OP: 'optimism' }

function dailyVolume(id: string, symbol: TokenSymbol, chain: ChainId): number {
  const home = HOME_CHAIN[symbol] === chain ? 3 : 1
  const share = CHAIN_VOLUME_SHARE[chain] ?? 0
  return ETHEREUM_VOLUME_1D[symbol] * share * home * (0.85 + 0.3 * seeded(`${id}:1D`))
}

function volumesFor(id: string, volume1d: number): Record<ExploreTimePeriod, number> {
  const volume1m = volume1d * (28 + 4 * seeded(`${id}:1M`))
  return {
    '1H': (volume1d / 24) * (0.8 + 0.4 * seeded(`${id}:1H`)),
    '1D': volume1d,
    '1W': volume1d * (6.5 + seeded(`${id}:1W`)),
    '1M': volume1m,
    '1Y': volume1m * (10 + 3 * seeded(`${id}:1Y`)),
  }
}

function tokenStats(token: Token, chain: ChainId): ExploreTokenStats {
  const id = `${chain}:${token.symbol}`
  const symbol = token.symbol as TokenSymbol
  return {
    id,
    token,
    chain,
    priceUsd: token.priceUsd,
    change1h: (seeded(`${id}:1h`) * 2 - 1) * 0.011,
    change1d: token.change24h ?? 0,
    fdvUsd: FDV_USD[symbol],
    volumeUsd: volumesFor(id, dailyVolume(id, symbol, chain)),
  }
}

export const EXPLORE_TOKEN_STATS: ExploreTokenStats[] = TOKEN_LIST.flatMap((token) =>
  (token.chains ?? [])
    .filter((chain) => EXPLORE_CHAINS.includes(chain))
    .map((chain) => tokenStats(token, chain)),
)

interface PoolOptions {
  hook?: string
  /** Extra incentive APR, fraction */
  reward?: number
}

function pool(
  chain: ChainId,
  protocol: PoolProtocol,
  sym0: TokenSymbol,
  sym1: TokenSymbol,
  feeTier: number,
  tvlUsd: number,
  volume1dUsd: number,
  options: PoolOptions = {},
): ExplorePoolStats {
  const id = `${chain}:${protocol}:${sym0}-${sym1}:${feeTier}`
  return {
    id,
    token0: TOKENS[sym0],
    token1: TOKENS[sym1],
    chain,
    protocol,
    feeTier,
    ...(options.hook ? { hook: options.hook } : {}),
    tvlUsd,
    volume1dUsd,
    volume30dUsd: volume1dUsd * (25 + 10 * seeded(`${id}:30d`)),
    apr: (volume1dUsd * feeTier * 365) / tvlUsd,
    ...(options.reward !== undefined ? { rewardApr: options.reward } : {}),
  }
}

export const EXPLORE_POOL_STATS: ExplorePoolStats[] = [
  // Ethereum
  pool('ethereum', 'v3', 'ETH', 'USDC', 0.0005, 185e6, 210e6),
  pool('ethereum', 'v4', 'ETH', 'USDC', 0.0005, 96e6, 88e6, { hook: 'Dynamic Fee' }),
  pool('ethereum', 'v4', 'ETH', 'USDC', 0.003, 1.1e6, 0.9e6, { hook: 'TWAMM' }),
  pool('ethereum', 'v3', 'ETH', 'USDC', 0.003, 62e6, 14e6),
  pool('ethereum', 'v2', 'ETH', 'USDC', 0.003, 38e6, 6.5e6),
  pool('ethereum', 'v3', 'ETH', 'USDT', 0.003, 41e6, 12e6),
  pool('ethereum', 'v3', 'USDC', 'USDT', 0.0001, 310e6, 120e6),
  pool('ethereum', 'v3', 'USDC', 'DAI', 0.0001, 58e6, 22e6),
  pool('ethereum', 'v4', 'PYUSD', 'USDC', 0.0001, 9.4e6, 2.1e6),
  pool('ethereum', 'v3', 'WBTC', 'ETH', 0.003, 54e6, 11e6),
  pool('ethereum', 'v3', 'UNI', 'ETH', 0.003, 28e6, 9e6),
  pool('ethereum', 'v3', 'LINK', 'ETH', 0.003, 19e6, 4e6),
  pool('ethereum', 'v3', 'PEPE', 'ETH', 0.01, 6.5e6, 9.5e6),
  pool('ethereum', 'v3', 'AAVE', 'ETH', 0.003, 7.8e6, 1.9e6),
  pool('ethereum', 'v3', 'LDO', 'ETH', 0.003, 4.2e6, 0.65e6),
  pool('ethereum', 'v3', 'SHIB', 'ETH', 0.01, 3.1e6, 1.05e6),
  pool('ethereum', 'v3', 'ENS', 'ETH', 0.003, 2.9e6, 0.38e6),
  pool('ethereum', 'v3', 'MKR', 'ETH', 0.003, 1.35e6, 0.21e6),
  // Base
  pool('base', 'v4', 'ETH', 'USDC', 0.0005, 52e6, 24e6, { hook: 'Dynamic Fee', reward: 0.06 }),
  pool('base', 'v3', 'ETH', 'USDC', 0.0005, 71e6, 31e6),
  pool('base', 'v3', 'AAVE', 'USDC', 0.003, 1.4e6, 0.26e6),
  // Arbitrum
  pool('arbitrum', 'v3', 'ETH', 'USDC', 0.0005, 88e6, 52e6),
  pool('arbitrum', 'v3', 'WBTC', 'ETH', 0.0005, 12e6, 3.4e6),
  pool('arbitrum', 'v3', 'ARB', 'ETH', 0.003, 6.1e6, 1.15e6),
  pool('arbitrum', 'v3', 'USDC', 'USDT', 0.0001, 22e6, 7e6),
  pool('arbitrum', 'v3', 'PEPE', 'ETH', 0.01, 0.9e6, 0.42e6),
  // Optimism
  pool('optimism', 'v3', 'ETH', 'USDC', 0.0005, 34e6, 14e6),
  pool('optimism', 'v3', 'OP', 'ETH', 0.003, 3.9e6, 0.76e6),
  // Polygon
  pool('polygon', 'v3', 'WBTC', 'USDC', 0.003, 2.3e6, 0.43e6),
  pool('polygon', 'v3', 'ETH', 'USDC', 0.0005, 4.8e6, 1.3e6),
  // Unichain
  pool('unichain', 'v4', 'ETH', 'USDC', 0.0005, 64e6, 11e6, { hook: 'Dynamic Fee', reward: 0.09 }),
  pool('unichain', 'v4', 'ETH', 'USDC', 0.003, 1.8e6, 0.39e6, { hook: 'TWAMM', reward: 0.12 }),
  pool('unichain', 'v4', 'USDC', 'USDT', 0.0001, 3.4e6, 0.61e6, { reward: 0.04 }),
  pool('unichain', 'v4', 'UNI', 'ETH', 0.003, 0.72e6, 0.16e6, { hook: 'Limit Orders', reward: 0.07 }),
]

/** Token rows for one network, or one row per token for 'all'. */
export function getExploreTokens(chain: ExploreChain): ExploreTokenStats[] {
  if (chain !== 'all') return EXPLORE_TOKEN_STATS.filter((row) => row.chain === chain)

  return TOKEN_LIST.flatMap((token) => {
    const rows = EXPLORE_TOKEN_STATS.filter((row) => row.token.symbol === token.symbol)
    if (rows.length === 0) return []
    const base = rows.find((row) => row.chain === 'ethereum') ?? rows[0]
    const volumeUsd = Object.fromEntries(
      PERIODS.map((period) => [period, rows.reduce((sum, row) => sum + row.volumeUsd[period], 0)]),
    ) as Record<ExploreTimePeriod, number>
    // `chain` stays the primary chain (logo badge); the row aggregates every chain
    return [{ ...base, id: `all:${token.symbol}`, volumeUsd }]
  })
}

/** Pool rows for one network, or every pool for 'all'. */
export function getExplorePools(chain: ExploreChain): ExplorePoolStats[] {
  return chain === 'all' ? EXPLORE_POOL_STATS : EXPLORE_POOL_STATS.filter((row) => row.chain === chain)
}
