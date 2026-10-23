'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUpRight, ArrowsLeftRight, ChevronsIn, ChevronsOut, X } from '../../icons'
import { cn } from '@/lib/utils'
import { Pill } from '../../Pill'
import { UniButton } from '../../UniButton'
import { formatPercent, formatTokenAmount, formatUsd, parseAmount } from '../format'
import { DEFAULT_SLIPPAGE, TOKENS } from '../tokens'
import type { SlippageSettings, SwapQuote, Token } from '../types'
import { AlertTriangleFilled, Separator, TokenLogo } from './shared'

/*
 * Swap review / confirm content, ported from Uniswap's review screen
 * (packages/uniswap/src/features/transactions/swap/review/SwapReviewScreen:
 * SwapReviewScreen.tsx, TransactionAmountsReview.tsx, SwapReviewFooter/SubmitSwapButton.tsx;
 * review/SwapDetails/SwapDetails.tsx; features/transactions/TransactionDetails/
 * TransactionDetails.tsx, ListSeparatorToggle.tsx, SwapFee.tsx; swap/components/
 * MaxSlippageRow, PriceDifferenceRow; and the pending steps from
 * components/ConfirmSwapModal/ProgressIndicator.tsx + steps/StepRowSkeleton.tsx).
 *
 * The panel draws its own header ("You're swapping" + close), so place it in a
 * <ModalSurface> without a title (or <UniModalContent> with an sr-only title).
 */

export type SwapReviewStatus = 'review' | 'pending' | 'success'

export interface SwapReviewSide {
  token: Token
  /** Whole-token amount; strings are parsed like the swap form's inputs ("1,234.5"). */
  amount: number | string
}

export interface SwapReviewPanelProps {
  input: SwapReviewSide
  output: SwapReviewSide
  quote: SwapQuote
  slippage: SlippageSettings
  status?: SwapReviewStatus
  /** Pending sub-state: waiting on the wallet, or submitted and waiting on chain. */
  pendingStage?: 'wallet' | 'submitted'
  /** Adds a completed token-approval step before the swap step. Defaults to true for non-ETH input. */
  needsApproval?: boolean
  /** Auto slippage for this trade, as a fraction; custom slippage above it is flagged. */
  autoSlippage?: number
  /** Details start expanded. Uniswap expands them when slippage is custom. */
  defaultDetailsExpanded?: boolean
  onConfirm?: () => void
  onClose?: () => void
  /** "View on Explorer" target on the success screen. */
  explorerHref?: string
  className?: string
}

function toNumber(amount: number | string): number {
  const n = typeof amount === 'number' ? amount : parseAmount(amount)
  return Number.isFinite(n) ? n : 0
}

const PRICE_IMPACT_WARNING = 0.03
const PRICE_IMPACT_CRITICAL = 0.05

export function SwapReviewPanel({
  input,
  output,
  quote,
  slippage,
  status = 'review',
  pendingStage = 'wallet',
  needsApproval,
  autoSlippage = DEFAULT_SLIPPAGE.value,
  defaultDetailsExpanded,
  onConfirm,
  onClose,
  explorerHref = 'https://etherscan.io',
  className,
}: SwapReviewPanelProps) {
  const inAmount = toNumber(input.amount)
  const outAmount = toNumber(output.amount)

  if (status === 'success') {
    return (
      <SwapSuccess
        input={{ token: input.token, amount: inAmount }}
        output={{ token: output.token, amount: outAmount }}
        explorerHref={explorerHref}
        onClose={onClose}
        className={className}
      />
    )
  }

  const approval = needsApproval ?? input.token.symbol !== 'ETH'

  return (
    <div className={cn('flex flex-col gap-uni-16 pt-uni-8', className)}>
      <div className="flex flex-col gap-uni-16 px-uni-8">
        <div className="flex items-center justify-between gap-uni-12">
          <h2 className="text-body2 text-neutral2">You’re swapping</h2>
          {onClose && <CloseButton onClick={onClose} />}
        </div>
        <AmountRow token={input.token} amount={inAmount} />
        <ArrowDown aria-hidden className="size-uni-20 text-neutral3" />
        <AmountRow token={output.token} amount={outAmount} />
      </div>

      {status === 'pending' ? (
        <PendingSteps input={input.token} approval={approval} stage={pendingStage} />
      ) : (
        <SwapDetails
          input={input.token}
          output={output.token}
          outAmount={outAmount}
          quote={quote}
          slippage={slippage}
          autoSlippage={autoSlippage}
          defaultExpanded={defaultDetailsExpanded ?? !slippage.auto}
        />
      )}

      <div className="flex pt-uni-4">
        {status === 'pending' ? (
          <UniButton size="large" fill loading>
            {pendingStage === 'wallet' ? 'Confirm in wallet' : 'Submitting swap...'}
          </UniButton>
        ) : (
          <UniButton
            variant="branded"
            size="large"
            fill
            disabled={quote.status !== 'ready'}
            loading={quote.status === 'loading'}
            onClick={onConfirm}
          >
            {quote.status === 'loading' ? 'Finalizing quote...' : 'Swap'}
          </UniButton>
        )}
      </div>
    </div>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mr-uni-4 flex size-uni-28 shrink-0 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 outline-none transition-colors hover:bg-surface2 hover:text-neutral1 focus-visible:bg-surface2 focus-visible:text-neutral1"
    >
      <X className="size-uni-20" />
      <span className="sr-only">Close</span>
    </button>
  )
}

