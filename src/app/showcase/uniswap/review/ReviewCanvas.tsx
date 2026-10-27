'use client'

import { AnimatePresence } from 'framer-motion'
import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { ModalSurface, UniswapScope } from '@/components/uniswap'
import { SwapReviewPanel, type SwapReviewStatus } from '@/components/uniswap/swap/overlays'
import {
  ETH_TO_USDC,
  ReviewAmounts,
  ReviewButton,
  ReviewDetails,
  ReviewHeader,
  ReviewReceipt,
  ReviewSteps,
  ReviewSurface,
  getReviewPreset,
  type ReviewScenario,
} from '@/components/uniswap/swap/review'
import { cn } from '@/lib/utils'

/*
 * Canvas view of the redesigned review flow: the live surface taken apart,
 * every state as a frame, production next to the redesign, both themes, and
 * the motion spec. Frames are static (no timers); hover, focus and tooltips work.
 */

const CARD_WIDTH = 420

function scenario(id: string): ReviewScenario {
  const p = getReviewPreset(id)
  if (!p) throw new Error(`Unknown review preset: ${id}`)
  return p
}

/** A Uniswap-scoped surface for a frame. Follows the site theme unless forced. */
function Stage({
  theme,
  width = CARD_WIDTH,
  card = false,
  bare = false,
  className,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  /** Exploded-view card: its background fades in behind a part flying into it */
  card?: boolean
  /** No padding or background: for frames that hold a whole card */
  bare?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <UniswapScope
      theme={theme}
      data-explode-card={card ? '' : undefined}
      className={cn(bare ? 'bg-transparent' : 'rounded-uni-24 bg-surface1 p-uni-16', className)}
      style={{ width, maxWidth: '100%' }}
    >
      {children}
    </UniswapScope>
  )
}

function Surface({ id, theme, receiptOpen }: { id: string; theme?: 'light' | 'dark'; receiptOpen?: boolean }) {
  const s = scenario(id)
  return (
    <Stage theme={theme} bare>
      <ReviewSurface trade={s.trade} state={s.state} onClose={() => {}} onAction={() => {}} defaultReceiptOpen={receiptOpen} />
    </Stage>
  )
}

/* Anatomy ----------------------------------------------------------------- */

type PartId = 'header' | 'amounts' | 'details' | 'steps' | 'receipt' | 'action'

const PARTS: { id: PartId; label: string; note: string }[] = [
  { id: 'header', label: 'Header', note: 'Title follows the phase (swapping → swapped) in a fixed-height row, so it can’t nudge what’s below.' },
  { id: 'amounts', label: 'Amounts', note: 'Sell over Buy while reviewing. Once you commit they turn side by side, smaller, with Sell flowing into Buy along the track.' },
  { id: 'details', label: 'Details', note: 'While reviewing. Collapses away when you commit: you’ve already read it.' },
  { id: 'steps', label: 'Steps', note: 'Replaces the details once you commit. Only the steps this trade needs, progressing in place.' },
  { id: 'receipt', label: 'Receipt', note: 'Takes over the card on success: the token you got, and the transaction (what you gave, rate, costs) folded behind one row.' },
  { id: 'action', label: 'Action', note: 'One button for the whole flow, relabelled in place. It never unmounts.' },
]

function ReviewAnatomy({ trade, state }: ReviewScenario) {
  const node: Record<PartId, React.ReactNode> = {
    header: <ReviewHeader phase={state.phase} onClose={() => {}} />,
    amounts: <ReviewAmounts trade={trade} state={state} />,
    details: <ReviewDetails trade={trade} state={state} />,
    steps: <ReviewSteps trade={trade} state={state} />,
    // Shown at its success state whatever the live flow is on: it's what the flow ends in
    receipt: (
      <AnimatePresence initial={false}>
        <ReviewReceipt key="receipt" trade={trade} state={{ ...state, phase: 'success', approved: state.needsApproval }} />
      </AnimatePresence>
    ),
    action: <ReviewButton trade={trade} state={state} />,
  }
  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live surface, taken apart, in the state you left it. Details and steps share one region, and the receipt replaces both: only one is ever on the card."
      direction="column"
    >
      {PARTS.map((part) => (
        <CanvasFrame key={part.id} id={`part-${part.id}`} title={part.label} note={part.note} labelPlacement="side">
          {/* Card padding + border match the surface's, so parts land at the same width */}
          <Stage card width={CARD_WIDTH - 2}>
            <div data-explode-target={part.id}>{node[part.id]}</div>
          </Stage>
        </CanvasFrame>
      ))}
    </CanvasSection>
  )
}

