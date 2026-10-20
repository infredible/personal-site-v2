import type { SwapFormState, Token } from './types'

// Fake token list and wallet. Prices are fixed so quotes are deterministic.
// Logos: cryptocurrency-icons (CC0), in public/showcase/tokens/.

export const TOKENS = {
  ETH: { symbol: 'ETH', name: 'Ethereum', decimals: 18, logo: '/showcase/tokens/eth.svg', priceUsd: 3412.58 },
  USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, logo: '/showcase/tokens/usdc.svg', priceUsd: 1 },
  USDT: { symbol: 'USDT', name: 'Tether', decimals: 6, logo: '/showcase/tokens/usdt.svg', priceUsd: 1 },
  DAI: { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, logo: '/showcase/tokens/dai.svg', priceUsd: 0.9998 },
  WBTC: { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, logo: '/showcase/tokens/wbtc.svg', priceUsd: 97250.14 },
  UNI: { symbol: 'UNI', name: 'Uniswap', decimals: 18, logo: '/showcase/tokens/uni.svg', priceUsd: 11.42 },
  LINK: { symbol: 'LINK', name: 'Chainlink', decimals: 18, logo: '/showcase/tokens/link.svg', priceUsd: 23.87 },
  AAVE: { symbol: 'AAVE', name: 'Aave', decimals: 18, logo: '/showcase/tokens/aave.svg', priceUsd: 318.4 },
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
  },
}

export const DEFAULT_SLIPPAGE: SwapFormState['slippage'] = { auto: true, value: 0.005 }
