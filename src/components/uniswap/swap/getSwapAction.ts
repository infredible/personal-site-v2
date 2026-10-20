import { parseAmount } from './format'
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

export function getSwapAction(state: SwapFormState): SwapAction {
  const { input, output, quote, wallet } = state
  const hasTokens = Boolean(input.token && output.token)
  const exactAmount = parseAmount(state.exactField === 'input' ? input.amount : output.amount)
  const hasAmount = Number.isFinite(exactAmount) && exactAmount > 0

  if (hasTokens && hasAmount && quote.status === 'loading') {
    return { ...blocked('finalizing-quote', 'Finalizing quote...'), loading: true }
  }

  if (!wallet.connected) {
    return {
      kind: 'connect-wallet',
      label: 'Connect wallet',
      variant: 'branded',
      emphasis: 'secondary',
      disabled: false,
      loading: false,
    }
  }

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
