'use client'

import * as React from 'react'
import { Pause, Play, RotateCcw, TrendingDown } from 'lucide-react'
import { ModalSurface, SegmentedControl, UniButton } from '@/components/uniswap'
import { SwapReviewPanel, type SwapReviewStatus } from '@/components/uniswap/swap/overlays'
import {
  ETH_TO_USDC,
  PRICE_MOVE,
  ReviewSurface,
  atReview,
  useReviewFlow,
  type ReviewAction,
  type ReviewFlowState,
  type ReviewPreset,
  type WalletResponse,
} from '@/components/uniswap/swap/review'
import { cn } from '@/lib/utils'

/*
 * The Component view: the redesigned surface, live, playing on simulated
 * wallet and chain timings. A small demo bar sits ABOVE the card, so the card's
 * top edge (and so its amounts) stays put while its height morphs below.
 */

const IN_FLIGHT = new Set(['approve', 'sign', 'pending'])

const PHASE_LABEL: Record<ReviewFlowState['phase'], string> = {
  review: 'Reviewing',
  approve: 'Approving',
  sign: 'In wallet',
  pending: 'Confirming',
  success: 'Swapped',
  rejected: 'Declined',
}

const WALLET_OPTIONS = [
  { value: 'approve' as const, label: 'Approves' },
  { value: 'reject' as const, label: 'Rejects' },
]

export function LiveReview({
  preset,
  resumeState,
  onStateChange,
}: {
  preset: ReviewPreset
  /** The state this preset was left in (returning from the canvas). */
  resumeState?: ReviewFlowState
  onStateChange?: (state: ReviewFlowState) => void
}) {
  const initial = resumeState ?? preset.state
  // A preset that jumps into the middle of the flow holds there until you resume it
  const [paused, setPaused] = React.useState(() => IN_FLIGHT.has(initial.phase) && initial === preset.state)
  const [wallet, setWallet] = React.useState<WalletResponse>('approve')
  const flow = useReviewFlow(initial, { paused, walletResponse: wallet, onChange: onStateChange })
  const { state } = flow

  const replay = () => {
    setPaused(false)
    flow.reset(preset.state.phase === 'review' ? preset.state : atReview(preset).state)
  }

  const onAction = (action: ReviewAction) => {
    setPaused(false)
    if (action === 'swap') flow.submit()
    else if (action === 'accept') flow.acceptPrice()
    else if (action === 'retry') flow.retry()
    else if (action === 'done') replay()
  }

  const canMovePrice = state.phase === 'review' && state.updatedOutput === null
  const holding = paused && IN_FLIGHT.has(state.phase)

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-uni-12">
      <DemoBar>
        <span className="flex min-w-0 items-center gap-uni-6 text-body4 text-neutral2">
          <span
            aria-hidden
            className={cn(
              'size-uni-6 shrink-0 rounded-uni-full transition-colors duration-200',
              holding ? 'bg-neutral3' : IN_FLIGHT.has(state.phase) ? 'bg-accent1' : state.phase === 'success' ? 'bg-statusSuccess' : state.phase === 'rejected' ? 'bg-statusCritical' : 'bg-neutral3',
            )}
          />
          <span className="truncate">{holding ? `Paused · ${PHASE_LABEL[state.phase]}` : PHASE_LABEL[state.phase]}</span>
        </span>
        <span className="ml-auto flex items-center gap-uni-6">
          <span className="text-body4 text-neutral2 max-[400px]:sr-only">Wallet</span>
          <SegmentedControl
            aria-label="Simulated wallet response"
            size="small"
            options={WALLET_OPTIONS}
            value={wallet}
            onValueChange={setWallet}
          />
        </span>
        <span className="flex w-full items-center justify-end gap-uni-6">
          {holding ? (
            <UniButton size="xsmall" emphasis="secondary" icon={<Play />} onClick={() => setPaused(false)}>
              Resume
            </UniButton>
          ) : (
            IN_FLIGHT.has(state.phase) && (
              <UniButton size="xsmall" emphasis="secondary" icon={<Pause />} onClick={() => setPaused(true)}>
                Pause
              </UniButton>
            )
          )}
          <UniButton
            size="xsmall"
            emphasis="secondary"
            icon={<TrendingDown />}
            disabled={!canMovePrice}
            onClick={() => flow.movePrice(state.acceptedOutput * PRICE_MOVE)}
            title="Simulate a re-quote while you review"
          >
            Move price
          </UniButton>
          <UniButton size="xsmall" emphasis="secondary" icon={<RotateCcw />} onClick={replay}>
            Replay
          </UniButton>
        </span>
      </DemoBar>
      <ReviewSurface trade={preset.trade} state={state} onAction={onAction} onClose={replay} />
    </div>
  )
}

function DemoBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="toolbar"
      aria-label="Demo controls"
      className="flex flex-wrap items-center gap-x-uni-12 gap-y-uni-8 rounded-uni-16 border border-dashed border-surface3 px-uni-12 py-uni-8"
    >
      {children}
    </div>
  )
}

/* Production today -------------------------------------------------------- */

/** Uniswap's current flow, as ported in SwapReviewPanel: separate review, pending and success screens. */
export function ProductionReview() {
  const [status, setStatus] = React.useState<SwapReviewStatus>('review')
  const [stage, setStage] = React.useState<'wallet' | 'submitted'>('wallet')
  const timers = React.useRef<number[]>([])

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  React.useEffect(() => clear, [])

  const reset = () => {
    clear()
    setStatus('review')
    setStage('wallet')
  }

  const confirm = () => {
    clear()
    setStatus('pending')
    setStage('wallet')
    timers.current.push(
      window.setTimeout(() => setStage('submitted'), 1500),
      window.setTimeout(() => setStatus('success'), 1500 + 2200),
    )
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-uni-12">
      <DemoBar>
        <span className="min-w-0 flex-1 text-body4 text-neutral2">
          Production today: each state is its own screen, ported from Uniswap.
        </span>
        <UniButton size="xsmall" emphasis="secondary" icon={<RotateCcw />} onClick={reset}>
          Replay
        </UniButton>
      </DemoBar>
      <ModalSurface>
        <SwapReviewPanel
          input={{ token: ETH_TO_USDC.trade.input.token, amount: ETH_TO_USDC.trade.input.amount }}
          output={{ token: ETH_TO_USDC.trade.output.token, amount: ETH_TO_USDC.outputAmount }}
          quote={ETH_TO_USDC.trade.quote}
          slippage={ETH_TO_USDC.trade.slippage}
          status={status}
          pendingStage={stage}
          needsApproval={false}
          onConfirm={confirm}
          onClose={reset}
        />
      </ModalSurface>
    </div>
  )
}
