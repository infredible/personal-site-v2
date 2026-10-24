import type { Token } from '../swap/types'
import type { BuyDenomination, BuyFormState, PaySource, Provider } from './types'

// Keypad and quote math for the buy flow. Pure functions over BuyFormState.

/** Fraction digits the keypad accepts, matching what the display shows */
export const AMOUNT_DECIMALS: Record<BuyDenomination, number> = { usd: 2, token: 4 }

/** Keeps the number on one line at the smallest size */
const MAX_INTEGER_DIGITS = 9

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace'

/** Applies one keypad press. Returns `amount` unchanged when the key is refused (a second ".", too many digits). */
export function pressKey(amount: string, key: KeypadKey, denomination: BuyDenomination): string {
  if (key === 'backspace') return amount.length > 1 ? amount.slice(0, -1) : '0'
  if (key === '.') return amount.includes('.') ? amount : `${amount}.`
  if (amount === '0') return key
  const [int, frac] = amount.split('.')
  if (frac !== undefined) return frac.length >= AMOUNT_DECIMALS[denomination] ? amount : amount + key
  return int.length >= MAX_INTEGER_DIGITS ? amount : amount + key
}

/** "12." → 12; "0" → 0 */
export const amountValue = (amount: string) => Number.parseFloat(amount) || 0

/** The typed amount for display: grouped integer part, the fraction exactly as typed ("1,234.5", "12.") */
export function formatTyped(amount: string): string {
  const [int, frac] = amount.split('.')
  const grouped = Number(int).toLocaleString('en-US')
  return frac === undefined ? grouped : `${grouped}.${frac}`
}

/**
 * The prototype's steps: the number shrinks as it grows, by its displayed
 * length. Typed in tokens, the symbol after it counts as two more characters
 * (it's set at 16px), so "1,630.25 USDC" steps down before it reaches the
 * unit switch beside it.
 */
export function amountFontSize(display: string, denomination: BuyDenomination = 'usd'): 64 | 56 | 48 | 40 {
  const length = display.length + (denomination === 'token' ? 2 : 0)
  if (length > 10) return 40
  if (length > 8) return 48
  if (length > 6) return 56
  return 64
}

/**
 * A value as a keypad string in `denomination`, at the keypad's decimals with
 * no trailing zeros. Rounds down for limits (Max never reads as over), to
 * nearest for conversions (switching units back and forth doesn't drift).
 */
export function toTyped(value: number, denomination: BuyDenomination, rounding: 'down' | 'nearest' = 'nearest'): string {
  if (!(value > 0)) return '0'
  const scale = 10 ** AMOUNT_DECIMALS[denomination]
  const scaled = rounding === 'down' ? Math.floor(value * scale + 1e-9) : Math.round(value * scale)
  const fixed = (scaled / scale).toFixed(AMOUNT_DECIMALS[denomination])
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed
}

/** The amount in USD, whichever unit it's typed in */
export const amountUsd = (state: Pick<BuyFormState, 'amount' | 'denomination' | 'receive'>) =>
  amountValue(state.amount) * (state.denomination === 'usd' ? 1 : state.receive.priceUsd)

/** Tokens bought for the amount */
export const receiveAmount = (state: Pick<BuyFormState, 'amount' | 'denomination' | 'receive'>) =>
  amountUsd(state) / state.receive.priceUsd

/** Re-types a USD value in `denomination` (token units of `receive`) */
export const typedFromUsd = (
  usd: number,
  denomination: BuyDenomination,
  receive: Token,
  rounding: 'down' | 'nearest' = 'nearest',
) => toTyped(denomination === 'usd' ? usd : usd / receive.priceUsd, denomination, rounding)

/** What one purchase can be at most, in USD: the balance's value, or the onramp's limit net of its markup */
export function maxUsd(pay: PaySource, balances: Record<string, number>) {
  if (pay.kind === 'fiat') return pay.provider.limitUsd / (1 + pay.provider.markup)
  return (balances[pay.token.symbol] ?? 0) * pay.token.priceUsd
}

/** What paying through `provider` costs for `usd` of tokens */
export const providerCost = (provider: Provider, usd: number) => usd * (1 + provider.markup)

/** How much worse than the cheapest in `providers` this one is, as a fraction */
export function relativeMarkup(provider: Provider, providers: Provider[]) {
  const best = Math.min(...providers.map((p) => p.markup))
  return (1 + provider.markup) / (1 + best) - 1
}

/** What's under the keypad: quick amounts with no amount, else the review button or why it's off */
export type BuyAction =
  | { kind: 'quick' }
  | { kind: 'review' }
  | { kind: 'insufficient'; label: string }

/** Half a cent of slack, so Max (rounded down to cents) never reads as over */
const EPSILON_USD = 0.005

export function getBuyAction(state: BuyFormState): BuyAction {
  const usd = amountUsd(state)
  if (usd <= 0) return { kind: 'quick' }
  const { pay } = state
  if (pay.kind === 'token' && usd > maxUsd(pay, state.balances) + EPSILON_USD) {
    return { kind: 'insufficient', label: `Not enough ${pay.token.symbol}` }
  }
  if (pay.kind === 'fiat' && providerCost(pay.provider, usd) > pay.provider.limitUsd + EPSILON_USD) {
    return { kind: 'insufficient', label: `Over ${pay.provider.name}’s limit` }
  }
  return { kind: 'review' }
}

export const sameAsset = (pay: PaySource, token: Token) => pay.kind === 'token' && pay.token.symbol === token.symbol
