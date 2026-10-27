'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUpRight, CheckCircleFilled, Chevron, InfoCircle, X } from '../../icons'
import { Pill } from '../../Pill'
import { UniButton } from '../../UniButton'
import { UniTooltip } from '../../UniTooltip'
import { modalSurfaceClassName } from '../../UniModal'
import { formatPercent, formatTokenAmount, formatUsd } from '../format'
import { AlertTriangleFilled, Separator, TokenLogo } from '../overlays/shared'
import { TOKENS } from '../tokens'
import type { Token } from '../types'
import { AutoHeight, DURATION, EASE_DRAWER, EASE_OUT, Spinner, useReviewMotion } from './motion'
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
 *   │ amounts     Sell over Buy while reviewing; side by side, one    │
 *   │             flowing into the other, once committed              │
 *   │ ─────────── hairline                                            │
 *   │ region      details while reviewing ⇄ steps once committed      │
 *   │ ┄┄┄┄┄┄┄┄┄┄┄ on success, both give way to the receipt:           │
 *   │             what you got, and the transaction folded underneath │
 *   └ action      one button, relabelled; never replaced              ┘
 *
 * Between layouts the token logos and the connector are shared elements:
 * they travel to their place in the next layout (Sell slides left, Buy
 * rises, the arrow turns to point across; then Buy grows into the receipt
 * and the arrow becomes its check) while the text around them settles in.
 * The card is top-anchored (as Uniswap's modal is), so a height change only
 * ever moves the bottom edge. Presentational: render it from a
 * ReviewFlowState (useReviewFlow plays one), wire `onAction`.
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
  /** Open the receipt's transaction details when it first shows. */
  defaultReceiptOpen?: boolean
  className?: string
}

export function ReviewSurface({
  trade,
  state,
  onAction,
  onClose,
  explorerHref,
  defaultReceiptOpen,
  className,
}: ReviewSurfaceProps) {
  const m = useReviewMotion()
  const scope = React.useId()
  return (
    <LayoutScope.Provider value={scope}>
      <div data-slot="review-surface" className={cn(modalSurfaceClassName, 'relative', className)}>
        <div data-explode="header">
          <ReviewHeader phase={state.phase} onClose={onClose} />
        </div>
        {/* One measured box for everything that changes shape, so nothing nested has to chase it */}
        <AutoHeight>
          <AnimatePresence mode="popLayout" initial={false}>
            {state.phase === 'success' ? (
              <motion.div key="receipt" className="w-full" {...m.hold}>
                <div data-explode="receipt">
                  <ReviewReceipt trade={trade} state={state} explorerHref={explorerHref} defaultOpen={defaultReceiptOpen} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="flow" className="flex w-full flex-col gap-uni-16" {...m.hold}>
                <div data-explode="amounts" className="relative">
                  <ReviewAmounts trade={trade} state={state} />
                </div>
                <ReviewBody trade={trade} state={state} />
              </motion.div>
            )}
          </AnimatePresence>
        </AutoHeight>
        <div data-explode="action">
          <ReviewButton trade={trade} state={state} onAction={onAction} />
        </div>
        <span role="status" className="sr-only">
          {announcement(trade, state)}
        </span>
      </div>
    </LayoutScope.Provider>
  )
}

/*
 * Shared-element ids. Every surface (and every standalone part on the canvas)
 * gets its own scope, so frames side by side never trade logos.
 */
const LayoutScope = React.createContext<string | null>(null)

function useLayoutIds() {
  const surface = React.useContext(LayoutScope)
  const own = React.useId()
  const scope = surface ?? own
  return React.useMemo(() => ({ input: `${scope}-in`, output: `${scope}-out`, connector: `${scope}-connector` }), [scope])
}

type LayoutIds = ReturnType<typeof useLayoutIds>

