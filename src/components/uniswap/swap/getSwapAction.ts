import { parseAmount } from './format'
import { getLimitPrice } from './limit'
import type { SwapFormState } from './types'

/*
 * The swap form's main button, derived from form state. A simplified port of
 * Uniswap's SwapFormButton logic (packages/uniswap/src/features/transactions/swap/
 * components/SwapFormButton/: getSwapFormButtonAction + hooks/useSwapFormButtonText,
 * useSwapFormButtonColors, useIsSwapButtonDisabled), keeping their priority order:
 *
 *   indicative quote → "Finalizing quote..." (spinner)
 *   disconnected     → "Connect wallet"      (branded secondary, enabled)
 *   missing token    → "Select a token"      (disabled)
 *   no amount        → "Enter an amount"     (disabled)
 *   amount > balance → "Not enough ETH"      (disabled)
 *   no route         → "No routes available" (disabled)
 *   ready            → "Review"              (branded primary)
 *
 * Uniswap disables via the neutral `default/secondary` style. Very high price
 * impact (>= 10%, Uniswap's PRICE_DIFFERENCE_CRITICAL_THRESHOLD) turns Review critical.
 *
 * Limit mode (getLimitAction) has no quote to wait on; it checks the price instead:
 *
 *   disconnected → no token → no amount
 *   no price          → "Set a limit price"     (disabled)
 *   amount > balance  → "Not enough ETH"        (disabled)
 *   worse than market → "Below market price"    (disabled; "Above" when buying the base)
 *   ready             → "Place order"           (branded primary)
 */

/** Fractions; Uniswap's PRICE_DIFFERENCE_WARNING_THRESHOLD / _CRITICAL_THRESHOLD (5% / 10%) */
export const PRICE_IMPACT_WARNING = 0.05
export const PRICE_IMPACT_CRITICAL = 0.1

export type SwapActionKind =
  | 'finalizing-quote'
  | 'connect-wallet'
  | 'select-token'
  | 'enter-amount'
  | 'insufficient-balance'
  | 'no-route'
  | 'review'
  | 'enter-price'
  | 'below-market'
  | 'place-order'
  | 'confirm-in-wallet'

export interface SwapAction {
  kind: SwapActionKind
  label: string
  variant: 'default' | 'branded' | 'critical'
  emphasis: 'primary' | 'secondary'
  disabled: boolean
  loading: boolean
}

export function getPriceImpactSeverity(priceImpact: number | undefined): 'none' | 'warning' | 'critical' {
  if (priceImpact === undefined || priceImpact < PRICE_IMPACT_WARNING) return 'none'
  return priceImpact >= PRICE_IMPACT_CRITICAL ? 'critical' : 'warning'
}

const blocked = (kind: SwapActionKind, label: string): SwapAction => ({
  kind,
  label,
  variant: 'default',
  emphasis: 'secondary',
  disabled: true,
  loading: false,
})

/** Shown while a limit order waits on the wallet signature */
export const CONFIRM_IN_WALLET: SwapAction = { ...blocked('confirm-in-wallet', 'Confirm in wallet'), loading: true }

const connectWallet: SwapAction = {
  kind: 'connect-wallet',
  label: 'Connect wallet',
  variant: 'branded',
  emphasis: 'secondary',
  disabled: false,
  loading: false,
}

function getLimitAction(state: SwapFormState): SwapAction {
  const { input, output, wallet } = state
  if (!wallet.connected) return connectWallet
  if (!input.token || !output.token) return blocked('select-token', 'Select a token')
  const exactAmount = parseAmount(state.exactField === 'input' ? input.amount : output.amount)
  if (!(exactAmount > 0)) return blocked('enter-amount', 'Enter an amount')

  const price = getLimitPrice(state)
  if (!price?.status) return blocked('enter-price', 'Set a limit price')

  const inputAmount = parseAmount(input.amount)
  if (inputAmount > (wallet.balances[input.token.symbol] ?? 0)) {
    return blocked('insufficient-balance', `Not enough ${input.token.symbol}`)
  }
  if (price.status === 'below-market') {
    return blocked('below-market', price.inverted ? 'Above market price' : 'Below market price')
  }
  return { kind: 'place-order', label: 'Place order', variant: 'branded', emphasis: 'primary', disabled: false, loading: false }
}

export function getSwapAction(state: SwapFormState): SwapAction {
  if (state.mode === 'limit') return getLimitAction(state)
  const { input, output, quote, wallet } = state
  const hasTokens = Boolean(input.token && output.token)
  const exactAmount = parseAmount(state.exactField === 'input' ? input.amount : output.amount)
  const hasAmount = Number.isFinite(exactAmount) && exactAmount > 0

  if (hasTokens && hasAmount && quote.status === 'loading') {
    return { ...blocked('finalizing-quote', 'Finalizing quote...'), loading: true }
  }

  if (!wallet.connected) return connectWallet

  if (!hasTokens) return blocked('select-token', 'Select a token')
  if (!hasAmount) return blocked('enter-amount', 'Enter an amount')

  const inputAmount = parseAmount(input.amount)
  const balance = wallet.balances[input.token!.symbol] ?? 0
  if (Number.isFinite(inputAmount) && inputAmount > balance) {
    return blocked('insufficient-balance', `Not enough ${input.token!.symbol}`)
  }

  if (quote.status === 'error') return blocked('no-route', 'No routes available')
  if (quote.status !== 'ready') return blocked('enter-amount', 'Enter an amount')

  const critical = getPriceImpactSeverity(quote.priceImpact) === 'critical'
  return {
    kind: 'review',
    label: 'Review',
    variant: critical ? 'critical' : 'branded',
    emphasis: 'primary',
    disabled: false,
    loading: false,
  }
}
