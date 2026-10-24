import { parseAmount } from './format'
import { formatDerivedAmount } from './parts/amount'
import type { LimitExpiry, LimitSettings, SwapFormState, Token } from './types'

/*
 * Limit order math, shared by the form parts and SwapBox. A redesign of
 * Uniswap's limit form (apps/web/src/pages/Swap/Limit/LimitForm.tsx +
 * LimitPriceInputPanel) rather than a port:
 *
 * - The pair comes from the Sell / Buy panels only. Uniswap's price panel has a
 *   second token selector ("When 1 [ETH] is worth"); here the price just reads
 *   in the pair's terms.
 * - The price is quoted with the pricier token as the base ("1 ETH = 3,412 USDC"),
 *   whichever side it's on, so it reads like a chart. The unit flips on click.
 * - Presets are always "better than market by n%": +n% when selling the base,
 *   -n% when buying it.
 * - "Market" is the spot price, and limit fills carry no fees or gas, so
 *   Buy = Sell × price exactly.
 */

/** Market, then 1 / 5 / 10% better than market */
export const LIMIT_PRESETS = [0, 0.01, 0.05, 0.1] as const

export const LIMIT_EXPIRIES: { value: LimitExpiry; label: string }[] = [
  { value: '1d', label: '1 day' },
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: '1y', label: '1 year' },
]

export const expiryLabel = (expiry: LimitExpiry) => LIMIT_EXPIRIES.find((e) => e.value === expiry)?.label ?? expiry

export const DEFAULT_LIMIT: LimitSettings = { price: '', inverted: false, preset: 0, expiry: '1w' }

/** Typed-price rounding stays inside this, so "Market" never reads as below market */
const MARKET_TOLERANCE = 0.0005
/** Asking for 2× market or more: allowed, but it may never fill */
export const LIMIT_FAR_FROM_MARKET = 1

/** Spot rate (output per input) before fees: what "market" means for a limit */
export function marketRate(input: Token, output: Token) {
  return input.priceUsd / output.priceUsd
}

/** Quote the pricier token: true when the output is worth more per unit */
export function prefersInverted(input: Token, output: Token) {
  return output.priceUsd > input.priceUsd
}

const pairKeyOf = (state: SwapFormState) =>
  state.input.token && state.output.token ? `${state.input.token.symbol}/${state.output.token.symbol}` : undefined

/** Displayed market price, moved `preset` in the trader's favor */
function presetPrice(market: number, preset: number, inverted: boolean) {
  return inverted ? market * (1 - preset) : market * (1 + preset)
}

/** An editable price: plain digits, ~6 significant figures, 2 decimals from 1,000 up */
export function formatPriceInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  const decimals = value >= 1000 ? 2 : Math.min(18, Math.max(2, 5 - Math.floor(Math.log10(value))))
  return value.toFixed(decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export type LimitPriceStatus = 'market' | 'better' | 'far' | 'below-market'

export interface LimitPrice {
  /** 1 base = price quote */
  base: Token
  quote: Token
  inverted: boolean
  /** Displayed market price */
  market: number
  /** Displayed limit price; NaN when empty */
  price: number
  /** Output per input at the limit price; NaN when empty */
  rate: number
  /** Displayed price vs displayed market, signed (+0.05: the number is 5% higher) */
  delta: number
  /** Extra output vs a market fill (+: better, -: worse) */
  gain: number
  status: LimitPriceStatus | undefined
}

export function getLimitPrice(state: SwapFormState): LimitPrice | undefined {
  const { input, output, limit } = state
  if (!input.token || !output.token) return undefined
  const { inverted } = limit
  const spot = marketRate(input.token, output.token)
  const market = inverted ? 1 / spot : spot
  const typed = parseAmount(limit.price)
  const price = Number.isFinite(typed) && typed > 0 ? typed : NaN
  const rate = inverted ? 1 / price : price
  const gain = rate / spot - 1
  const status: LimitPriceStatus | undefined = Number.isNaN(price)
    ? undefined
    : limit.preset === 0 || Math.abs(gain) < MARKET_TOLERANCE
      ? 'market'
      : gain < 0
        ? 'below-market'
        : gain >= LIMIT_FAR_FROM_MARKET
          ? 'far'
          : 'better'
  return {
    base: inverted ? output.token : input.token,
    quote: inverted ? input.token : output.token,
    inverted,
    market,
    price,
    rate,
    delta: price / market - 1,
    gain,
    status,
  }
}

/** Preset chip label: the move in the displayed number */
export function presetLabel(preset: number, inverted: boolean) {
  if (preset === 0) return 'Market'
  return `${inverted ? '−' : '+'}${Math.round(preset * 100)}%`
}

/** Re-derives the side that wasn't typed into from the limit price. */
export function deriveLimitAmounts(state: SwapFormState): SwapFormState {
  const { input, output, exactField } = state
  const rate = getLimitPrice(state)?.rate ?? NaN
  const exact = parseAmount(exactField === 'input' ? input.amount : output.amount)
  const derived =
    !Number.isFinite(rate) || !Number.isFinite(exact) || exact <= 0
      ? ''
      : exactField === 'input'
        ? formatDerivedAmount(exact * rate, output.token?.decimals)
        : formatDerivedAmount(exact / rate, input.token?.decimals)
  const next = exactField === 'input' ? { output: { ...output, amount: derived } } : { input: { ...input, amount: derived } }
  return { ...state, ...next, quote: { status: 'idle' } }
}

/** Sets the price from a preset (or market), oriented for the current pair. */
export function withLimitPreset(state: SwapFormState, preset: number, inverted = state.limit.inverted): SwapFormState {
  const { input, output } = state
  if (!input.token || !output.token) return { ...state, limit: { ...state.limit, price: '', preset, pairKey: undefined } }
  const spot = marketRate(input.token, output.token)
  const price = formatPriceInput(presetPrice(inverted ? 1 / spot : spot, preset, inverted))
  return { ...state, limit: { ...state.limit, price, preset, inverted, pairKey: pairKeyOf(state) } }
}

export function withLimitPrice(state: SwapFormState, price: string): SwapFormState {
  return { ...state, limit: { ...state.limit, price, preset: null } }
}

/** Flips the displayed unit. A preset stays a preset; a typed price is inverted. */
export function withInvertedPrice(state: SwapFormState): SwapFormState {
  const inverted = !state.limit.inverted
  if (state.limit.preset !== null) return withLimitPreset(state, state.limit.preset, inverted)
  const typed = parseAmount(state.limit.price)
  const price = Number.isFinite(typed) && typed > 0 ? formatPriceInput(1 / typed) : ''
  return { ...state, limit: { ...state.limit, price, inverted } }
}

/**
 * Brings a limit-mode state up to date after any change: a new pair (or the
 * first visit to the tab) re-orients the price and resets it to its preset, or
 * to market when it was typed by hand; then the derived amount follows the
 * price. A price cleared by hand stays empty until something is typed.
 */
export function requoteLimit(state: SwapFormState): SwapFormState {
  const key = pairKeyOf(state)
  if (key && state.limit.pairKey !== key) {
    const { input, output } = state
    return deriveLimitAmounts(withLimitPreset(state, state.limit.preset ?? 0, prefersInverted(input.token!, output.token!)))
  }
  return deriveLimitAmounts(state)
}
