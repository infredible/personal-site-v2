// Shared contracts for the swap recreation. Display parts (parts/, overlays/)
// render from these shapes; SwapBox (phase 3) owns and updates them.

export interface Token {
  symbol: string
  name: string
  decimals: number
  /** Path under /public */
  logo: string
  /** Fake spot price, used by the mock quote engine */
  priceUsd: number
}

export type SwapField = 'input' | 'output'

export type SwapMode = 'swap' | 'limit' | 'buy' | 'sell'

export type QuoteStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface SwapQuote {
  status: QuoteStatus
  /** Output tokens per 1 input token */
  rate?: number
  /** Fraction, e.g. 0.0012 = 0.12% */
  priceImpact?: number
  networkFeeUsd?: number
  /** Fraction, e.g. 0.0025 = 0.25% */
  feeRate?: number
  /** Human-readable route, e.g. "Uniswap API" */
  route?: string
}

export interface SlippageSettings {
  auto: boolean
  /** Fraction, e.g. 0.005 = 0.5% */
  value: number
}

export interface SwapFormState {
  mode: SwapMode
  input: { token?: Token; amount: string }
  output: { token?: Token; amount: string }
  /** Which field the user typed into; the other is derived from the quote */
  exactField: SwapField
  focusedField?: SwapField
  quote: SwapQuote
  wallet: {
    connected: boolean
    address?: string
    /** Keyed by token symbol, in whole-token units */
    balances: Record<string, number>
  }
  slippage: SlippageSettings
}
