import { createLimitOrder, DEFAULT_LIMIT, requoteLimit, withLimitPreset, withLimitPrice } from './limit'
import { formatDerivedAmount } from './parts/amount'
import { DEFAULT_SLIPPAGE, MOCK_WALLET, TOKENS } from './tokens'
import type { LimitOrder, SwapFormState, SwapQuote, Token } from './types'

// Named SwapFormState snapshots: render any of them read-only through
// SwapFormView, or seed SwapBox with one.

export interface SwapPreset {
  id: string
  label: string
  description: string
  state: SwapFormState
}

interface QuoteOptions {
  priceImpact?: number
  networkFeeUsd?: number
  feeRate?: number
  route?: string
}

/** Execution rate (output per input) after price impact and the interface fee. */
export function mockRate(input: Token, output: Token, { priceImpact = 0.0005, feeRate = 0.0025 }: QuoteOptions = {}) {
  return (input.priceUsd / output.priceUsd) * (1 - priceImpact) * (1 - feeRate)
}

/** A ready quote plus the derived output amount for `amount` of `input`. */
export function mockQuote(input: Token, output: Token, amount: number, options: QuoteOptions = {}) {
  const { priceImpact = 0.0005, networkFeeUsd = 1.24, feeRate = 0.0025, route = 'Uniswap v4' } = options
  const rate = mockRate(input, output, { priceImpact, feeRate })
  const quote: SwapQuote = { status: 'ready', rate, priceImpact, networkFeeUsd, feeRate, route }
  return { quote, outputAmount: formatDerivedAmount(amount * rate, output.decimals) }
}

const base: SwapFormState = {
  mode: 'swap',
  input: { token: TOKENS.ETH, amount: '' },
  output: { token: undefined, amount: '' },
  exactField: 'input',
  // Uniswap keeps the Sell field focused on load, so its panel shows the focused frame
  focusedField: 'input',
  quote: { status: 'idle' },
  wallet: MOCK_WALLET,
  slippage: DEFAULT_SLIPPAGE,
  limit: DEFAULT_LIMIT,
}

function swap(input: Token, output: Token, amount: string, options?: QuoteOptions): SwapFormState {
  const { quote, outputAmount } = mockQuote(input, output, Number(amount), options)
  return {
    ...base,
    input: { token: input, amount },
    output: { token: output, amount: outputAmount },
    quote,
  }
}

const filled = swap(TOKENS.ETH, TOKENS.USDC, '1')

/** A limit-tab state: the pair and amount, the price from a preset (fraction) or typed, amounts derived. */
function limit(
  input: Token,
  output: Token,
  amount: string,
  price: { preset: number } | { typed: (market: number) => number },
  orders: LimitOrder[] = [],
): SwapFormState {
  const oriented = requoteLimit({
    ...base,
    mode: 'limit',
    input: { token: input, amount },
    output: { token: output, amount: '' },
    limit: { ...DEFAULT_LIMIT, orders },
  })
  const priced =
    'preset' in price
      ? withLimitPreset(oriented, price.preset)
      : withLimitPrice(oriented, String(Number(price.typed(Number(oriented.limit.price)).toPrecision(6))))
  return requoteLimit(priced)
}

const order = (id: string, state: SwapFormState, expiry: LimitOrder['expiry']): LimitOrder => ({
  ...createLimitOrder(state, id)!,
  expiry,
})

const limitReady = limit(TOKENS.ETH, TOKENS.USDC, '1', { preset: 0.05 })

