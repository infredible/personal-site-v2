'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUpRight, Check, CheckCircleFilled, InfoCircle, X } from '../../icons'
import { Pill } from '../../Pill'
import { UniButton } from '../../UniButton'
import { UniTooltip } from '../../UniTooltip'
import { modalSurfaceClassName } from '../../UniModal'
import { formatPercent, formatTokenAmount, formatUsd } from '../format'
import { AlertTriangleFilled, Separator, TokenLogo } from '../overlays/shared'
import { TOKENS } from '../tokens'
import type { Token } from '../types'
import { AutoHeight, Spinner, useReviewMotion } from './motion'
import {
  getReviewAction,
  getReviewSteps,
  type ReviewAction,
  type ReviewFlowState,
  type ReviewPhase,
  type ReviewStep,
  type ReviewTrade,
} from './useReviewFlow'

/*
 * The redesigned review → confirm flow: ONE surface that morphs between
 * states instead of swapping screens.
 *
 *   ┌ header      title follows the phase; fixed height              ┐
 *   │ amounts     the anchor: same nodes, same place, in every state  │
 *   │ ─────────── hairline                                            │
 *   │ region      details while reviewing ⇄ steps once committed;     │
 *   │             height morphs, contents crossfade                   │
 *   └ action      one button, relabelled; never replaced              ┘
 *
 * The card is top-anchored (as Uniswap's modal is), so a height change only
 * ever moves the bottom edge: the amounts never move. Presentational: render
 * it from a ReviewFlowState (useReviewFlow plays one), wire `onAction`.
 *
 * Each part carries `data-explode` for the showcase's exploded-view transition.
 */

export interface ReviewSurfaceProps {
  trade: ReviewTrade
  state: ReviewFlowState
  /** The main button was pressed, with what it was asking for. */
  onAction?: (action: ReviewAction) => void
  onClose?: () => void
  explorerHref?: string
  className?: string
}

export function ReviewSurface({ trade, state, onAction, onClose, explorerHref, className }: ReviewSurfaceProps) {
  return (
    <div data-slot="review-surface" className={cn(modalSurfaceClassName, 'relative', className)}>
      <div data-explode="header">
        <ReviewHeader phase={state.phase} onClose={onClose} />
      </div>
      <div data-explode="amounts">
        <ReviewAmounts trade={trade} state={state} />
      </div>
      <ReviewBody trade={trade} state={state} explorerHref={explorerHref} />
      <div data-explode="action">
        <ReviewButton trade={trade} state={state} onAction={onAction} />
      </div>
      <span role="status" className="sr-only">
        {announcement(trade, state)}
      </span>
    </div>
  )
}

function announcement(trade: ReviewTrade, state: ReviewFlowState): string {
  const { input, output } = trade
  switch (state.phase) {
    case 'approve':
      return `Approve ${input.token.symbol} in your wallet`
    case 'sign':
      return 'Confirm the swap in your wallet'
    case 'pending':
      return 'Swap submitted, confirming'
    case 'success':
      return `Swapped ${formatTokenAmount(input.amount)} ${input.token.symbol} for ${formatTokenAmount(state.acceptedOutput)} ${output.token.symbol}`
    case 'rejected':
      return 'Request declined in your wallet. Nothing was sent.'
    default:
      return state.updatedOutput !== null ? 'Price updated. Accept the new price to continue.' : ''
  }
}

/* Header ------------------------------------------------------------------ */

const TITLES: Record<ReviewPhase, string> = {
  review: 'You’re swapping',
  approve: 'You’re swapping',
  sign: 'You’re swapping',
  rejected: 'You’re swapping',
  pending: 'Swapping',
  success: 'You swapped',
}

/** Title + close. Fixed height: a title change can't nudge the amounts below. */
export function ReviewHeader({ phase, onClose }: { phase: ReviewPhase; onClose?: () => void }) {
  const m = useReviewMotion()
  return (
    <div className="flex h-uni-28 items-center justify-between gap-uni-12 pl-uni-8">
      <h2 className="relative text-body2 text-neutral2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={TITLES[phase]} className="block whitespace-nowrap" {...m.swap}>
            {TITLES[phase]}
          </motion.span>
        </AnimatePresence>
      </h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="-mr-uni-4 flex size-uni-28 shrink-0 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 outline-none transition-colors hover:bg-surface2 hover:text-neutral1 focus-visible:bg-surface2 focus-visible:text-neutral1"
        >
          <X className="size-uni-20" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  )
}

