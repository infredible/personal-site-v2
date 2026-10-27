// Contracts for the buy flow (a mobile prototype, not a Uniswap port). Display
// parts render from these shapes; BuyFlow owns and updates them.

import type { Token } from '../swap/types'

/** What the big number is typed in: dollars, or units of the token being bought */
export type BuyDenomination = 'usd' | 'token'

export type PaymentMethodId = 'tokens' | 'apple-pay' | 'card' | 'venmo' | 'paypal' | 'revolut' | 'ach' | 'swift'

export type FiatMethodId = Exclude<PaymentMethodId, 'tokens'>

export interface PaymentMethod {
  id: PaymentMethodId
  label: string
  /** Brand mark under /public; without one the method draws its glyph in currentColor */
  image?: string
}

/** An onramp quoting a fiat payment method */
export interface Provider {
  id: string
  name: string
  /** Path under /public. Without one, ProviderLogo draws a monogram on `color`. */
  logo?: string
  color: string
  /** Most it will charge for one purchase, in USD */
  limitUsd: number
  /** How much more than the best quote it charges, as a fraction (0.012 = 1.2% worse) */
  markup: number
}

/** What pays for the purchase: a token you hold, or a fiat method through an onramp */
export type PaySource =
  | { kind: 'token'; token: Token }
  | { kind: 'fiat'; method: FiatMethodId; provider: Provider }

export type QuoteStatus = 'idle' | 'loading' | 'ready'

export interface BuyFormState {
  /** As typed on the keypad, in `denomination` units: "0", "12.", "125.5" */
  amount: string
  denomination: BuyDenomination
  pay: PaySource
  /** The token being bought; `token` denomination counts in it */
  receive: Token
  /**
   * The cards trade places on a flip, so the one holding the pay asset moves
   * rather than both changing content. Visual only: the top card always pays.
   */
  flipped: boolean
  /** Network cost for the current amount (a mock fetch on every edit) */
  networkCost: { status: QuoteStatus; usd?: number }
  /** Keyed by token symbol, in whole-token units */
  balances: Record<string, number>
}

/** Which card the "Buy with" sheet picks for */
export type BuySide = 'pay' | 'receive'

export interface BuySheetState {
  open: boolean
  side: BuySide
  /** Chip in view. Browsing chips doesn't change the pay source; picking a row does. */
  method: PaymentMethodId
  query: string
}
