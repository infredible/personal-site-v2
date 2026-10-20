'use client'

import * as React from 'react'
import { ChevronsDownUp, ChevronsUpDown, Fuel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Shimmer, TextSkeleton } from '../../Skeleton'
import { UniTooltip } from '../../UniTooltip'
import { getPriceImpactSeverity } from '../getSwapAction'
import { formatPercent, formatTokenAmount, formatUsd } from '../format'
import { TOKENS } from '../tokens'
import type { SlippageSettings, SwapQuote, Token } from '../types'
import { SwapRateRow } from './SwapRateRow'
import { TokenLogo } from './TokenLogo'

/*
 * The details area under the swap button. Ported from Uniswap's web form footer:
 * - SwapFormScreenFooter → GasAndWarningRows.web → TradeInfoRow / GasInfoRow:
 *   12px top padding, a row inset 8px with the rate (or a price-difference
 *   warning) on the left and, on the right, the gas pump + network cost
 *   (body3 neutral2) and a ChevronsOut / ChevronsIn toggle. The cost fades out
 *   while expanded since it's repeated below.
 * - ExpandableRows → TransactionDetails: 8px below, rows 8px apart, inset 8px:
 *   (Rate, when price impact warns), Fee, Network cost, Max slippage, Route.
 *   Labels body3 neutral2 (tooltip triggers on hover), values body3 neutral1.
 *   Max slippage gets Uniswap's "Auto" chip (surface3, rounded6, 20px tall).
 * - A "Price difference" row (Uniswap's PriceDifferenceRow from the review
 *   screen) is added last so impact is visible in every state.
 */

const TOOLTIPS = {
  fee: 'Fees are applied to ensure the best experience with Uniswap, and have already been factored into this quote.',
  networkCost:
    'This is the cost to process your transaction on the blockchain. Uniswap does not receive any share of these fees.',
  slippage: 'The maximum price movement before your transaction will revert.',
  route: 'This route considers split routes, multiple hops, and network costs of each step.',
}

interface SwapDetailsProps {
  inputToken: Token
  outputToken: Token
  quote: SwapQuote
  /** Quoted output, in whole tokens (for the fee and minimum received) */
  outputAmount: number
  slippage: SlippageSettings
  /** Baseline a custom slippage is compared against (Uniswap's auto value) */
  autoSlippage?: number
  /** Controlled expanded state; uncontrolled when omitted */
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** Rate direction, passed through to SwapRateRow */
  rateInverted?: boolean
  onRateInvertedChange?: (inverted: boolean) => void
  /** Dims the cost while a refreshed quote loads (Uniswap's 0.6 gas opacity) */
  loading?: boolean
  className?: string
}

/** Uniswap's AlertTriangleFilled: a solid triangle with the mark knocked out. */
function AlertTriangleFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('shrink-0', className)}>
      <path
        d="M10.27 3.98a2 2 0 0 1 3.46 0l8.17 14.02A2 2 0 0 1 20.17 21H3.83a2 2 0 0 1-1.73-3l8.17-14.02Z"
        fill="currentColor"
      />
      <path d="M12 9v4.5" stroke="var(--color-surface1)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.15" fill="var(--color-surface1)" />
    </svg>
  )
}

function Label({ children, tooltip }: { children: React.ReactNode; tooltip?: React.ReactNode }) {
  const label = <span className="text-body3 text-neutral2 select-none">{children}</span>
  if (!tooltip) return label
  return (
    <UniTooltip content={tooltip}>
      <span className="cursor-default text-body3 text-neutral2 select-none">{children}</span>
    </UniTooltip>
  )
}

function Row({ label, tooltip, children }: { label: React.ReactNode; tooltip?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-uni-12">
      <Label tooltip={tooltip}>{label}</Label>
      <div className="flex min-w-0 items-center justify-end gap-uni-8 text-body3 text-neutral1">{children}</div>
    </div>
  )
}