export const SWAP_PRESETS: SwapPreset[] = [
  {
    id: 'empty',
    label: 'Empty',
    description: 'Wallet connected, ETH to sell, nothing chosen to buy yet.',
    state: base,
  },
  {
    id: 'select-output',
    label: 'Select output',
    description: 'An amount is entered but the Buy token is still missing.',
    state: { ...base, input: { token: TOKENS.ETH, amount: '1' } },
  },
  {
    id: 'enter-amount',
    label: 'Enter amount',
    description: 'Both tokens chosen, no amount yet.',
    state: { ...base, output: { token: TOKENS.USDC, amount: '' } },
  },
  {
    id: 'filled',
    label: 'Ready to review',
    description: '1 ETH to USDC with a ready quote.',
    state: filled,
  },
  {
    id: 'output-focused',
    label: 'Exact output',
    description: 'The Buy field was typed into; Sell is derived.',
    state: (() => {
      const { quote } = mockQuote(TOKENS.ETH, TOKENS.USDC, 1)
      const input = formatDerivedAmount(2500 / quote.rate!, TOKENS.ETH.decimals)
      return {
        ...base,
        input: { token: TOKENS.ETH, amount: input },
        output: { token: TOKENS.USDC, amount: '2500' },
        exactField: 'output',
        focusedField: 'output',
        quote,
      }
    })(),
  },
  {
    id: 'loading-quote',
    label: 'Fetching quote',
    description: 'A new amount was typed; the Buy side pulses while the quote refreshes.',
    state: {
      ...filled,
      input: { token: TOKENS.ETH, amount: '1.5' },
      // A refetch keeps the previous quote on screen (dimmed) until the new one lands
      quote: { ...filled.quote, status: 'loading' },
    },
  },
  {
    id: 'first-quote',
    label: 'First quote',
    description: 'An amount was just typed with no quote yet: the Buy side and details are skeletons.',
    state: {
      ...base,
      input: { token: TOKENS.ETH, amount: '1' },
      output: { token: TOKENS.USDC, amount: '' },
      quote: { status: 'loading' },
    },
  },
  {
    id: 'page-load',
    label: 'Page load',
    description: 'Wallet balances are still loading: balances are skeletons and Max is hidden.',
    state: {
      ...base,
      output: { token: TOKENS.USDC, amount: '' },
      wallet: { ...MOCK_WALLET, balancesLoading: true },
    },
  },
  {
    id: 'insufficient-balance',
    label: 'Insufficient balance',
    description: 'Selling more ETH than the wallet holds.',
    state: swap(TOKENS.ETH, TOKENS.USDC, '2.5'),
  },
  {
    id: 'high-price-impact',
    label: 'High price impact',
    description: 'A thin WBTC to LINK route moves the price 18%.',
    state: swap(TOKENS.WBTC, TOKENS.LINK, '0.04', { priceImpact: 0.18, networkFeeUsd: 3.87 }),
  },
  {
    id: 'disconnected',
    label: 'Disconnected',
    description: 'No wallet: balances are hidden and the button connects.',
    state: {
      ...filled,
      wallet: { connected: false, balances: {} },
    },
  },
  {
    id: 'custom-slippage',
    label: 'Custom slippage',
    description: 'Max slippage set by hand to 1%, above auto, so it warns.',
    state: { ...filled, slippage: { auto: false, value: 0.01 } },
  },
  {
    id: 'no-route',
    label: 'No route',
    description: 'The quote failed for this pair.',
    state: {
      ...base,
      input: { token: TOKENS.AAVE, amount: '2' },
      output: { token: TOKENS.DAI, amount: '' },
      quote: { status: 'error' },
    },
  },
  {
    id: 'limit',
    label: 'Limit · Empty',
    description: 'The Limit tab with a pair chosen: the price starts at market.',
    state: limit(TOKENS.ETH, TOKENS.USDC, '', { preset: 0 }),
  },
  {
    id: 'limit-ready',
    label: 'Limit · Ready',
    description: 'Sell 1 ETH when it reaches 5% above market.',
    state: limitReady,
  },
  {
    id: 'limit-buy',
    label: 'Limit · Buy the dip',
    description: 'Selling USDC for ETH: the price still reads per ETH, so better is lower.',
    state: limit(TOKENS.USDC, TOKENS.ETH, '1000', { preset: 0.1 }),
  },
  {
    id: 'limit-custom',
    label: 'Limit · Typed price',
    description: 'A price typed by hand: no preset selected.',
    state: { ...limit(TOKENS.ETH, TOKENS.USDC, '0.5', { typed: () => 3750 }), focusedField: 'price' },
  },
  {
    id: 'limit-below-market',
    label: 'Limit · Below market',
    description: 'Asking less than a swap gets right now: flagged, and the button won’t place it.',
    state: limit(TOKENS.ETH, TOKENS.USDC, '1', { typed: (market) => market * 0.92 }),
  },
  {
    id: 'limit-far',
    label: 'Limit · Far from market',
    description: 'Over 2× market: allowed, with a warning that it may never fill.',
    state: limit(TOKENS.UNI, TOKENS.USDC, '100', { typed: (market) => market * 2.5 }),
  },
  {
    id: 'limit-orders',
    label: 'Limit · Open orders',
    description: 'Two orders placed and waiting to fill.',
    state: limit(TOKENS.ETH, TOKENS.USDC, '', { preset: 0.05 }, [
      order('order-a', limitReady, '1w'),
      order('order-b', limit(TOKENS.USDC, TOKENS.WBTC, '1200', { preset: 0.1 }), '1m'),
    ]),
  },
]

export function getPreset(id: string): SwapPreset | undefined {
  return SWAP_PRESETS.find((preset) => preset.id === id)
}
