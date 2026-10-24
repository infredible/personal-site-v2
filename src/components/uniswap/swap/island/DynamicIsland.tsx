'use client'

import * as React from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArrowDown } from '../../icons'
import { UniswapScope } from '../../UniswapScope'
import { formatTokenAmount } from '../format'
import { TokenLogo } from '../overlays/shared'
import { getReviewSteps, type ReviewFlowState, type ReviewPhase, type ReviewTrade } from '../review'
import type { Token } from '../types'
import { FaceIdGlyph } from './FaceIdGlyph'
import { ISLAND_MOTION, ISLAND_SIZE, ISLAND_TIMINGS, ISLAND_TOP, LENS, MINIMAL_SIZE, PROGRESS, SENSOR, type IslandKind } from './geometry'
import type { IslandPresentation } from './useIslandPresentation'

/*
 * The swap review flow, carried by the Dynamic Island once you commit.
 *
 *   Face ID   136² square    one scan signs the approval and the swap
 *   compact   pair ◀sensor▶ ring          the swap, in flight, at a glance
 *   expanded  step label            ETA
 *             [Sell] ·····(→)····· [Buy]  the web surface's conversion track
 *             1 ETH            2,431 USDC
 *             ━━━━━━━━ ━━━━━━━━ ━━━━┄┄┄┄  the web steps, as one segmented bar
 *   alert     [Buy ✓]     Swap complete    the web receipt, unprompted
 *             +2,431.55 USDC     for 1 ETH
 *
 * The island is always black (it's hardware), so its content uses Uniswap's
 * dark tokens whatever the app theme. Presentational: render it from a
 * ReviewFlowState and an IslandPresentation (useIslandPresentation plays one).
 */

export interface DynamicIslandProps {
  trade: ReviewTrade
  state: ReviewFlowState
  presentation: IslandPresentation
  /** Tap on the island (expand / fold the activity). Omit for a static island. */
  onToggle?: () => void
  /**
   * Plays the pending progress against the chain ETA. Omit for a still frame
   * (progress drawn part way); `running: false` holds it where it is.
   */
  live?: { running: boolean; etaMs?: number }
  className?: string
}