/** CurrencyValueWithIcon: heading3 amount + symbol, body2 fiat, 40px logo on the right. */
function AmountRow({ token, amount }: { token: Token; amount: number }) {
  return (
    <div className="flex items-center gap-uni-12">
      <div className="flex min-w-0 flex-1 flex-col gap-uni-4">
        <span className="truncate text-heading3 text-neutral1">
          {formatTokenAmount(amount)} {token.symbol}
        </span>
        <span className="text-body2 text-neutral2">{formatUsd(amount * token.priceUsd)}</span>
      </div>
      <TokenLogo token={token} size={40} />
    </div>
  )
}

function DetailRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-uni-12 text-body3">
      <span className="text-neutral2">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-uni-6 text-right text-neutral1">{children}</span>
    </div>
  )
}

function SwapDetails({
  input,
  output,
  outAmount,
  quote,
  slippage,
  autoSlippage,
  defaultExpanded,
}: {
  input: Token
  output: Token
  outAmount: number
  quote: SwapQuote
  slippage: SlippageSettings
  autoSlippage: number
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const [inverted, setInverted] = React.useState(false)
  const rate = quote.rate ?? (input.priceUsd / output.priceUsd)
  const priceImpact = quote.priceImpact ?? 0
  const impactTone =
    priceImpact >= PRICE_IMPACT_CRITICAL ? 'critical' : priceImpact >= PRICE_IMPACT_WARNING ? 'warning' : undefined
  const feeRate = quote.feeRate ?? 0
  const slippageHigh = !slippage.auto && slippage.value > autoSlippage

  const [base, quoteToken, ratio] = inverted ? [output, input, 1 / rate] : [input, output, rate]

  const priceImpactRow = (
    <DetailRow label="Price impact">
      {impactTone && (
        <AlertTriangleFilled className={impactTone === 'critical' ? 'text-statusCritical' : 'text-statusWarning'} />
      )}
      <span
        className={cn(
          impactTone === 'critical' && 'text-statusCritical',
          impactTone === 'warning' && 'text-statusWarning',
        )}
      >
        {formatPercent(priceImpact)}
      </span>
    </DetailRow>
  )

  return (
    <div className="flex flex-col">
      {/* ListSeparatorToggle */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="group/toggle mb-uni-16 flex cursor-pointer items-center gap-uni-16 rounded-uni-8 py-uni-8 outline-none focus-visible:ring-1 focus-visible:ring-neutral3"
      >
        <Separator />
        <span className="flex items-center gap-uni-4 pl-uni-4 text-body3 text-neutral2 transition-colors group-hover/toggle:text-neutral2Hovered">
          {expanded ? 'Show less' : 'Show more'}
          {expanded ? (
            <ChevronsIn aria-hidden className="size-uni-16" />
          ) : (
            <ChevronsOut aria-hidden className="size-uni-16" />
          )}
        </span>
        <Separator />
      </button>

      <div className="flex flex-col gap-uni-8 px-uni-4">
        {expanded && (
          <DetailRow label="Rate">
            <button
              type="button"
              onClick={() => setInverted((v) => !v)}
              title="Flip rate"
              className="group/rate flex min-w-0 cursor-pointer items-center gap-uni-4 rounded-uni-4 outline-none focus-visible:ring-1 focus-visible:ring-neutral3"
            >
              <span className="truncate">
                1 {base.symbol} = {formatTokenAmount(ratio)} {quoteToken.symbol}
              </span>
              <span className="text-neutral2">({formatUsd(base.priceUsd)})</span>
              <ArrowsLeftRight
                aria-hidden
                className="size-uni-12 text-neutral3 transition-colors group-hover/rate:text-neutral2"
              />
            </button>
          </DetailRow>
        )}
        <DetailRow label={feeRate > 0 ? `Fee (${formatPercent(feeRate)})` : 'Fee'}>
          {feeRate > 0 ? formatUsd(outAmount * output.priceUsd * feeRate) : 'Free'}
        </DetailRow>
        <DetailRow label="Network cost">
          <TokenLogo token={TOKENS.ETH} size={16} />
          {formatUsd(quote.networkFeeUsd ?? 0)}
        </DetailRow>
        {!expanded && impactTone && priceImpactRow}
        {expanded && (
          <>
            <DetailRow label="Max slippage">
              {slippage.auto && (
                <Pill className="h-uni-20 rounded-uni-6 bg-surface3 text-neutral1">Auto</Pill>
              )}
              <span className={cn(slippageHigh && 'text-statusWarning')}>{formatPercent(slippage.value)}</span>
            </DetailRow>
            <DetailRow label="Order routing">{quote.route ?? 'Uniswap API'}</DetailRow>
            {priceImpactRow}
          </>
        )}
      </div>
    </div>
  )
}

type StepStatus = 'complete' | 'active' | 'inProgress'

/** ProgressIndicator: "Continue in your wallet" divider, then step rows joined by a dotted line. */
function PendingSteps({ input, approval, stage }: { input: Token; approval: boolean; stage: 'wallet' | 'submitted' }) {
  const swapStatus: StepStatus = stage === 'wallet' ? 'active' : 'inProgress'
  const steps = [
    ...(approval
      ? [{ key: 'approve', icon: <TokenLogo token={input} size={24} />, title: `Approved ${input.symbol}`, status: 'complete' as const }]
      : []),
    {
      key: 'swap',
      icon: (
        // Uniswap's swap step glyph: white arrows on a fixed blue disc
        <span className="flex size-uni-24 items-center justify-center rounded-uni-full bg-[#4C82FB] text-white">
          <ArrowsLeftRight aria-hidden className="size-uni-12" />
        </span>
      ),
      title: swapStatus === 'active' ? 'Confirm swap in wallet' : 'Swap pending...',
      status: swapStatus,
    },
  ]

  return (
    <div className="flex flex-col gap-uni-16">
      <div className="flex items-center gap-uni-12 py-uni-4">
        <Separator />
        <span className="text-body3 text-neutral2">Continue in your wallet</span>
        <Separator />
      </div>
      <ol className="relative flex flex-col pr-uni-8">
        {steps.map((step, i) => (
          <li key={step.key} className="relative">
            <StepRow
              icon={step.icon}
              title={step.title}
              status={step.status}
              stepIndex={i}
              stepCount={steps.length}
            />
            {i < steps.length - 1 && (
              // Dotted connector between step icons (VerticalDottedLineSeparator)
              <span
                aria-hidden
                className="absolute top-[34px] left-[19px] h-[16px] w-[2px] bg-[radial-gradient(circle,var(--uni-neutral3)_1px,transparent_1.2px)] bg-[length:2px_4px]"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function StepRow({
  icon,
  title,
  status,
  stepIndex,
  stepCount,
}: {
  icon: React.ReactNode
  title: string
  status: StepStatus
  stepIndex: number
  stepCount: number
}) {
  const current = status !== 'complete'
  return (
    <div className="flex items-center justify-between gap-uni-8">
      <div className={cn('flex min-w-0 flex-1 items-center gap-uni-8', !current && 'py-uni-8')}>
        {/* 40px layout box around a 24px icon, room for the ripple / spinner */}
        <span className="relative flex size-uni-40 shrink-0 items-center justify-center">
          {status === 'active' && (
            <span aria-hidden className="absolute size-uni-24 animate-ping rounded-uni-full bg-accent1 opacity-30 motion-reduce:animate-none" />
          )}
          {status === 'inProgress' && (
            <span
              aria-hidden
              className="absolute inset-uni-4 animate-spin rounded-uni-full border-2 border-surface3 border-t-accent1"
            />
          )}
          <span className={cn('relative flex', !current && 'opacity-40 grayscale')}>{icon}</span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={current ? 'text-body2 text-neutral1' : 'text-body3 text-neutral2'}>{title}</span>
          {status === 'active' && (
            <a
              href="https://support.uniswap.org/hc/en-us/articles/8370549680909-How-to-swap-tokens"
              target="_blank"
              rel="noreferrer"
              className="text-body4 text-accent1 hover:text-accent1Hovered"
            >
              Learn more about swaps
            </a>
          )}
        </span>
      </div>
      <span className="shrink-0">
        {status === 'complete' ? (
          <CheckCircle className="size-uni-20 text-statusSuccess" />
        ) : (
          <span className="text-body4 text-neutral3">
            Step {stepIndex + 1} of {stepCount}
          </span>
        )}
      </span>
    </div>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-label="Complete" className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20Zm4.7 7.2a1 1 0 0 0-1.4-1.4L10.5 12.6l-1.8-1.8a1 1 0 1 0-1.4 1.4l2.5 2.5a1 1 0 0 0 1.4 0Z"
      />
    </svg>
  )
}

function SwapSuccess({
  input,
  output,
  explorerHref,
  onClose,
  className,
}: {
  input: { token: Token; amount: number }
  output: { token: Token; amount: number }
  explorerHref: string
  onClose?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-uni-16 pt-uni-8', className)}>
      <div className="flex h-uni-28 items-center justify-end px-uni-8">{onClose && <CloseButton onClick={onClose} />}</div>
      <div className="flex flex-col items-center gap-uni-16 px-uni-8 pb-uni-8 text-center">
        <AnimatedCheck />
        <div className="flex flex-col items-center gap-uni-8">
          <h2 className="text-heading3 text-neutral1">Swap success!</h2>
          <p className="flex flex-wrap items-center justify-center gap-x-uni-6 gap-y-uni-4 text-body2 text-neutral2">
            <span className="flex items-center gap-uni-6 text-neutral1">
              <TokenLogo token={input.token} size={20} />
              {formatTokenAmount(input.amount)} {input.token.symbol}
            </span>
            <span>for</span>
            <span className="flex items-center gap-uni-6 text-neutral1">
              <TokenLogo token={output.token} size={20} />
              {formatTokenAmount(output.amount)} {output.token.symbol}
            </span>
          </p>
        </div>
        <a
          href={explorerHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-uni-4 rounded-uni-8 text-buttonLabel3 text-accent1 outline-none transition-colors hover:text-accent1Hovered focus-visible:ring-1 focus-visible:ring-accent1"
        >
          View on Explorer
          <ArrowUpRight aria-hidden className="size-uni-16" />
        </a>
      </div>
      <div className="flex pt-uni-4">
        <UniButton emphasis="secondary" size="large" fill onClick={onClose}>
          Close
        </UniButton>
      </div>
    </div>
  )
}

/** Success glyph: ring and check draw in, as Uniswap's AnimatedConfirmation does. */
function AnimatedCheck() {
  // Reduced motion: show the finished glyph rather than drawing it
  const reduceMotion = useReducedMotion()
  const draw = (delay: number) => ({
    initial: { pathLength: reduceMotion ? 1 : 0 },
    animate: { pathLength: 1 },
    transition: { duration: 0.5, delay, ease: [0.65, 0, 0.35, 1] as const },
  })
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className="size-[64px] text-statusSuccess">
      <circle cx="32" cy="32" r="30" className="fill-statusSuccess2" />
      <motion.circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" {...draw(0)} />
      <motion.path
        d="M20 33l8 8 16-17"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(0.35)}
      />
    </svg>
  )
}