/** A token logo that travels between layouts (and grows or shrinks on the way). */
function LogoMark({ id, token, size }: { id: string; token: Token; size: number }) {
  const m = useReviewMotion()
  return (
    <motion.span
      layoutId={id}
      transition={m.morph}
      className="relative block shrink-0 rounded-uni-full"
      style={{ width: size, height: size }}
    >
      <TokenLogo token={token} size={size} />
    </motion.span>
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
  success: 'Swap complete',
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

/* Amounts ------------------------------------------------------------------ */

const FLOWING = new Set<ReviewPhase>(['approve', 'sign', 'pending'])

/**
 * While reviewing, Sell over Buy: the numbers are what you're reading. Once you
 * commit, they turn side by side, Sell flowing into Buy along a track, at a
 * smaller size (you've read them; the steps are what's live now).
 */
export function ReviewAmounts({ trade, state }: { trade: ReviewTrade; state: ReviewFlowState }) {
  const m = useReviewMotion()
  const ids = useLayoutIds()
  return (
    <div className="relative">
      {/* propagate: when the card hands over to the receipt, these text exits still run */}
      <AnimatePresence mode="popLayout" initial={false} propagate>
        {state.phase === 'review' ? (
          <motion.div key="stacked" className="flex w-full flex-col gap-uni-12 px-uni-8" {...m.hold}>
            <AmountRow token={trade.input.token} amount={trade.input.amount} logoId={ids.input} />
            <div className="flex h-uni-24 items-center">
              <Connector id={ids.connector} direction="down" />
            </div>
            <AmountRow token={trade.output.token} amount={state.acceptedOutput} logoId={ids.output} />
          </motion.div>
        ) : (
          <motion.div key="pair" className="w-full px-uni-8" {...m.hold}>
            <ConversionPair trade={trade} state={state} ids={ids} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AmountRow({ token, amount, logoId }: { token: Token; amount: number; logoId: string }) {
  const m = useReviewMotion()
  const formatted = `${formatTokenAmount(amount)} ${token.symbol}`
  return (
    <div className="flex items-center gap-uni-12">
      <motion.div className="flex min-w-0 flex-1 flex-col gap-uni-4" {...m.settle()}>
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
      </motion.div>
      <LogoMark id={logoId} token={token} size={40} />
    </div>
  )
}

/**
 * The disc between the amounts. A shared element: it slides to the middle of
 * the track as the layout turns, its arrow turning with it to point across.
 */
function Connector({ id, direction }: { id: string; direction: 'down' | 'right' }) {
  const m = useReviewMotion()
  const angle = (d: 'down' | 'right') => `rotate(${d === 'right' ? -90 : 0}deg)`
  return (
    <motion.span
      layoutId={id}
      transition={m.morph}
      className="relative z-10 flex size-uni-24 shrink-0 items-center justify-center rounded-uni-full bg-surface2 text-neutral2 ring-4 ring-surface1"
    >
      <motion.span
        className="flex"
        initial={{ transform: angle(direction === 'right' ? 'down' : 'right') }}
        animate={{ transform: angle(direction) }}
        transition={m.reduce ? { duration: 0 } : { duration: DURATION.height, ease: EASE_DRAWER }}
      >
        <ArrowDown className="size-[14px]" />
      </motion.span>
    </motion.span>
  )
}

/** Sell → Buy, side by side: logos at either end of the track, amounts under them. */
function ConversionPair({ trade, state, ids }: { trade: ReviewTrade; state: ReviewFlowState; ids: LayoutIds }) {
  const { input, output } = trade
  return (
    <div className="flex flex-col gap-uni-12">
      <div className="flex items-center">
        <LogoMark id={ids.input} token={input.token} size={40} />
        <ConversionTrack
          input={input.token}
          output={output.token}
          flowing={FLOWING.has(state.phase)}
          connectorId={ids.connector}
        />
        <LogoMark id={ids.output} token={output.token} size={40} />
      </div>
      <div className="grid grid-cols-2 gap-uni-12">
        <PairAmount token={input.token} amount={input.amount} />
        <PairAmount token={output.token} amount={state.acceptedOutput} end />
      </div>
    </div>
  )
}

function PairAmount({ token, amount, end = false }: { token: Token; amount: number; end?: boolean }) {
  const m = useReviewMotion()
  return (
    <motion.div className={cn('flex min-w-0 flex-col gap-uni-4', end && 'items-end text-right')} {...m.settle(0.1)}>
      <span className="max-w-full truncate text-subheading1 text-neutral1">
        {formatTokenAmount(amount)} {token.symbol}
      </span>
      <span className="max-w-full truncate text-body3 text-neutral2">{formatUsd(amount * token.priceUsd)}</span>
    </motion.div>
  )
}

/** One trip along the track (s), and how many tokens are on it at once. */
const FLOW = { duration: 2.1, count: 3 }

/**
 * The conversion, drawn: a dotted track from Sell to Buy (it draws in from
 * the left as the layout lands), the connector in the middle, and small Sell
 * tokens travelling along it that pass under the connector and come out the
 * other side as Buy. It runs while the swap is in flight and stops when the
 * wallet declines. Reduced motion keeps the track and the arrow, still.
 */
function ConversionTrack({
  input,
  output,
  flowing,
  connectorId,
}: {
  input: Token
  output: Token
  flowing: boolean
  connectorId: string
}) {
  const m = useReviewMotion()
  return (
    <div className="relative mx-uni-12 flex h-uni-40 min-w-0 flex-1 items-center justify-center">
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2"
        style={{
          // The raw token: `@theme inline` doesn't emit the --color-* aliases
          backgroundImage: 'radial-gradient(circle, var(--uni-neutral3) 1px, transparent 1.5px)',
          backgroundSize: '6px 2px',
          backgroundPosition: 'center',
        }}
        initial={m.reduce ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
        animate={
          m.reduce
            ? { opacity: 1, transition: { duration: DURATION.regionIn } }
            : { clipPath: 'inset(0 0% 0 0)', transition: { duration: DURATION.height, delay: 0.1, ease: EASE_OUT } }
        }
        exit={{ opacity: 0, transition: { duration: DURATION.regionOut } }}
      />
      <AnimatePresence propagate>
        {flowing && !m.reduce && (
          <motion.span
            key="flow"
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: DURATION.regionIn, delay: 0.24 } }}
            exit={{ opacity: 0, transition: { duration: DURATION.regionOut } }}
          >
            {Array.from({ length: FLOW.count }, (_, i) => (
              <FlowToken key={i} index={i} input={input} output={output} />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
      <Connector id={connectorId} direction="right" />
    </div>
  )
}

/**
 * One token on the track. The outer box is the track's width, so translating
 * it by 100% carries the token from end to end (transform only, off the main
 * thread). It shows Sell on the way in and Buy on the way out; the swap
 * happens under the connector, which covers the midpoint.
 */
function FlowToken({ index, input, output }: { index: number; input: Token; output: Token }) {
  const loop = { duration: FLOW.duration, ease: 'linear', repeat: Infinity, delay: (index * FLOW.duration) / FLOW.count } as const
  return (
    <motion.span
      className="absolute inset-0"
      initial={{ transform: 'translateX(0%)' }}
      animate={{ transform: ['translateX(0%)', 'translateX(100%)'] }}
      transition={loop}
    >
      <span className="absolute top-1/2 left-0 size-uni-16 -translate-1/2">
        <motion.span
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0, 0] }}
          transition={{ ...loop, times: [0, 0.12, 0.4, 0.47, 1] }}
        >
          <TokenLogo token={input} size={16} />
        </motion.span>
        <motion.span
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ ...loop, times: [0, 0.53, 0.6, 0.88, 1] }}
        >
          <TokenLogo token={output} size={16} />
        </motion.span>
      </span>
    </motion.span>
  )
}

/* Region: details ⇄ steps ------------------------------------------------- */

/**
 * The part of the card that changes shape. Details while reviewing; once you
 * commit they collapse away (you've read them) and the steps take their place.
 * The surface measures the height; this only crossfades.
 */
function ReviewBody({ trade, state }: { trade: ReviewTrade; state: ReviewFlowState }) {
  const m = useReviewMotion()
  const reviewing = state.phase === 'review'
  return (
    <motion.div className="relative flex flex-col" {...m.region}>
      <Separator className="mx-uni-8 flex-none" />
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
              <ReviewSteps trade={trade} state={state} stagger />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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

/** Mock gas for the one-time approval, on top of the swap's network cost. */
const APPROVAL_COST_USD = 1.86

/** Rate and costs at the accepted price; `approval` adds the approval's gas. */
function tradeCosts({ input, output, quote }: ReviewTrade, state: ReviewFlowState, approval: boolean) {
  const feeRate = quote.feeRate ?? 0
  return {
    rate: state.acceptedOutput / input.amount,
    feeRate,
    feeUsd: state.acceptedOutput * output.token.priceUsd * feeRate,
    networkFeeUsd: (quote.networkFeeUsd ?? 0) + (approval ? APPROVAL_COST_USD : 0),
  }
}

function RateText({ trade, rate }: { trade: ReviewTrade; rate: number }) {
  return (
    <span className="truncate">
      1 {trade.input.token.symbol} = {formatTokenAmount(rate)} {trade.output.token.symbol}
    </span>
  )
}

/** What you're agreeing to: rate, costs, slippage, and an approval if one's needed. */
export function ReviewDetails({ trade, state }: { trade: ReviewTrade; state: ReviewFlowState }) {
  const m = useReviewMotion()
  const { input, output, slippage } = trade
  const approval = state.needsApproval && !state.approved
  const { rate, feeRate, feeUsd, networkFeeUsd: networkFee } = tradeCosts(trade, state, approval)
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
          <RateText trade={trade} rate={rate} />
        </DetailRow>
        <DetailRow label={feeRate > 0 ? `Fee (${formatPercent(feeRate)})` : 'Fee'}>
          {feeRate > 0 ? formatUsd(feeUsd) : 'Free'}
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
 * only the rejected footer does. (Success hands the card to the receipt.)
 */
export function ReviewSteps({
  trade,
  state,
  stagger = false,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
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

/* Receipt ----------------------------------------------------------------- */

/**
 * What the card becomes once the swap lands: the token you got, big, with the
 * connector turned into its check; and the transaction (including what you
 * gave for it) folded away behind one row, for the few who want it.
 */
export function ReviewReceipt({
  trade,
  state,
  explorerHref = 'https://etherscan.io',
  defaultOpen = false,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
  explorerHref?: string
  /** Start with the transaction details open. */
  defaultOpen?: boolean
}) {
  const m = useReviewMotion()
  const ids = useLayoutIds()
  const [open, setOpen] = React.useState(defaultOpen)
  const panelId = React.useId()
  const { input, output } = trade
  // The approval (if this trade needed one) was paid on the way
  const { rate, feeRate, feeUsd, networkFeeUsd } = tradeCosts(trade, state, state.needsApproval)

  return (
    <div className="flex flex-col gap-uni-12">
      <div className="flex flex-col items-center gap-uni-16 px-uni-8 pt-uni-8 text-center">
        <span className="relative">
          <LogoMark id={ids.output} token={output.token} size={64} />
          <ReceivedBadge id={ids.connector} />
        </span>
        <motion.div className="flex max-w-full flex-col items-center gap-uni-4" {...m.settle(0.1)}>
          <span className="max-w-full truncate text-heading2 text-neutral1">
            {formatTokenAmount(state.acceptedOutput)} {output.token.symbol}
          </span>
          <span className="text-body2 text-neutral2">{formatUsd(state.acceptedOutput * output.token.priceUsd)}</span>
        </motion.div>
      </div>
      <motion.div className="flex flex-col" {...m.settle(0.2)}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex h-uni-36 cursor-pointer items-center justify-between gap-uni-12 rounded-uni-12 px-uni-8 text-body3 text-neutral2 outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface2 hover:text-neutral1 focus-visible:bg-surface2 focus-visible:text-neutral1 active:scale-[0.99]"
        >
          Transaction details
          <Chevron
            aria-hidden
            className={cn(
              'size-uni-16 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
              open ? 'rotate-90' : '-rotate-90',
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="details" id={panelId} className="flex flex-col gap-uni-8 px-uni-8 pt-uni-8" {...m.region}>
              <DetailRow label="Rate">
                <RateText trade={trade} rate={rate} />
              </DetailRow>
              <DetailRow label="Swapped from">
                <TokenLogo token={input.token} size={16} />
                <span className="truncate">
                  {formatTokenAmount(input.amount)} {input.token.symbol}
                </span>
              </DetailRow>
              <DetailRow label={feeRate > 0 ? `Fee (${formatPercent(feeRate)})` : 'Fee'}>
                {feeRate > 0 ? formatUsd(feeUsd) : 'Free'}
              </DetailRow>
              <DetailRow label="Network cost">
                <TokenLogo token={TOKENS.ETH} size={16} />
                {formatUsd(networkFeeUsd)}
              </DetailRow>
              <DetailRow label="Confirmed in">14s</DetailRow>
              <DetailRow label="Transaction">
                <a
                  href={explorerHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-uni-4 rounded-uni-4 text-accent1 outline-none transition-colors hover:text-accent1Hovered focus-visible:ring-1 focus-visible:ring-accent1"
                >
                  <span className="truncate">0x8f3e…a21c</span>
                  <ArrowUpRight aria-hidden className="size-uni-16 shrink-0" />
                  <span className="sr-only">View on Etherscan</span>
                </a>
              </DetailRow>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/**
 * The connector, arrived: it lands on the Buy logo's corner, tints green,
 * the check draws in and one soft ring pulses out. The richest moment in the
 * flow, and still ~600ms.
 */
function ReceivedBadge({ id }: { id: string }) {
  const m = useReviewMotion()
  return (
    <motion.span
      layoutId={id}
      transition={m.morph}
      className="absolute -right-uni-4 -bottom-uni-4 z-10 flex size-uni-24 items-center justify-center rounded-uni-full bg-statusSuccess text-white ring-4 ring-surface1"
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-uni-16">
        <motion.path
          d="M4 8.5l2.6 2.6L12 5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: m.reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.36, delay: 0.2, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
      {!m.reduce && (
        <motion.span
          aria-hidden
          className="absolute top-1/2 left-1/2 size-uni-24 -translate-1/2 rounded-uni-full border border-statusSuccess"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.6, delay: 0.26, ease: EASE_OUT }}
        />
      )}
      <span className="sr-only">Received</span>
    </motion.span>
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
