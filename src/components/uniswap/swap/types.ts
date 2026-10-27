// Shared contracts for the swap recreation. Display parts (parts/, overlays/)
// render from these shapes; SwapBox (phase 3) owns and updates them.

export type ChainId =
  | 'ethereum'
  | 'base'
  | 'arbitrum'
  | 'optimism'
  | 'polygon'
  | 'unichain'
  | 'bnb'
  | 'avalanche'
  | 'zksync'
  | 'blast'
  | 'zora'
  | 'celo'
  | 'worldchain'
  | 'linea'
  | 'soneium'

export interface Chain {
  id: ChainId
  name: string
  /** Path under /public. Without one, ChainLogo draws a monogram on `color`. */
  logo?: string
  /** Brand color for the monogram fallback. */
  color?: string
}

export type TokenCategory = 'stablecoin' | 'defi' | 'layer2' | 'meme' | 'wrapped' | 'native'

export interface Token {
  symbol: string
  name: string
  decimals: number
  /** Path under /public */
  logo: string
  /** Fake spot price, used by the mock quote engine */
  priceUsd: number
  /** For token selector filtering */
  category?: TokenCategory
  /** Networks the token is listed on (mock) */
  chains?: ChainId[]
  /** Fake 24h price change, as a fraction (0.0123 = +1.23%) */
  change24h?: number
}

export type SwapField = 'input' | 'output'

export type SwapMode = 'swap' | 'limit'

/** What can hold the form's focus: an amount field, or the limit price */
export type SwapFocusField = SwapField | 'price'

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
  /** Human-readable route, e.g. "Uniswap v4" */
  route?: string
}

export interface SlippageSettings {
  auto: boolean
  /** Fraction, e.g. 0.005 = 0.5% */
  value: number
}

export type LimitExpiry = '1d' | '1w' | '1m' | '1y'

export interface LimitSettings {
  /** Typed limit price, as displayed: `quote` tokens per 1 `base` token */
  price: string
  /**
   * Display direction. false: output per input ("1 ETH = 3,412 USDC" selling ETH);
   * true: input per output. Set so the pricier token is the base.
   */
  inverted: boolean
  /** Preset the price came from (a fraction better than market, 0 = market); null once typed by hand */
  preset: number | null
  expiry: LimitExpiry
  /** Pair the price was set for ("ETH/USDC"); a different pair resets it */
  pairKey?: string
}

export interface SwapFormState {
  mode: SwapMode
  input: { token?: Token; amount: string }
  output: { token?: Token; amount: string }
  /** Which field the user typed into; the other is derived from the quote */
  exactField: SwapField
  focusedField?: SwapFocusField
  quote: SwapQuote
  wallet: {
    connected: boolean
    address?: string
    /** Keyed by token symbol, in whole-token units */
    balances: Record<string, number>
    /** Balances are still being fetched (page load): panels show skeletons */
    balancesLoading?: boolean
  }
  slippage: SlippageSettings
  limit: LimitSettings
}
