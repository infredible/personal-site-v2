'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { parseAmount } from './format'
import { getSwapAction, type SwapAction } from './getSwapAction'
import {
  CurrencyPanel,
  SwapActionButton,
  SwapDetails,
  SwapDetailsSkeleton,
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
  /** Shows the chart toggle left of the gear; `chartVisible` sets its pressed state */
  onChartToggle?: () => void
  chartVisible?: boolean
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

export type SwapPartId = 'header' | 'sell' | 'switch' | 'buy' | 'action' | 'details'

export interface SwapFormPart {
  id: SwapPartId
  label: string
  node: React.ReactNode
}

/**
 * The form's parts, top to bottom, each rendered with the same derived props
 * SwapFormView uses. SwapFormView composes them; the canvas's anatomy section
 * lays them out one per frame (and the exploded-view transition flies between
 * the two, matching parts by id).
 */
function useSwapFormParts({
  state,
  onModeChange,
  onSettingsClick,
  onChartToggle,
  chartVisible,
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
}: SwapFormViewProps): SwapFormPart[] {
  const { input, output, quote, wallet, slippage } = state
  const action = getSwapAction(state)

  const balanceOf = (token?: Token) => (token && wallet.connected ? (wallet.balances[token.symbol] ?? 0) : undefined)
  const usdOf = (token: Token | undefined, amount: string) => {
    const value = parseAmount(amount)
    return token && Number.isFinite(value) ? value * token.priceUsd : undefined
  }

  const inputAmount = parseAmount(input.amount)
  const inputBalance = balanceOf(input.token)
  const balancesLoading = Boolean(state.wallet.balancesLoading)
  const insufficient =
    !balancesLoading &&
    inputBalance !== undefined && Number.isFinite(inputAmount) && inputAmount > inputBalance

  const quoting = quote.status === 'loading'
  const derivedField: SwapField = state.exactField === 'input' ? 'output' : 'input'

  // Controlled focus when the state says so (presets) or a parent tracks it; otherwise the panels track their own.
  const focusControlled = state.focusedField !== undefined || Boolean(onFocusField)
  const focusedFor = (field: SwapField) => (focusControlled ? state.focusedField === field : undefined)

  const hasPair = Boolean(input.token && output.token)
  // Keep the details through a refetch (dimmed) instead of collapsing and jumping;
  // the first quote has nothing to show yet, so it gets a skeleton footer.
  const showDetails =
    (quote.status === 'ready' || quoting) && hasPair && parseAmount(output.amount) > 0 && Boolean(quote.rate)
  const showDetailsSkeleton = quoting && hasPair && !showDetails

  const quickSelectTokens = React.useMemo(
    () => COMMON_TOKENS.filter((token) => token.symbol !== input.token?.symbol),
    [input.token?.symbol],
  )

  const parts: SwapFormPart[] = [
    {
      id: 'header',
      label: 'Header',
      node: (
        <SwapHeader
          mode={state.mode}
          onModeChange={onModeChange}
          onSettingsClick={onSettingsClick}
          onChartToggle={onChartToggle}
          chartVisible={chartVisible}
          customSlippage={slippage.auto ? undefined : slippage.value}
          autoSlippage={autoSlippage}
        />
      ),
    },
    {
      id: 'sell',
      label: 'Sell panel',
      node: (
        <CurrencyPanel
          field="input"
          label="Sell"
          token={input.token}
          amount={input.amount}
          usdValue={usdOf(input.token, input.amount)}
          balance={inputBalance}
          focused={focusedFor('input')}
          loading={quoting && derivedField === 'input'}
          balanceLoading={balancesLoading}
          error={insufficient}
          onAmountChange={onAmountChange && ((amount) => onAmountChange('input', amount))}
          onFocus={onFocusField && (() => onFocusField('input'))}
          onTokenClick={onTokenClick && (() => onTokenClick('input'))}
          onMax={onMax}
          onPercent={onPercent}
        />
      ),
    },
    { id: 'switch', label: 'Switch', node: <SwitchButton onClick={onSwitch} /> },
    {
      id: 'buy',
      label: 'Buy panel',
      node: (
        <CurrencyPanel
          field="output"
          label="Buy"
          token={output.token}
          amount={output.amount}
          usdValue={usdOf(output.token, output.amount)}
          priceDifference={hasPair ? quote.priceImpact : undefined}
          balance={balanceOf(output.token)}
          focused={focusedFor('output')}
          loading={quoting && derivedField === 'output'}
          balanceLoading={balancesLoading}
          onAmountChange={onAmountChange && ((amount) => onAmountChange('output', amount))}
          onFocus={onFocusField && (() => onFocusField('output'))}
          onTokenClick={onTokenClick && (() => onTokenClick('output'))}
          quickSelectTokens={onQuickSelect ? quickSelectTokens : undefined}
          onQuickSelect={onQuickSelect}
        />
      ),
    },
    { id: 'action', label: 'Action button', node: <SwapActionButton action={action} onClick={onAction} /> },
  ]

  if (showDetails) {
    parts.push({
      id: 'details',
      label: 'Details',
      node: (
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
          loading={quoting}
        />
      ),
    })
  } else if (showDetailsSkeleton) {
    parts.push({ id: 'details', label: 'Details', node: <SwapDetailsSkeleton /> })
  }

  return parts
}

function SwapFormView({ className, ...props }: SwapFormViewProps) {
  const parts = useSwapFormParts(props)
  // data-explode marks each part for the showcase's exploded-view transition
  const part = (id: SwapPartId, className?: string) => {
    const found = parts.find((p) => p.id === id)
    return found ? (
      <div data-explode={id} className={className}>
        {found.node}
      </div>
    ) : null
  }

  return (
    <div data-slot="swap-form" className={cn('flex w-full max-w-[480px] flex-col', className)}>
      {part('header', 'mb-uni-4')}

      <div className="flex flex-col gap-uni-4">
        <div className="flex flex-col gap-uni-2">
          {part('sell')}
          <SwitchButtonSeam>{part('switch')}</SwitchButtonSeam>
          {part('buy')}
        </div>

        <div className="flex flex-col">
          {part('action')}
          {part('details')}
        </div>
      </div>
    </div>
  )
}

export { SwapFormView, useSwapFormParts }
export type { SwapFormViewProps }