/* States ------------------------------------------------------------------ */

const STATES: { id: string; title: string; note: string; receiptOpen?: boolean }[] = [
  { id: 'review', title: 'Review', note: 'Amounts lead, details sit under one hairline, one button. This layout survives every state that follows.' },
  { id: 'review-approval', title: 'Review · needs approval', note: 'The approval is a detail row and a word on the button, not an extra screen to discover later.' },
  { id: 'price-updated', title: 'Price updated', note: 'The amounts keep the price you accepted; the main button asks for the new one. No second button to miss.' },
  { id: 'approve', title: 'Approve in wallet', note: 'The amounts turn side by side, Sell flowing into Buy; details give way to the steps. Approval is step one of three.' },
  { id: 'wallet', title: 'Confirm in wallet', note: 'The button is where you were looking; it says what to do and spins while the wallet is open.' },
  { id: 'pending', title: 'Pending', note: 'The track fills as each step lands. Rows have fixed heights, so waiting never resizes the card.' },
  { id: 'success', title: 'Success', note: 'The whole card becomes the receipt: Buy grows to the middle, the connector lands on it as the check; what you sold moves into the details.' },
  { id: 'success', title: 'Success · details open', note: 'The transaction, one tap away: rate, what you sold, costs, timing and the explorer link, folded under the receipt.', receiptOpen: true },
  { id: 'rejected', title: 'Rejected', note: 'Recoverable: the declined step turns red, one line says nothing was sent, Try again resumes that step.' },
]

/* Before / after ---------------------------------------------------------- */

const PAIRS: { id: string; title: string; note: string; production: SwapReviewStatus; stage?: 'wallet' | 'submitted'; after: string }[] = [
  {
    id: 'review',
    title: 'Review',
    note: 'Same facts. Production hides rate and slippage behind Show more; the redesign shows the four that matter and nothing else.',
    production: 'review',
    after: 'review',
  },
  {
    id: 'wallet',
    title: 'Waiting on the wallet',
    note: 'Production swaps the details for a divider and a new step list, and greys the button. The redesign collapses details into steps under the same amounts.',
    production: 'pending',
    stage: 'wallet',
    after: 'wallet',
  },
  {
    id: 'submitted',
    title: 'Submitted',
    note: 'Production rewrites the step’s title and spinner. The redesign marks the signature done and moves the active dot down the track.',
    production: 'pending',
    stage: 'submitted',
    after: 'pending',
  },
  {
    id: 'success',
    title: 'Success',
    note: 'Both hand the card to a success screen. Production cuts to a new one; the redesign gets there by moving what was already on it: Buy grows into the hero, the arrow becomes the check, the details fold away.',
    production: 'success',
    after: 'success',
  },
]

function BeforeAfter({ production, stage, after }: (typeof PAIRS)[number]) {
  const s = scenario(after)
  return (
    <div className="flex items-start gap-8">
      {[
        { label: 'Production today', node: <ProductionPanel status={production} stage={stage} /> },
        { label: 'Redesign', node: <ReviewSurface trade={s.trade} state={s.state} onClose={() => {}} onAction={() => {}} /> },
      ].map(({ label, node }) => (
        <div key={label} className="flex flex-col gap-2">
          <span className="text-xs leading-4 font-medium text-muted-foreground">{label}</span>
          <Stage bare>{node}</Stage>
        </div>
      ))}
    </div>
  )
}

function ProductionPanel({ status, stage = 'wallet' }: { status: SwapReviewStatus; stage?: 'wallet' | 'submitted' }) {
  return (
    <ModalSurface>
      <SwapReviewPanel
        input={{ token: ETH_TO_USDC.trade.input.token, amount: ETH_TO_USDC.trade.input.amount }}
        output={{ token: ETH_TO_USDC.trade.output.token, amount: ETH_TO_USDC.outputAmount }}
        quote={ETH_TO_USDC.trade.quote}
        slippage={ETH_TO_USDC.trade.slippage}
        status={status}
        pendingStage={stage}
        needsApproval={false}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    </ModalSurface>
  )
}

/* Motion spec ------------------------------------------------------------- */

