'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UniButton } from '../../UniButton'
import { formatDerivedAmount } from '../parts/amount'
import { getPreset } from '../presets'
import { Separator } from '../overlays/shared'
import {
  AutoHeight,
  ReviewAmounts,
  ReviewDetails,
  ReviewHeader,
  getReviewAction,
  useReviewMotion,
  type ReviewAction,
  type ReviewFlowState,
  type ReviewTrade,
} from '../review'
import { SwapFormView } from '../SwapFormView'
import type { SwapFormState } from '../types'
import { DynamicIsland, type DynamicIslandProps } from './DynamicIsland'
import { FaceIdGlyph } from './FaceIdGlyph'
import type { IslandPresentation } from './useIslandPresentation'

/*
 * The flow on the phone: the app's swap screen, the review sheet over it, and
 * the island above everything.
 *
 *   review / Face ID / cancelled   sheet up: amounts, details, one button
 *   pending / success              sheet gone, form cleared; the island has it
 *
 * The web surface morphs through every state on one card. In the app the
 * card's job ends at commit: the sheet only reviews (it never turns into
 * steps), and everything after belongs to the island, which outlives the
 * app if you leave it. Presentational: render it from a ReviewFlowState and
 * an IslandPresentation, wire the callbacks for a live phone. Device chrome
 * (status bar, home indicator) comes in through `chrome`, drawn under the
 * island and over everything else.
 */

export interface IslandPhoneProps {
  trade: ReviewTrade
  state: ReviewFlowState
  presentation: IslandPresentation
  /** The review sheet was dismissed while reviewing (it reopens from the form's button). */
  sheetDismissed?: boolean
  onAction?: (action: ReviewAction) => void
  /** Close on the sheet; omit to hide the close button. */
  onClose?: () => void
  /** The form's Review button, while the sheet is down. */
  onReopen?: () => void
  onIslandToggle?: () => void
  live?: DynamicIslandProps['live']
  /** Status bar, home indicator: over the app, under the island. Given the island, to condense around it. */
  chrome?: (presentation: IslandPresentation) => React.ReactNode
  className?: string
}

const COMMITTED = new Set<ReviewFlowState['phase']>(['pending', 'success'])

export function IslandPhone({
  trade,
  state,
  presentation,
  sheetDismissed = false,
  onAction,
  onClose,
  onReopen,
  onIslandToggle,
  live,
  chrome,
  className,
}: IslandPhoneProps) {
  const reduce = useReducedMotion() ?? false
  const committed = COMMITTED.has(state.phase)
  const sheetOpen = !committed && !sheetDismissed
  const form = React.useMemo(() => formState(trade, state, committed), [trade, state, committed])

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-surface1 text-neutral1', className)}>
      <div className="absolute inset-x-0 top-[59px] flex justify-center px-uni-12">
        <SwapFormView state={form} onAction={onReopen && (() => onReopen())} className="w-full" />
      </div>
      <AnimatePresence initial={false}>
        {sheetOpen && (
          <motion.div
            key="scrim"
            aria-hidden
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.25, delay: reduce ? 0 : 0.05 } }}
          />
        )}
        {sheetOpen && (
          <motion.div
            key="sheet"
            role="dialog"
            aria-label="Review swap"
            className="absolute inset-x-0 bottom-0 rounded-t-[38px] bg-surface1 px-uni-16 pt-uni-8 pb-[42px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={reduce ? { opacity: 0 } : { transform: 'translateY(100%)' }}
            animate={reduce ? { opacity: 1 } : { transform: 'translateY(0%)' }}
            exit={reduce ? { opacity: 0 } : { transform: 'translateY(100%)' }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', visualDuration: 0.42, bounce: 0 }}
          >
            <span aria-hidden className="mx-auto mb-uni-8 block h-[5px] w-[36px] rounded-full bg-surface3" />
            <AppReviewSheet trade={trade} state={state} onAction={onAction} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
      {chrome?.(presentation)}
      <DynamicIsland trade={trade} state={state} presentation={presentation} onToggle={onIslandToggle} live={live} />
    </div>
  )
}

/** The form behind the sheet: the trade being reviewed, then cleared once it's committed. */
function formState(trade: ReviewTrade, state: ReviewFlowState, committed: boolean): SwapFormState {
  const filled = getPreset('filled')!.state
  const { input, output, quote } = trade
  if (committed) {
    return { ...getPreset('empty')!.state, input: { token: input.token, amount: '' } }
  }
  return {
    ...filled,
    input: { token: input.token, amount: String(input.amount) },
    output: { token: output.token, amount: formatDerivedAmount(state.acceptedOutput, output.token.decimals) },
    quote,
    focusedField: undefined,
    // The trade under review is affordable by definition: don't flag the form behind it
    wallet: {
      ...filled.wallet,
      balances: { ...filled.wallet.balances, [input.token.symbol]: Math.max(filled.wallet.balances[input.token.symbol] ?? 0, input.amount) },
    },
  }
}

/* Sheet ------------------------------------------------------------------- */

/**
 * The review sheet: the web surface's review layout, kept as it is while
 * Face ID runs (the amounts you're signing stay in front of you), with one
 * button. It never morphs into steps: committing hands the swap to the island.
 */
export function AppReviewSheet({
  trade,
  state,
  onAction,
  onClose,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
  onAction?: (action: ReviewAction) => void
  onClose?: () => void
}) {
  const m = useReviewMotion()
  // The sheet shows the trade as reviewed whatever the flow is doing
  const reviewed = React.useMemo<ReviewFlowState>(() => ({ ...state, phase: 'review' }), [state])
  const action = getReviewAction(state)
  const rejected = state.phase === 'rejected'

  return (
    <div className="flex flex-col gap-uni-16">
      <ReviewHeader phase="review" onClose={action === 'busy' ? undefined : onClose} />
      <AutoHeight>
        <div className="flex flex-col gap-uni-16">
          <ReviewAmounts trade={trade} state={reviewed} />
          <Separator className="mx-uni-8 flex-none" />
          <ReviewDetails trade={trade} state={reviewed} />
          <AnimatePresence initial={false}>
            {rejected && (
              <motion.p key="rejected" className="px-uni-8 text-body3 text-neutral2" {...m.region}>
                Face ID was cancelled. Nothing was signed or sent.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </AutoHeight>
      <SheetButton trade={trade} state={state} onAction={onAction} />
    </div>
  )
}

function buttonLook(trade: ReviewTrade, state: ReviewFlowState) {
  switch (getReviewAction(state)) {
    case 'accept':
      return { label: 'Accept new price', variant: 'branded', emphasis: 'secondary', faceId: false } as const
    case 'retry':
      return { label: 'Try again', variant: 'branded', emphasis: 'primary', faceId: true } as const
    case 'busy':
      return { label: 'Confirm with Face ID', variant: 'default', emphasis: 'secondary', faceId: false } as const
    default:
      return {
        label: state.needsApproval && !state.approved ? `Approve ${trade.input.token.symbol} and swap` : 'Swap',
        variant: 'branded',
        emphasis: 'primary',
        faceId: true,
      } as const
  }
}

/** One button, relabelled in place (as the web surface's). The Face ID glyph says what pressing it does. */
function SheetButton({
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
        <motion.span key={look.label} className="flex items-center gap-uni-8" {...m.swap}>
          {look.faceId && <FaceIdGlyph className="size-uni-20" />}
          {look.label}
        </motion.span>
      </AnimatePresence>
    </UniButton>
  )
}