export function DynamicIsland({ trade, state, presentation, onToggle, live, className }: DynamicIslandProps) {
  const reduce = useReducedMotion() ?? false
  const { kind } = presentation
  const size = ISLAND_SIZE[kind]
  const progress = usePendingProgress(state.phase, live)

  // Growing overshoots; settling back barely does
  const previous = React.useRef(kind)
  const grows = area(kind) >= area(previous.current)
  React.useEffect(() => {
    previous.current = kind
  }, [kind])
  const transition = reduce ? ISLAND_MOTION.reduced : grows ? ISLAND_MOTION.grow : ISLAND_MOTION.shrink

  const failed = presentation.faceId === 'failed'
  const expanded = kind === 'expanded' || kind === 'alert'

  return (
    <div className={cn('pointer-events-none absolute inset-x-0 z-40 flex justify-center', className)} style={{ top: ISLAND_TOP }}>
      <UniswapScope theme="dark" className="bg-transparent">
        <motion.div initial={false} animate={failed && !reduce ? ISLAND_MOTION.shake : { x: 0 }}>
          <motion.div
            data-island={kind}
            role={onToggle ? 'button' : undefined}
            tabIndex={onToggle ? 0 : undefined}
            aria-expanded={onToggle ? expanded : undefined}
            aria-label={onToggle ? 'Swap activity' : undefined}
            onClick={onToggle}
            onKeyDown={
              onToggle &&
              ((e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                onToggle()
              })
            }
            className={cn(
              'relative overflow-hidden bg-black text-neutral1 outline-none select-none',
              onToggle && 'pointer-events-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-accent1',
            )}
            initial={false}
            animate={{ width: size.width, height: size.height, borderRadius: size.radius }}
            style={{ width: size.width, height: size.height, borderRadius: size.radius }}
            transition={transition}
            whileTap={onToggle && !reduce ? { scale: 0.97 } : undefined}
          >
            <AnimatePresence initial={false}>
              {kind !== 'idle' && (
                <motion.div
                  key={kind}
                  className="absolute top-0 left-1/2"
                  style={{ width: size.width, height: size.height, marginLeft: -size.width / 2, transformOrigin: '50% 0%' }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.92)', filter: 'blur(6px)' }}
                  animate={{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)', transition: ISLAND_MOTION.contentIn }}
                  exit={
                    reduce
                      ? { opacity: 0, transition: ISLAND_MOTION.contentOut }
                      : { opacity: 0, transform: 'scale(0.96)', filter: 'blur(4px)', transition: ISLAND_MOTION.contentOut }
                  }
                >
                  <IslandContent kind={kind} presentation={presentation} trade={trade} state={state} progress={progress} />
                </motion.div>
              )}
            </AnimatePresence>
            <Lens />
          </motion.div>
        </motion.div>
      </UniswapScope>
      <span role="status" className="sr-only">
        {announcement(trade, state, presentation)}
      </span>
    </div>
  )
}

function area(kind: IslandKind) {
  return ISLAND_SIZE[kind].width * ISLAND_SIZE[kind].height
}

function announcement(trade: ReviewTrade, state: ReviewFlowState, presentation: IslandPresentation) {
  if (presentation.faceId === 'scanning') return 'Confirm with Face ID'
  if (presentation.faceId === 'failed') return 'Face ID cancelled. Nothing was sent.'
  if (state.phase === 'pending') return 'Swap submitted, confirming'
  if (state.phase === 'success')
    return `Swapped ${formatTokenAmount(trade.input.amount)} ${trade.input.token.symbol} for ${formatTokenAmount(state.acceptedOutput)} ${trade.output.token.symbol}`
  return ''
}

/** The front camera, a hint of it: it sits in the same place whatever the island does. */
function Lens() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        width: LENS.size,
        height: LENS.size,
        top: (SENSOR.height - LENS.size) / 2,
        left: `calc(50% + ${LENS.offset - LENS.size / 2}px)`,
        background: 'radial-gradient(circle at 35% 35%, #24243a 0%, #0c0c16 55%, #050507 100%)',
      }}
    />
  )
}

function IslandContent({
  kind,
  presentation,
  trade,
  state,
  progress,
}: {
  kind: IslandKind
  presentation: IslandPresentation
  trade: ReviewTrade
  state: ReviewFlowState
  progress: Progress
}) {
  switch (kind) {
    case 'faceid':
      return (
        <div className="flex h-full items-center justify-center pt-uni-6">
          <FaceIdGlyph status={presentation.faceId} className="size-[60px] text-white" />
        </div>
      )
    case 'compact':
      return <CompactContent trade={trade} state={state} progress={progress} />
    case 'expanded':
      return (
        <PendingBody trade={trade} state={state} progress={progress} className="px-uni-20 pb-[18px]" topRowClassName="mt-uni-6 h-[37px]" />
      )
    case 'alert':
      return <SuccessBody trade={trade} state={state} className="px-uni-20 pt-[14px] pb-uni-16" />
    default:
      return null
  }
}

/* Progress ---------------------------------------------------------------- */

interface Progress {
  value: MotionValue<number>
  etaMs: number
}

/**
 * Pending progress (0-1), shared by the ring, the bar and the countdown. Runs
 * linearly to a cap against the ETA (it never claims done before the chain
 * does), holds when not running, and fills on success.
 */
