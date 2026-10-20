'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { parseAmount } from './format'
import { getSwapAction, type SwapAction } from './getSwapAction'
import {
  CurrencyPanel,
  SwapActionButton,
  SwapDetails,
  SwapHeader,
  SwitchButton,
  SwitchButtonSeam,
} from './parts'
import { COMMON_TOKENS, DEFAULT_SLIPPAGE } from './tokens'
import type { SwapField, SwapFormState, SwapMode, Token } from './types'

/*
 * The Uniswap web swap form, composed from the parts. Mirrors
 * SwapFormScreen → SwapFormContent (packages/uniswap/src/features/transactions/swap/form/SwapFormScreen/SwapFormScreen.tsx)
 * under apps/web's SwapHeaderTabRow:
 *
 *   header tabs + gear
 *   [Sell panel] 2px [zero-height switch row] 2px [Buy panel]   ← 4px seam, arrow centered on it
 *   4px
 *   Review button, footer (rate · gas · toggle), expandable rows
 *
 * Purely presentational: renders from a SwapFormState and reports events. With
 * no callbacks it's a static snapshot (inputs read-only). The only internal
 * state is UI trivia owned by the parts (details expansion, rate direction)
 * when those aren't controlled from here.
 */

interface SwapFormViewProps {
  state: SwapFormState
  onModeChange?: (mode: SwapMode) => void
  onSettingsClick?: () => void
  onAmountChange?: (field: SwapField, amount: string) => void
  /** Uniswap keeps the last-focused field highlighted, so this only reports focus, never blur. */
  onFocusField?: (field: SwapField) => void
  onTokenClick?: (field: SwapField) => void
  onMax?: () => void
  /** Sell-panel 25 / 50 / 75% presets, as a fraction of balance */
  onPercent?: (fraction: number) => void
  /** Quick-pick chips on an empty Buy panel */
  onQuickSelect?: (token: Token) => void
  onSwitch?: () => void
  onAction?: (action: SwapAction) => void
  detailsExpanded?: boolean
  onDetailsExpandedChange?: (expanded: boolean) => void
  rateInverted?: boolean
  onRateInvertedChange?: (inverted: boolean) => void
  /** Baseline for custom-slippage warnings (Uniswap's auto slippage) */
  autoSlippage?: number
  className?: string
}

function SwapFormView({
  state,
  onModeChange,
  onSettingsClick,
  onAmountChange,
  onFocusField,
  onTokenClick,
  onMax,
  onPercent,
  onQuickSelect,
  onSwitch,
  onAction,
  detailsExpanded,
  onDetailsExpandedChange,
  rateInverted,
  onRateInvertedChange,
  autoSlippage = DEFAULT_SLIPPAGE.value,
  className,
}: SwapFormViewProps) {
  const { input, output, quote, wallet, slippage } = state
  const action = getSwapAction(state)

  const balanceOf = (token?: Token) => (token && wallet.connected ? (wallet.balances[token.symbol] ?? 0) : undefined)
  const usdOf = (token: Token | undefined, amount: string) => {
    const value = parseAmount(amount)
    return token && Number.isFinite(value) ? value * token.priceUsd : undefined
  }

  const inputAmount = parseAmount(input.amount)
  const inputBalance = balanceOf(input.token)
  const insufficient =
    inputBalance !== undefined && Number.isFinite(inputAmount) && inputAmount > inputBalance

  const quoting = quote.status === 'loading'
  const derivedField: SwapField = state.exactField === 'input' ? 'output' : 'input'

  // Controlled focus when the state says so (presets) or a parent tracks it; otherwise the panels track their own.
  const focusControlled = state.focusedField !== undefined || Boolean(onFocusField)
  const focusedFor = (field: SwapField) => (focusControlled ? state.focusedField === field : undefined)

  const showDetails =
    quote.status === 'ready' && Boolean(input.token && output.token) && parseAmount(output.amount) > 0 && quote.rate

  const quickSelectTokens = React.useMemo(
    () => COMMON_TOKENS.filter((token) => token.symbol !== input.token?.symbol),
    [input.token?.symbol],
  )

  return (
    <div data-slot="swap-form" className={cn('flex w-full max-w-[480px] flex-col', className)}>
      <SwapHeader
        mode={state.mode}
        onModeChange={onModeChange}
        onSettingsClick={onSettingsClick}
        customSlippage={slippage.auto ? undefined : slippage.value}
        autoSlippage={autoSlippage}
        className="mb-uni-4"
      />

      <div className="flex flex-col gap-uni-4">
        <div className="flex flex-col gap-uni-2">
          <CurrencyPanel
            field="input"
            label="Sell"
            token={input.token}
            amount={input.amount}
            usdValue={usdOf(input.token, input.amount)}
            balance={inputBalance}
            focused={focusedFor('input')}
            loading={quoting && derivedField === 'input'}
            error={insufficient}
            onAmountChange={onAmountChange && ((amount) => onAmountChange('input', amount))}
            onFocus={onFocusField && (() => onFocusField('input'))}
            onTokenClick={onTokenClick && (() => onTokenClick('input'))}
            onMax={onMax}
            onPercent={onPercent}
          />
          <SwitchButtonSeam>
            <SwitchButton onClick={onSwitch} />
          </SwitchButtonSeam>
          <CurrencyPanel
            field="output"
            label="Buy"
            token={output.token}
            amount={output.amount}
            usdValue={usdOf(output.token, output.amount)}
            balance={balanceOf(output.token)}
            focused={focusedFor('output')}
            loading={quoting && derivedField === 'output'}
            onAmountChange={onAmountChange && ((amount) => onAmountChange('output', amount))}
            onFocus={onFocusField && (() => onFocusField('output'))}
            onTokenClick={onTokenClick && (() => onTokenClick('output'))}
            quickSelectTokens={onQuickSelect ? quickSelectTokens : undefined}
            onQuickSelect={onQuickSelect}
          />
        </div>

        <div className="flex flex-col">
          <SwapActionButton action={action} onClick={onAction} />
          {showDetails && (
            <SwapDetails
              inputToken={input.token!}
              outputToken={output.token!}
              quote={quote}
              outputAmount={parseAmount(output.amount)}
              slippage={slippage}
              autoSlippage={autoSlippage}
              expanded={detailsExpanded}
              onExpandedChange={onDetailsExpandedChange}
              rateInverted={rateInverted}
              onRateInvertedChange={onRateInvertedChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export { SwapFormView }
export type { SwapFormViewProps }
