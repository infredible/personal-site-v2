import type { Chain, ChainId, SwapFormState, Token, TokenCategory } from './types'

export const CHAINS: Chain[] = [
  { id: 'ethereum', name: 'Ethereum', logo: '/showcase/tokens/chains/ethereum.png' },
  { id: 'base', name: 'Base', logo: '/showcase/tokens/chains/base.png' },
  { id: 'arbitrum', name: 'Arbitrum', logo: '/showcase/tokens/chains/arbitrum.png' },
  { id: 'optimism', name: 'Optimism', logo: '/showcase/tokens/chains/optimism.png' },
  { id: 'polygon', name: 'Polygon', logo: '/showcase/tokens/chains/polygon.png' },
]

const ALL_CHAINS: ChainId[] = CHAINS.map((c) => c.id)

export const TOKEN_CATEGORIES: { id: TokenCategory; label: string }[] = [
  { id: 'stablecoin', label: 'Stablecoins' },
  { id: 'defi', label: 'DeFi' },
  { id: 'layer2', label: 'Layer 2' },
  { id: 'wrapped', label: 'Wrapped' },
  { id: 'meme', label: 'Memes' },
]

// Fake token list and wallet. Prices are fixed so quotes are deterministic.
// Logos: Trust Wallet assets (github.com/trustwallet/assets), saved in public/showcase/tokens/.

export const TOKENS = {
  ETH: { symbol: 'ETH', name: 'Ethereum', decimals: 18, logo: '/showcase/tokens/eth.png', priceUsd: 3412.58, category: 'native', chains: ALL_CHAINS, change24h: 0.0184 },
  USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, logo: '/showcase/tokens/usdc.png', priceUsd: 1, category: 'stablecoin', chains: ALL_CHAINS, change24h: 0.0001 },
  USDT: { symbol: 'USDT', name: 'Tether', decimals: 6, logo: '/showcase/tokens/usdt.png', priceUsd: 1, category: 'stablecoin', chains: ALL_CHAINS, change24h: -0.0002 },
  DAI: { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, logo: '/showcase/tokens/dai.png', priceUsd: 0.9998, category: 'stablecoin', chains: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'], change24h: 0 },
  PYUSD: { symbol: 'PYUSD', name: 'PayPal USD', decimals: 6, logo: '/showcase/tokens/pyusd.png', priceUsd: 1, category: 'stablecoin', chains: ['ethereum'], change24h: 0.0001 },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, logo: '/showcase/tokens/weth.png', priceUsd: 3412.58, category: 'wrapped', chains: ALL_CHAINS, change24h: 0.0184 },
  WBTC: { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, logo: '/showcase/tokens/wbtc.png', priceUsd: 97250.14, category: 'wrapped', chains: ['ethereum', 'arbitrum', 'polygon'], change24h: 0.0092 },
  UNI: { symbol: 'UNI', name: 'Uniswap', decimals: 18, logo: '/showcase/tokens/uni.png', priceUsd: 11.42, category: 'defi', chains: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'], change24h: 0.0431 },
  AAVE: { symbol: 'AAVE', name: 'Aave', decimals: 18, logo: '/showcase/tokens/aave.png', priceUsd: 318.4, category: 'defi', chains: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'], change24h: -0.0127 },
  LINK: { symbol: 'LINK', name: 'Chainlink', decimals: 18, logo: '/showcase/tokens/link.png', priceUsd: 23.87, category: 'defi', chains: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'], change24h: 0.0215 },
  MKR: { symbol: 'MKR', name: 'Maker', decimals: 18, logo: '/showcase/tokens/mkr.png', priceUsd: 1612.3, category: 'defi', chains: ['ethereum'], change24h: -0.0068 },
  LDO: { symbol: 'LDO', name: 'Lido DAO', decimals: 18, logo: '/showcase/tokens/ldo.png', priceUsd: 1.94, category: 'defi', chains: ['ethereum', 'arbitrum', 'optimism'], change24h: 0.0352 },
  ENS: { symbol: 'ENS', name: 'Ethereum Name Service', decimals: 18, logo: '/showcase/tokens/ens.png', priceUsd: 32.15, category: 'defi', chains: ['ethereum'], change24h: -0.0211 },
  ARB: { symbol: 'ARB', name: 'Arbitrum', decimals: 18, logo: '/showcase/tokens/arb.png', priceUsd: 0.78, category: 'layer2', chains: ['ethereum', 'arbitrum'], change24h: 0.0067 },
  OP: { symbol: 'OP', name: 'Optimism', decimals: 18, logo: '/showcase/tokens/op.png', priceUsd: 1.86, category: 'layer2', chains: ['optimism'], change24h: -0.0143 },
  PEPE: { symbol: 'PEPE', name: 'Pepe', decimals: 18, logo: '/showcase/tokens/pepe.png', priceUsd: 1.842e-05, category: 'meme', chains: ['ethereum', 'arbitrum'], change24h: 0.0921 },
  SHIB: { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, logo: '/showcase/tokens/shib.png', priceUsd: 2.431e-05, category: 'meme', chains: ['ethereum'], change24h: -0.0315 },
} satisfies Record<string, Token>

export type TokenSymbol = keyof typeof TOKENS

export const TOKEN_LIST: Token[] = Object.values(TOKENS)

/** Shown as quick-pick chips at the top of the token selector */
export const COMMON_TOKENS: Token[] = [TOKENS.ETH, TOKENS.USDC, TOKENS.USDT, TOKENS.WBTC, TOKENS.UNI]

export const MOCK_WALLET: SwapFormState['wallet'] = {
  connected: true,
  address: '0x7a3F9c2E1b6D4e8A0f5C3b2D9e1A4c7B8d6E2f19',
  balances: {
    ETH: 1.8423,
    USDC: 2450.12,
    USDT: 0,
    DAI: 312.5,
    WBTC: 0.0412,
    UNI: 148.33,
    LINK: 0,
    AAVE: 2.104,
    WETH: 0.25,
    ARB: 820,
    PEPE: 12500000,
  },
}

export const DEFAULT_SLIPPAGE: SwapFormState['slippage'] = { auto: true, value: 0.005 }