function SwapDetails({
  inputToken,
  outputToken,
  quote,
  outputAmount,
  slippage,
  autoSlippage = 0.005,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  rateInverted,
  onRateInvertedChange,
  loading = false,
  className,
}: SwapDetailsProps) {
  const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded)
  const isExpanded = expanded ?? localExpanded
  const contentId = React.useId()

  const toggle = () => {
    const next = !isExpanded
    setLocalExpanded(next)
    onExpandedChange?.(next)
  }

  const severity = getPriceImpactSeverity(quote.priceImpact)
  const impactColor =
    severity === 'critical' ? 'text-statusCritical' : severity === 'warning' ? 'text-statusWarning' : 'text-neutral1'
  const networkCost = quote.networkFeeUsd !== undefined ? formatUsd(quote.networkFeeUsd) : '-'
  const outputUsd = outputAmount * outputToken.priceUsd
  const feeRate = quote.feeRate ?? 0
  const minReceived = outputAmount * (1 - slippage.value)
  const slippageWarns = !slippage.auto && slippage.value > autoSlippage
  const rate = quote.rate ?? 0

  return (
    <div data-slot="swap-details" className={cn('flex flex-col', className)}>
      {/* Collapsed footer row */}
      <div className="min-h-uni-40 pt-uni-12">
        <div className="flex items-center gap-uni-8 px-uni-8 py-uni-4">
          <div className="flex min-w-0 flex-1">
            {severity === 'none' ? (
              <SwapRateRow
                inputToken={inputToken}
                outputToken={outputToken}
                rate={rate}
                inverted={rateInverted}
                onInvertedChange={onRateInvertedChange}
              />
            ) : (
              <UniTooltip
                content={`You’ll receive ${formatPercent(quote.priceImpact!)} less than your input amount due to trade size and relative liquidity.`}
              >
                <span className={cn('flex min-w-0 cursor-default items-center gap-uni-8 text-body3', impactColor)}>
                  <AlertTriangleFilled className="size-uni-20" />
                  <span className="truncate">Large price difference ({formatPercent(quote.priceImpact!)})</span>
                </span>
              </UniTooltip>
            )}
          </div>

          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={contentId}
            aria-label={isExpanded ? 'Hide swap details' : 'Show swap details'}
            onClick={(event) => {
              event.stopPropagation()
              toggle()
            }}
            className="group/toggle flex shrink-0 cursor-pointer items-center gap-uni-4 text-neutral2 outline-none focus-visible:underline"
          >
            <span
              className={cn(
                'flex items-center gap-uni-4 transition-opacity duration-200 ease-out',
                isExpanded ? 'opacity-0' : loading ? 'opacity-60' : 'opacity-100',
              )}
              aria-hidden={isExpanded || undefined}
            >
              <Fuel aria-hidden strokeWidth={2} className="size-uni-16" />
              <span className="text-body3">{networkCost}</span>
            </span>
            {isExpanded ? (
              <ChevronsDownUp aria-hidden strokeWidth={2} className="size-uni-20 group-hover/toggle:text-neutral2Hovered" />
            ) : (
              <ChevronsUpDown aria-hidden strokeWidth={2} className="size-uni-20 group-hover/toggle:text-neutral2Hovered" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable rows: grid-rows 0fr → 1fr is a height animation without measuring */}
      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.17,0.67,0.45,1)]',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
        inert={!isExpanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-uni-8 flex flex-col gap-uni-8 px-uni-8 pb-uni-4">
            {severity !== 'none' && (
              <Row label="Rate">
                <SwapRateRow
                  styling="primary"
                  inputToken={inputToken}
                  outputToken={outputToken}
                  rate={rate}
                  inverted={rateInverted}
                  onInvertedChange={onRateInvertedChange}
                />
              </Row>
            )}
            <Row label={feeRate > 0 ? `Fee (${formatPercent(feeRate)})` : 'Fee'} tooltip={TOOLTIPS.fee}>
              {feeRate > 0 ? formatUsd(outputUsd * feeRate) : 'Free'}
            </Row>
            <Row label="Network cost" tooltip={TOOLTIPS.networkCost}>
              <TokenLogo token={TOKENS.ETH} size={16} shape="square" />
              <span>{networkCost}</span>
            </Row>
            <Row
              label="Max slippage"
              tooltip={
                <div className="flex flex-col gap-uni-8">
                  <span>{TOOLTIPS.slippage}</span>
                  <span className="flex justify-between gap-uni-12">
                    <span className="text-neutral2">Receive at least</span>
                    <span>
                      {formatTokenAmount(minReceived)} {outputToken.symbol}
                    </span>
                  </span>
                </div>
              }
            >
              {slippage.auto && (
                <span className="flex h-uni-20 items-center rounded-uni-6 bg-surface3 px-uni-8 text-buttonLabel4 leading-[16px] text-neutral1">
                  Auto
                </span>
              )}
              <span className={slippageWarns ? 'text-statusWarning' : undefined}>{formatPercent(slippage.value)}</span>
            </Row>
            {quote.route && (
              <Row label="Route" tooltip={TOOLTIPS.route}>
                <span className="truncate">{quote.route}</span>
              </Row>
            )}
            {quote.priceImpact !== undefined && (
              <Row label="Price difference">
                {severity !== 'none' && <AlertTriangleFilled className={cn('size-uni-16', impactColor)} />}
                <span className={impactColor}>{formatPercent(quote.priceImpact)}</span>
              </Row>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { SwapDetails }
export type { SwapDetailsProps }

/** Collapsed footer while the first quote loads: rate and network cost as skeletons. */
function SwapDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div data-slot="swap-details-skeleton" role="status" aria-label="Loading quote details" className={cn('min-h-uni-40 pt-uni-12', className)}>
      <Shimmer className="flex items-center justify-between gap-uni-8 px-uni-8 py-uni-4">
        <TextSkeleton placeholder="1 USDC = 0.000294 ETH ($1.00)" className="text-body3" />
        <TextSkeleton placeholder="$0.00 ⇕" className="text-body3" />
      </Shimmer>
    </div>
  )
}

export { SwapDetailsSkeleton }
