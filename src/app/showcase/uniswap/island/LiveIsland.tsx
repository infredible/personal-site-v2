'use client'

import * as React from 'react'
import { Pause, Play, RotateCcw, TrendingDown } from 'lucide-react'
import { PhoneFrame, PhoneHomeIndicator, PhoneStatusBar, phoneScaleToFit } from '@/components/showcase'
import { SegmentedControl, UniButton } from '@/components/uniswap'
import { PRICE_MOVE, atReview, useReviewFlow, type ReviewAction, type WalletResponse } from '@/components/uniswap/swap/review'
import {
  ISLAND_TIMINGS,
  IslandPhone,
  useIslandPresentation,
  type IslandPreset,
  type IslandPresentation,
} from '@/components/uniswap/swap/island'
import { cn } from '@/lib/utils'

/*
 * The Component view: a phone, live. The review flow plays on Face ID and
 * chain timings, the island follows it, and a demo bar above the phone
 * steers the simulation. Any preset past review holds where it starts until
 * you resume it.
 */

const FACE_ID_OPTIONS = [
  { value: 'approve' as const, label: 'Matches' },
  { value: 'reject' as const, label: 'Cancels' },
]

/** Room the stage keeps around the phone: the demo bar above, the hint below. */
const CHROME_HEIGHT = 290

export function LiveIsland({ preset }: { preset: IslandPreset }) {
  const [paused, setPaused] = React.useState(preset.state.phase !== 'review')
  const [faceId, setFaceId] = React.useState<WalletResponse>('approve')
  const [dismissed, setDismissed] = React.useState(false)
  const flow = useReviewFlow(preset.state, { paused, walletResponse: faceId, timings: ISLAND_TIMINGS.flow })
  const { state } = flow
  const island = useIslandPresentation(state, { paused, initial: preset.presentation })
  const scale = usePhoneScale()

  const replay = () => {
    setPaused(false)
    setDismissed(false)
    flow.reset(atReview(preset).state)
  }

  const onAction = (action: ReviewAction) => {
    setPaused(false)
    if (action === 'swap') flow.submit()
    else if (action === 'accept') flow.acceptPrice()
    else if (action === 'retry') flow.retry()
  }

  const onClose = () => {
    if (state.phase === 'rejected') flow.reset(atReview(preset).state)
    setDismissed(true)
  }

  const holding = paused && state.phase !== 'review'
  const canMovePrice = state.phase === 'review' && state.updatedOutput === null && !dismissed
  const reviewing = state.phase === 'review' || state.phase === 'rejected'

  return (
    <div className="flex w-full flex-col items-center gap-uni-16">
      <div
        role="toolbar"
        aria-label="Demo controls"
        className="flex w-full max-w-[415px] flex-wrap items-center gap-x-uni-12 gap-y-uni-8 rounded-uni-16 border border-dashed border-surface3 px-uni-12 py-uni-8"
      >
        <span className="flex min-w-0 items-center gap-uni-6 text-body4 text-neutral2">
          <span aria-hidden className={cn('size-uni-6 shrink-0 rounded-uni-full transition-colors duration-200', statusDot(state.phase, holding))} />
          <span className="truncate">{holding ? `Paused · ${statusLabel(state.phase, island.presentation)}` : statusLabel(state.phase, island.presentation)}</span>
        </span>
        <span className="ml-auto flex items-center gap-uni-6">
          <span className="text-body4 text-neutral2 max-[400px]:sr-only">Face ID</span>
          <SegmentedControl aria-label="Simulated Face ID" size="small" options={FACE_ID_OPTIONS} value={faceId} onValueChange={setFaceId} />
        </span>
        <span className="flex w-full items-center justify-end gap-uni-6">
          {holding ? (
            <UniButton size="xsmall" emphasis="secondary" icon={<Play />} onClick={() => setPaused(false)}>
              Resume
            </UniButton>
          ) : (
            !reviewing && (
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
      </div>

      <PhoneFrame scale={scale}>
        <IslandPhone
          trade={preset.trade}
          state={state}
          presentation={island.presentation}
          sheetDismissed={dismissed}
          onAction={onAction}
          onClose={onClose}
          onReopen={dismissed && state.phase === 'review' ? () => setDismissed(false) : undefined}
          onIslandToggle={island.toggle}
          live={{ running: !paused }}
          chrome={phoneChrome}
        />
      </PhoneFrame>

      <p className="text-body4 text-neutral2" aria-live="polite">
        {hint(state.phase, island.presentation, dismissed)}
      </p>
    </div>
  )
}

/** Status bar (condensed while the island is widened) and home indicator. */
export function phoneChrome({ kind }: IslandPresentation) {
  return (
    <>
      <PhoneStatusBar condensed={kind === 'compact'} className="z-30" />
      <PhoneHomeIndicator className="z-30" />
    </>
  )
}

/** Fit the phone to the stage: its column's width, and the window's height less the demo chrome. */
function usePhoneScale() {
  const [scale, setScale] = React.useState(0.75)
  React.useLayoutEffect(() => {
    const column = document.querySelector<HTMLElement>('[data-showcase-viewport]')
    if (!column) return
    const measure = () => setScale(phoneScaleToFit(column.clientWidth - 32, column.clientHeight - CHROME_HEIGHT, 0.5))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(column)
    return () => observer.disconnect()
  }, [])
  return scale
}

function statusLabel(phase: string, presentation: IslandPresentation) {
  if (presentation.faceId === 'scanning') return 'Face ID'
  if (presentation.faceId === 'success') return 'Signed'
  if (presentation.faceId === 'failed' || phase === 'rejected') return 'Cancelled'
  if (phase === 'pending') return presentation.kind === 'expanded' ? 'Live Activity · expanded' : 'Live Activity'
  if (phase === 'success') return presentation.kind === 'idle' ? 'Activity ended' : 'Swap complete'
  return 'Reviewing'
}

function statusDot(phase: string, holding: boolean) {
  if (holding) return 'bg-neutral3'
  if (phase === 'success') return 'bg-statusSuccess'
  if (phase === 'rejected') return 'bg-statusCritical'
  if (phase === 'review') return 'bg-neutral3'
  return 'bg-accent1'
}

function hint(phase: string, presentation: IslandPresentation, dismissed: boolean) {
  if (dismissed && phase === 'review') return 'Review reopens the sheet'
  if (presentation.kind === 'compact') return 'Tap the island to open it'
  if (presentation.kind === 'expanded' || presentation.kind === 'alert') return 'Tap the island to fold it'
  if (phase === 'success') return 'Replay to swap again'
  if (phase === 'rejected') return 'Try again scans again'
  if (presentation.kind === 'faceid') return 'Face ID runs in the island'
  return 'Swap hands the flow to the island'
}