function usePendingProgress(phase: ReviewPhase, live: DynamicIslandProps['live']): Progress {
  const etaMs = live?.etaMs ?? ISLAND_TIMINGS.flow.confirm
  const resting = (p: ReviewPhase) => (p === 'success' ? 1 : live ? PROGRESS.start : PROGRESS.still)
  const value = useMotionValue(resting(phase))
  const running = live?.running ?? false

  React.useEffect(() => {
    if (phase === 'success') {
      const controls = animate(value, 1, { duration: 0.3, ease: [0.23, 1, 0.32, 1] })
      return () => controls.stop()
    }
    if (phase !== 'pending') {
      value.set(resting(phase))
      return
    }
    if (!running) return
    const left = (PROGRESS.cap - value.get()) / (PROGRESS.cap - PROGRESS.start)
    const controls = animate(value, PROGRESS.cap, { duration: (etaMs / 1000) * Math.max(0, left), ease: 'linear' })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resting` only reads `live`'s presence
  }, [phase, running, etaMs, value])

  return { value, etaMs }
}

/** Seconds left on the ETA, read off the progress. */
function useEtaLabel({ value, etaMs }: Progress) {
  const label = (p: number) => {
    const s = Math.ceil(((PROGRESS.cap - p) / (PROGRESS.cap - PROGRESS.start)) * (etaMs / 1000))
    return s > 0 ? `~${s}s` : 'Any second'
  }
  const [text, setText] = React.useState(() => label(value.get()))
  useMotionValueEvent(value, 'change', (p) => setText(label(p)))
  return text
}

function ProgressRing({ progress, size = 22, done = false }: { progress: Progress; size?: number; done?: boolean }) {
  const stroke = 3
  const r = (size - stroke) / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--uni-surface3)" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={done ? 'var(--uni-statusSuccess)' : 'var(--uni-accent1)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        style={{ pathLength: progress.value }}
      />
    </svg>
  )
}

/* Compact ----------------------------------------------------------------- */

function CompactContent({ trade, state, progress }: { trade: ReviewTrade; state: ReviewFlowState; progress: Progress }) {
  const done = state.phase === 'success'
  return (
    <div className="flex h-full items-center justify-between px-[8px]">
      <Swap k={done ? 'got' : 'pair'}>
        {done ? <TokenLogo token={trade.output.token} size={22} /> : <PairLogos input={trade.input.token} output={trade.output.token} />}
      </Swap>
      <Swap k={done ? 'done' : 'ring'}>
        {done ? <CheckDisc size={22} /> : <ProgressRing progress={progress} />}
      </Swap>
    </div>
  )
}

/** A glyph replaced in place (compact's leading and trailing views). */
function Swap({ k, children }: { k: string; children: React.ReactNode }) {
  const reduce = useReducedMotion() ?? false
  return (
    <span className="relative flex">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={k}
          className="flex"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.8)', filter: 'blur(2px)' }}
          animate={{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)', transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function PairLogos({ input, output, size = 22 }: { input: Token; output: Token; size?: number }) {
  return (
    <span className="flex items-center">
      <TokenLogo token={input} size={size} />
      <TokenLogo token={output} size={size} className="-ml-[7px] ring-2 ring-black" />
    </span>
  )
}

function CheckDisc({ size }: { size: number }) {
  const reduce = useReducedMotion() ?? false
  return (
    <span className="flex items-center justify-center rounded-full bg-statusSuccess text-white" style={{ width: size, height: size }}>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden style={{ width: size * 0.66, height: size * 0.66 }}>
        <motion.path
          d="M4 8.5l2.6 2.6L12 5.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.32, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </span>
  )
}

/* Pending: expanded island and lock screen -------------------------------- */

const STEP_LABEL: Record<ReviewPhase, string> = {
  review: 'Review',
  approve: 'Approving',
  sign: 'Signing',
  pending: 'Confirming',
  success: 'Swapped',
  rejected: 'Cancelled',
}

/**
 * The swap in flight: the step it's on and the ETA, the web surface's
 * conversion track, the amounts, and the steps as one segmented bar.
 */
function PendingBody({
  trade,
  state,
  progress,
  className,
  topRowClassName,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
  progress: Progress
  className?: string
  /** The expanded island's top row sits beside the sensor, at its height. */
  topRowClassName?: string
}) {
  const eta = useEtaLabel(progress)
  const { input, output } = trade
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className={cn('flex items-center justify-between gap-uni-12', topRowClassName)}>
        <span className="flex items-center gap-uni-6 text-body3 text-neutral1">
          <ActiveDot />
          {STEP_LABEL[state.phase]}
        </span>
        <span className="text-body3 text-neutral2 tabular-nums">{eta}</span>
      </div>
      <div className="mt-uni-8 flex items-center">
        <TokenLogo token={input.token} size={32} />
        <IslandTrack input={input.token} output={output.token} flowing={state.phase === 'pending'} />
        <TokenLogo token={output.token} size={32} />
      </div>
      <div className="mt-uni-6 grid grid-cols-2 gap-uni-12">
        <span className="truncate text-subheading2 text-neutral1">
          {formatTokenAmount(input.amount)} {input.token.symbol}
        </span>
        <span className="truncate text-right text-subheading2 text-neutral1">
          {formatTokenAmount(state.acceptedOutput)} {output.token.symbol}
        </span>
      </div>
      <StepBar state={state} progress={progress} className="mt-auto" />
    </div>
  )
}

/** The step waiting on the chain: a dot with a slow halo (as the web steps' active dot). */
function ActiveDot() {
  const reduce = useReducedMotion() ?? false
  return (
    <span aria-hidden className="relative flex size-uni-12 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-full bg-accent2"
        initial={false}
        animate={reduce ? { opacity: 1 } : { transform: ['scale(0.5)', 'scale(1)'], opacity: [1, 0] }}
        transition={reduce ? { duration: 0 } : { duration: 1.6, ease: [0.23, 1, 0.32, 1], repeat: Infinity }}
      />
      <span className="relative size-uni-6 rounded-full bg-accent1" />
    </span>
  )
}

/** One trip along the track (s), and how many tokens ride it at once (as the web surface). */
const FLOW = { duration: 2.1, count: 3 }

/** The web surface's conversion track, island-sized: Sell tokens pass under the connector and leave as Buy. */
function IslandTrack({ input, output, flowing }: { input: Token; output: Token; flowing: boolean }) {
  const reduce = useReducedMotion() ?? false
  return (
    <div className="relative mx-uni-12 flex h-[32px] min-w-0 flex-1 items-center justify-center">
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--uni-neutral3) 1px, transparent 1.5px)',
          backgroundSize: '6px 2px',
          backgroundPosition: 'center',
        }}
      />
      {flowing && !reduce && (
        <span aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: FLOW.count }, (_, i) => (
            <FlowToken key={i} index={i} input={input} output={output} />
          ))}
        </span>
      )}
      <span className="relative z-10 flex size-uni-20 items-center justify-center rounded-full bg-surface3 text-neutral1 ring-4 ring-black">
        <ArrowDown className="size-[12px] -rotate-90" />
      </span>
    </div>
  )
}

function FlowToken({ index, input, output }: { index: number; input: Token; output: Token }) {
  const loop = { duration: FLOW.duration, ease: 'linear', repeat: Infinity, delay: (index * FLOW.duration) / FLOW.count } as const
  return (
    <motion.span
      className="absolute inset-0"
      initial={{ transform: 'translateX(0%)' }}
      animate={{ transform: ['translateX(0%)', 'translateX(100%)'] }}
      transition={loop}
    >
      <span className="absolute top-1/2 left-0 size-[14px] -translate-1/2">
        <motion.span
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0, 0] }}
          transition={{ ...loop, times: [0, 0.12, 0.4, 0.47, 1] }}
        >
          <TokenLogo token={input} size={14} />
        </motion.span>
        <motion.span
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ ...loop, times: [0, 0.53, 0.6, 0.88, 1] }}
        >
          <TokenLogo token={output} size={14} />
        </motion.span>
      </span>
    </motion.span>
  )
}

/**
 * The web surface's steps (approve? · sign · confirm) as one segmented bar:
 * landed segments are filled, the one on the chain fills with the progress.
 */
function StepBar({ state, progress, className }: { state: ReviewFlowState; progress: Progress; className?: string }) {
  const steps = getReviewSteps(state)
  const scale = useTransform(progress.value, (p) => `scaleX(${p})`)
  return (
    <div aria-hidden className={cn('flex gap-uni-4', className)}>
      {steps.map((step) => (
        <span key={step.id} className="relative h-uni-4 flex-1 overflow-hidden rounded-full bg-surface3">
          {step.status === 'complete' && <span className="absolute inset-0 bg-accent1" />}
          {step.status === 'active' && (
            <motion.span className="absolute inset-0 origin-left bg-accent1" style={{ transform: scale }} />
          )}
        </span>
      ))}
    </div>
  )
}

/* Success: alert and lock screen ------------------------------------------ */

/** The web receipt, folded to a glance: what you got, with the check, and what it cost you. */
function SuccessBody({ trade, state, className }: { trade: ReviewTrade; state: ReviewFlowState; className?: string }) {
  const { input, output } = trade
  return (
    <div className={cn('flex h-full flex-col justify-between', className)}>
      <div className="flex items-start justify-between">
        <span className="relative">
          <TokenLogo token={output.token} size={40} />
          <ReceivedBadge />
        </span>
        <span className="flex h-uni-40 items-center text-body3 text-statusSuccess">Swap complete</span>
      </div>
      <div className="flex min-w-0 items-baseline justify-between gap-uni-12">
        <span className="truncate text-heading3 text-neutral1">
          +{formatTokenAmount(state.acceptedOutput)} {output.token.symbol}
        </span>
        <span className="shrink-0 text-body3 text-neutral2">
          for {formatTokenAmount(input.amount)} {input.token.symbol}
        </span>
      </div>
    </div>
  )
}

/** The web receipt's badge: lands on the Buy logo's corner, the check draws, one ring pulses. */
function ReceivedBadge() {
  const reduce = useReducedMotion() ?? false
  return (
    <span className="absolute -right-[3px] -bottom-[3px] flex size-[18px] items-center justify-center rounded-full ring-[3px] ring-black">
      <CheckDisc size={18} />
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-statusSuccess"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
    </span>
  )
}

/* Other presentations ----------------------------------------------------- */

/**
 * The minimal presentation: when another app's activity holds the island,
 * the swap shrinks to a bubble beside it: the ring around what you're buying.
 */
export function IslandMinimal({ trade, state }: { trade: ReviewTrade; state: ReviewFlowState }) {
  const progress = usePendingProgress(state.phase, undefined)
  const done = state.phase === 'success'
  return (
    <UniswapScope theme="dark" className="bg-transparent">
      <span
        className="relative flex items-center justify-center rounded-full bg-black"
        style={{ width: MINIMAL_SIZE, height: MINIMAL_SIZE }}
      >
        {done ? (
          <CheckDisc size={24} />
        ) : (
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <ProgressRing progress={progress} size={29} />
            </span>
            <TokenLogo token={trade.output.token} size={17} />
          </>
        )}
      </span>
    </UniswapScope>
  )
}

/**
 * The same activity on the Lock Screen (and as a banner on older iPhones):
 * no sensor to work around, so the pending layout gets a little more room.
 */
export function LiveActivityCard({
  trade,
  state,
  live,
  className,
}: {
  trade: ReviewTrade
  state: ReviewFlowState
  live?: DynamicIslandProps['live']
  className?: string
}) {
  const progress = usePendingProgress(state.phase, live)
  return (
    <UniswapScope
      theme="dark"
      className={cn('w-[361px] rounded-[24px] bg-black/70 text-neutral1 backdrop-blur-2xl', className)}
    >
      {state.phase === 'success' ? (
        <SuccessBody trade={trade} state={state} className="h-[112px] p-uni-16" />
      ) : (
        <PendingBody trade={trade} state={state} progress={progress} className="h-[148px] p-uni-16" />
      )}
    </UniswapScope>
  )
}