const MOTION_SPEC: [string, string, string, string][] = [
  ['Height morph', '300ms', 'cubic-bezier(0.32, 0.72, 0, 1)', 'Measured. Only the bottom edge moves; retargets mid-morph'],
  ['Layout morph', '300ms', 'cubic-bezier(0.32, 0.72, 0, 1)', 'Logos and connector travel as shared elements, with the height; text fades out, settles in after 80-200ms'],
  ['Conversion', '2.1s loop', 'linear', 'Track draws in; three Sell tokens ride it, pass under the connector and leave as Buy. Stops on decline'],
  ['Details out', '150ms', 'ease-out (0.23, 1, 0.32, 1)', 'Fade + 4px blur. Exits beat entries'],
  ['Steps in', '220ms, +50ms each', 'ease-out', '6px rise + 3px blur, after a 60ms beat'],
  ['Label / title swap', '180ms in, 120ms out', 'ease-out', 'Crossfade in place with 2px blur'],
  ['Step lands', '200ms + 300ms track', 'ease-out', 'Glyph pops from 0.8; the track fills after it'],
  ['Success', '~600ms', 'ease-in-out draw, ease-out ring', 'Connector lands on Buy as the badge, check draws, one ring pulses'],
  ['Reduced motion', 'same', 'n/a', 'Opacity only: no blur, rise, ring or flow; layouts and heights jump'],
]

const TIMINGS: [string, string][] = [
  ['Approve (wallet + landing)', '1.7s'],
  ['Sign in wallet', '1.5s'],
  ['Submitted → confirmed', '2.2s'],
  ['Wallet rejects', '1.1s'],
]

function SpecTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          {head.map((h) => (
            <th key={h} className="py-2 pr-6 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]} className="border-b border-border/60 last:border-0">
            {row.map((cell, i) => (
              <td key={i} className={cn('py-2 pr-6 align-top', i === 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* Canvas ------------------------------------------------------------------ */

export function ReviewCanvas({ controller, anatomy }: { controller: CanvasController; anatomy: ReviewScenario }) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2000} initialFocus="anatomy" aria-label="Swap review canvas">
      <ReviewAnatomy {...anatomy} />

      <CanvasSection
        id="states"
        title="States"
        description="One surface, eight states, in flow order. The card is top-anchored, so between any two of these only the bottom edge moves; the amounts are the same pixels in all of them."
      >
        {STATES.map((s) => (
          <CanvasFrame key={s.title} id={`state-${s.id}${s.receiptOpen ? '-details' : ''}`} title={s.title} note={s.note}>
            <Surface id={s.id} receiptOpen={s.receiptOpen} />
          </CanvasFrame>
        ))}
      </CanvasSection>

      <CanvasSection
        id="before-after"
        title="Before / after"
        description="Production (left, ported from Uniswap) shows each moment as its own screen: the content you were reading is replaced every step. The redesign (right) keeps one surface and changes only what changed."
      >
        {PAIRS.map((pair) => (
          <CanvasFrame key={pair.id} id={`pair-${pair.id}`} title={pair.title} note={pair.note}>
            <BeforeAfter {...pair} />
          </CanvasFrame>
        ))}
      </CanvasSection>

      <CanvasSection id="themes" title="Light / dark" description="Uniswap tokens throughout; the status colors carry the meaning in both themes.">
        {(['review', 'pending', 'success', 'rejected'] as const).map((id) =>
          (['light', 'dark'] as const).map((theme) => (
            <CanvasFrame key={`${id}-${theme}`} id={`theme-${id}-${theme}`} title={`${STATES.find((s) => s.id === id)!.title} · ${theme}`}>
              <Stage theme={theme} width={CARD_WIDTH + 48} className="p-uni-24">
                <ReviewSurface trade={scenario(id).trade} state={scenario(id).state} onClose={() => {}} onAction={() => {}} />
              </Stage>
            </CanvasFrame>
          )),
        )}
      </CanvasSection>

      <CanvasSection
        id="motion"
        title="Motion"
        description="Every UI step stays under 300ms with strong ease-out curves; only the success moment runs longer. Everything is interruptible: any state change retargets from wherever the motion is."
      >
        <CanvasFrame id="motion-spec" title="Motion spec" note="Durations and curves used by the surface">
          <div className="w-[780px] max-w-full rounded-2xl border border-border bg-background p-4">
            <SpecTable head={['Moment', 'Duration', 'Curve', 'Notes']} rows={MOTION_SPEC} />
          </div>
        </CanvasFrame>
        <CanvasFrame id="motion-timings" title="Simulated timings" note="What useReviewFlow waits for at each step">
          <div className="w-[320px] max-w-full rounded-2xl border border-border bg-background p-4">
            <SpecTable head={['Step', 'Wait']} rows={TIMINGS} />
          </div>
        </CanvasFrame>
      </CanvasSection>
    </Canvas>
  )
}