/* Amounts (the anchor) ---------------------------------------------------- */

/**
 * Sell, a connector, Buy. Mounted once and never re-keyed: state changes only
 * touch the connector glyph and a badge on the Buy logo, both in fixed boxes.
 */
export function ReviewAmounts({ trade, state }: { trade: ReviewTrade; state: ReviewFlowState }) {
  const success = state.phase === 'success'
  return (
    <div className="flex flex-col gap-uni-12 px-uni-8">
      <AmountRow token={trade.input.token} amount={trade.input.amount} />
      <Connector success={success} />
      <AmountRow token={trade.output.token} amount={state.acceptedOutput} received={success} />
    </div>
  )
}

function AmountRow({ token, amount, received = false }: { token: Token; amount: number; received?: boolean }) {
  const m = useReviewMotion()
  const formatted = `${formatTokenAmount(amount)} ${token.symbol}`
  return (
    <div className="flex items-center gap-uni-12">
      <div className="flex min-w-0 flex-1 flex-col gap-uni-4">
        {/* An accepted re-quote changes the number in place */}
        <span className="relative block h-[28px] text-heading3 text-neutral1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={formatted} className="block truncate" {...m.swap}>
              {formatted}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="relative block h-[22px] text-body2 text-neutral2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={amount} className="block truncate" {...m.swap}>
              {formatUsd(amount * token.priceUsd)}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
      <span className="relative shrink-0">
        <TokenLogo token={token} size={40} />
        <AnimatePresence initial={false}>
          {received && (
            <motion.span
              key="received"
              className="absolute -right-uni-2 -bottom-uni-2 flex size-[18px] items-center justify-center rounded-uni-full bg-statusSuccess text-white ring-2 ring-surface1"
              {...m.pop}
              animate={{ ...m.pop.animate, transition: { ...m.pop.animate.transition, delay: m.reduce ? 0 : 0.16 } }}
            >
              <Check className="size-uni-12" />
              <span className="sr-only">Received</span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  )
}

/**
 * The arrow between the amounts. On success it becomes the check: the disc
 * tints green, the arrow blurs out, the check draws in, and one soft ring
 * pulses out. The richest moment in the flow, and still ~600ms.
 */
function Connector({ success }: { success: boolean }) {
  const m = useReviewMotion()
  return (
    <div className="flex h-uni-24 items-center">
      <span
        className={cn(
          'relative flex size-uni-24 items-center justify-center rounded-uni-full transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
          success ? 'bg-statusSuccess2 text-statusSuccess' : 'bg-surface2 text-neutral2',
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {success ? (
            <motion.span key="check" className="relative flex" {...m.swap}>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-uni-16">
                <motion.path
                  d="M4 8.5l2.6 2.6L12 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: m.reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.36, delay: 0.08, ease: [0.65, 0, 0.35, 1] }}
                />
              </svg>
              {!m.reduce && (
                <motion.span
                  aria-hidden
                  className="absolute top-1/2 left-1/2 size-uni-24 -translate-1/2 rounded-uni-full border border-statusSuccess"
                  initial={{ opacity: 0.5, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.9 }}
                  transition={{ duration: 0.6, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
                />
              )}
            </motion.span>
          ) : (
            <motion.span key="arrow" className="flex" {...m.swap}>
              <ArrowDown className="size-[14px]" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  )
}

/* Region: details ⇄ steps ------------------------------------------------- */

/**
 * The part of the card that changes shape. Details while reviewing; once you
 * commit they collapse away (you've read them) and the steps take their place.
 */
function ReviewBody({
  trade,
  state,
  explorerHref,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
  explorerHref?: string
}) {
  const m = useReviewMotion()
  const reviewing = state.phase === 'review'
  return (
    <div className="flex flex-col">
      <Separator className="mx-uni-8 flex-none" />
      <AutoHeight>
        <AnimatePresence mode="popLayout" initial={false}>
          {reviewing ? (
            <motion.div key="details" className="w-full pt-uni-16" {...m.region}>
              <div data-explode="details">
                <ReviewDetails trade={trade} state={state} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="steps" className="w-full pt-uni-16" {...m.region}>
              <div data-explode="steps">
                <ReviewSteps trade={trade} state={state} explorerHref={explorerHref} stagger />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AutoHeight>
    </div>
  )
}

function DetailRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-uni-20 items-center justify-between gap-uni-12 text-body3">
      <span className="flex items-center gap-uni-4 text-neutral2">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-uni-6 text-right text-neutral1">{children}</span>
    </div>
  )
}

/** What you're agreeing to: rate, costs, slippage, and an approval if one's needed. */
export function ReviewDetails({ trade, state }: { trade: ReviewTrade; state: ReviewFlowState }) {
  const m = useReviewMotion()
  const { input, output, quote, slippage } = trade
  const rate = state.acceptedOutput / input.amount
  const feeRate = quote.feeRate ?? 0
  const approval = state.needsApproval && !state.approved
  const networkFee = (quote.networkFeeUsd ?? 0) + (approval ? 1.86 : 0)
  const updated = state.updatedOutput

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {updated !== null && (
          <motion.div key="price" className="pb-uni-12" {...m.region}>
            <PriceUpdatedRow token={output.token} previous={state.acceptedOutput} next={updated} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-uni-8 px-uni-8">
        <DetailRow label="Rate">
          <span className="truncate">
            1 {input.token.symbol} = {formatTokenAmount(rate)} {output.token.symbol}
          </span>
        </DetailRow>
        <DetailRow label={feeRate > 0 ? `Fee (${formatPercent(feeRate)})` : 'Fee'}>
          {feeRate > 0 ? formatUsd(state.acceptedOutput * output.token.priceUsd * feeRate) : 'Free'}
        </DetailRow>
        <DetailRow label="Network cost">
          <TokenLogo token={TOKENS.ETH} size={16} />
          {formatUsd(networkFee)}
        </DetailRow>
        <DetailRow label="Max slippage">
          {slippage.auto && <Pill className="h-uni-20 rounded-uni-6 bg-surface3 text-neutral1">Auto</Pill>}
          {formatPercent(slippage.value)}
        </DetailRow>
        {approval && (
          <DetailRow
            label={
              <>
                Approval
                <UniTooltip
                  content={`A one-time permission that lets Uniswap move your ${input.token.symbol}. Approved once per token; the network cost above includes it.`}
                >
                  <button
                    type="button"
                    className="flex cursor-help rounded-uni-full text-neutral3 outline-none hover:text-neutral2 focus-visible:text-neutral2"
                  >
                    <InfoCircle className="size-[14px]" />
                    <span className="sr-only">What’s an approval?</span>
                  </button>
                </UniTooltip>
              </>
            }
          >
            <TokenLogo token={input.token} size={16} />
            One-time, before the swap
          </DetailRow>
        )}
      </div>
    </div>
  )
}

/** Uniswap's AcceptNewQuoteRow, without its own button: the main button asks for the accept. */
function PriceUpdatedRow({ token, previous, next }: { token: Token; previous: number; next: number }) {
  const change = (next - previous) / previous
  return (
    <div className="flex items-center justify-between gap-uni-12 rounded-uni-16 border border-surface3 py-uni-8 pr-uni-8 pl-uni-12">
      <div className="flex min-w-0 flex-col">
        <span className="text-body3 text-neutral2">Price updated</span>
        <span className="truncate text-body3 text-neutral1">
          {formatTokenAmount(next)} {token.symbol}
        </span>
      </div>
      <Pill tone={change < 0 ? 'warning' : 'success'} className="text-buttonLabel4">
        {change > 0 ? '+' : ''}
        {formatPercent(change)}
      </Pill>
    </div>
  )
}

/* Steps ------------------------------------------------------------------- */

function stepTitle(step: ReviewStep, token: Token): string {
  const { id, status } = step
  if (id === 'approve') {
    if (status === 'complete') return `${token.symbol} approved`
    if (status === 'error') return 'Approval declined in wallet'
    if (status === 'active') return `Approve ${token.symbol} in wallet`
    return `Approve ${token.symbol}`
  }
  if (id === 'sign') {
    if (status === 'complete') return 'Swap signed'
    if (status === 'error') return 'Signature declined in wallet'
    if (status === 'active') return 'Sign swap in wallet'
    return 'Sign swap'
  }
  if (status === 'complete') return 'Confirmed onchain'
  if (status === 'active') return 'Submitted, confirming'
  return 'Confirm onchain'
}

/**
 * Only the steps this trade needs, joined by a track that fills as each one
 * lands. Rows have a fixed height, so progress never changes the card's size:
 * only the success and rejected footers do.
 */
export function ReviewSteps({
  trade,
  state,
  explorerHref = 'https://etherscan.io',
  stagger = false,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
  explorerHref?: string
  /** Rows rise in one after another when the steps mount (as they do when you commit). */
  stagger?: boolean
}) {
  const m = useReviewMotion()
  const steps = getReviewSteps(state)
  const rows = steps.length ? steps : getReviewSteps({ ...state, phase: 'sign' }).map((s) => ({ ...s, status: 'upcoming' as const }))

  return (
    <div className="flex flex-col">
      <ol className="flex flex-col px-uni-8">
        {rows.map((step, i) => (
          <motion.li key={step.id} className="relative" {...(stagger ? m.stagger(i) : {})}>
            <StepRow step={step} token={trade.input.token} />
            {i < rows.length - 1 && <StepTrack filled={step.status === 'complete'} />}
          </motion.li>
        ))}
      </ol>
      <AnimatePresence initial={false}>
        {state.phase === 'success' && (
          <motion.div key="success" className="pt-uni-12" {...m.region}>
            <div className="flex items-center justify-between gap-uni-12 rounded-uni-16 bg-surface2 py-[10px] pr-uni-12 pl-uni-12 text-body3">
              <span className="truncate text-neutral2">0x8f3e…a21c · 14s</span>
              <a
                href={explorerHref}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-uni-4 rounded-uni-8 text-buttonLabel3 text-accent1 outline-none transition-colors hover:text-accent1Hovered focus-visible:ring-1 focus-visible:ring-accent1"
              >
                View on Etherscan
                <ArrowUpRight aria-hidden className="size-uni-16" />
              </a>
            </div>
          </motion.div>
        )}
        {state.phase === 'rejected' && (
          <motion.p key="rejected" className="px-uni-8 pt-uni-12 text-body3 text-neutral2" {...m.region}>
            You declined the request in your wallet. Nothing was sent and no network cost was paid.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

const ROW_HEIGHT = 36
const INDICATOR = 20

function StepRow({ step, token }: { step: ReviewStep; token: Token }) {
  const m = useReviewMotion()
  const title = stepTitle(step, token)
  const current = step.status === 'active' || step.status === 'error'
  return (
    <div className="flex items-center gap-uni-12" style={{ height: ROW_HEIGHT }}>
      <span className="relative flex shrink-0 items-center justify-center" style={{ width: INDICATOR, height: INDICATOR }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={step.status} className="absolute inset-0 flex items-center justify-center" {...m.pop}>
            <StepIndicator status={step.status} />
          </motion.span>
        </AnimatePresence>
      </span>
      <span
        className={cn(
          'relative min-w-0 flex-1 text-body3 transition-colors duration-200',
          step.status === 'error' ? 'text-statusCritical' : current ? 'text-neutral1' : 'text-neutral2',
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={title} className="block truncate" {...m.swap}>
            {title}
          </motion.span>
        </AnimatePresence>
      </span>
      <AnimatePresence initial={false}>
        {step.id === 'confirm' && step.status === 'active' && (
          <motion.span key="eta" className="shrink-0 text-body4 text-neutral3" {...m.swap}>
            ~14s
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepIndicator({ status }: { status: ReviewStep['status'] }) {
  const m = useReviewMotion()
  switch (status) {
    case 'complete':
      return <CheckCircleFilled className="size-uni-20 text-statusSuccess" />
    case 'error':
      return <AlertTriangleFilled className="size-[18px] text-statusCritical" />
    case 'active':
      // The step waiting on you: a dot with a slow halo (constant motion, so linear-ish
      // and looping; reduced motion keeps a static halo)
      return (
        <span className="relative flex size-uni-20 items-center justify-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-uni-full bg-accent2"
            initial={false}
            animate={m.reduce ? { opacity: 1 } : { transform: ['scale(0.5)', 'scale(1)'], opacity: [1, 0] }}
            transition={m.reduce ? { duration: 0 } : { duration: 1.6, ease: [0.23, 1, 0.32, 1], repeat: Infinity }}
          />
          <span className="relative size-uni-8 rounded-uni-full bg-accent1" />
        </span>
      )
    default:
      return <span className="size-uni-12 rounded-uni-full border-2 border-surface3" />
  }
}

/** The line joining two step indicators; fills from the top as the step above lands. */
function StepTrack({ filled }: { filled: boolean }) {
  const m = useReviewMotion()
  const gap = ROW_HEIGHT - INDICATOR - 6
  return (
    <span
      aria-hidden
      className="absolute w-[2px] overflow-hidden rounded-uni-full bg-surface3"
      style={{ left: INDICATOR / 2 - 1, top: (ROW_HEIGHT + INDICATOR) / 2 + 3, height: gap }}
    >
      <motion.span
        className="absolute inset-0 origin-top bg-statusSuccess"
        initial={false}
        animate={{ transform: `scaleY(${filled ? 1 : 0})` }}
        transition={m.reduce ? { duration: 0 } : { duration: 0.3, delay: filled ? 0.1 : 0, ease: [0.23, 1, 0.32, 1] }}
      />
    </span>
  )
}

/* Action ------------------------------------------------------------------ */

interface ButtonLook {
  label: string
  variant: 'default' | 'branded'
  emphasis: 'primary' | 'secondary'
  spinner?: boolean
}

function buttonLook(trade: ReviewTrade, state: ReviewFlowState): ButtonLook {
  const action = getReviewAction(state)
  switch (action) {
    case 'accept':
      return { label: 'Accept new price', variant: 'branded', emphasis: 'secondary' }
    case 'retry':
      return { label: 'Try again', variant: 'branded', emphasis: 'primary' }
    case 'done':
      return { label: 'Done', variant: 'default', emphasis: 'secondary' }
    case 'busy':
      if (state.phase === 'approve') return { label: 'Approve in wallet', variant: 'default', emphasis: 'secondary', spinner: true }
      if (state.phase === 'sign') return { label: 'Confirm in wallet', variant: 'default', emphasis: 'secondary', spinner: true }
      return { label: 'Swap submitted', variant: 'default', emphasis: 'secondary' }
    default:
      return {
        label: state.needsApproval && !state.approved ? `Approve ${trade.input.token.symbol} and swap` : 'Swap',
        variant: 'branded',
        emphasis: 'primary',
      }
  }
}

/**
 * One button for the whole flow. The element never unmounts: its color
 * transitions and its label crossfades in place, so it reads as the same
 * control changing its mind, not a new one appearing.
 */
export function ReviewButton({
  trade,
  state,
  onAction,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
  onAction?: (action: ReviewAction) => void
}) {
  const m = useReviewMotion()
  const action = getReviewAction(state)
  const look = buttonLook(trade, state)
  const busy = action === 'busy'
  return (
    <div className="flex pt-uni-4">
      <UniButton
        size="large"
        fill
        variant={look.variant}
        emphasis={look.emphasis}
        aria-disabled={busy || undefined}
        aria-busy={busy || undefined}
        onClick={() => !busy && onAction?.(action)}
        className={cn('overflow-hidden duration-200', busy && 'pointer-events-none')}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={look.label} className="flex items-center gap-uni-12" {...m.swap}>
            {look.spinner && <Spinner />}
            {look.label}
          </motion.span>
        </AnimatePresence>
      </UniButton>
    </div>
  )
}
