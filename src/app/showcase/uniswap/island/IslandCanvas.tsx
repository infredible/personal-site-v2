'use client'

import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { PhoneFrame, PhoneHomeIndicator, PhoneStatusBar } from '@/components/showcase'
import { phoneChrome } from './LiveIsland'
import { UniswapScope } from '@/components/uniswap'
import { ReviewSurface, getReviewPreset } from '@/components/uniswap/swap/review'
import {
  DynamicIsland,
  ISLAND_PRESENTATIONS,
  ISLAND_SIZE,
  IslandMinimal,
  IslandPhone,
  LiveActivityCard,
  SENSOR,
  getIslandPreset,
  restingPresentation,
  type IslandPresentation,
  type IslandPreset,
} from '@/components/uniswap/swap/island'
import { cn } from '@/lib/utils'

/*
 * Canvas view of the iPhone translation: the flow phone by phone, every
 * island presentation at 1:1, the lock screen, what each part of the web
 * surface became, both themes, and the motion spec. Frames are static (no
 * timers); the flow itself plays in the Component view.
 */

const { COMPACT, EXPANDED, ALERT, SCANNING, SIGNED, DECLINED, IDLE } = ISLAND_PRESENTATIONS

function preset(id: string): IslandPreset {
  const p = getIslandPreset(id)
  if (!p) throw new Error(`Unknown island preset: ${id}`)
  return p
}

/** A whole phone, at a fraction of its size. Follows the site theme unless forced. */
function Phone({
  id,
  presentation,
  theme,
  scale = 0.6,
}: {
  id: string
  presentation?: IslandPresentation
  theme?: 'light' | 'dark'
  scale?: number
}) {
  const p = preset(id)
  return (
    <PhoneFrame scale={scale}>
      <UniswapScope theme={theme} className="h-full">
        <IslandPhone
          trade={p.trade}
          state={p.state}
          presentation={presentation ?? p.presentation ?? restingPresentation(p.state.phase)}
          onClose={() => {}}
          chrome={phoneChrome}
        />
      </UniswapScope>
    </PhoneFrame>
  )
}

/** The top of the screen at 1:1: the island over the status bar it covers. */
function Strip({
  id,
  presentation,
  theme,
  condensed = presentation.kind === 'compact',
  children,
}: {
  id: string
  presentation: IslandPresentation
  theme?: 'light' | 'dark'
  condensed?: boolean
  children?: React.ReactNode
}) {
  const p = preset(id)
  const height = Math.max(ISLAND_SIZE[presentation.kind].height + 40, 96)
  return (
    <UniswapScope
      theme={theme}
      className="relative overflow-hidden rounded-[28px] bg-surface1 text-neutral1 ring-1 ring-surface3"
      style={{ width: 393, height }}
    >
      <PhoneStatusBar condensed={condensed} />
      <DynamicIsland trade={p.trade} state={p.state} presentation={presentation} />
      {children}
    </UniswapScope>
  )
}

/* Flow -------------------------------------------------------------------- */

const FLOW: { frame: string; preset: string; title: string; note: string; presentation?: IslandPresentation }[] = [
  {
    frame: 'review',
    preset: 'review',
    title: 'Review',
    note: 'The web review card, as a sheet: amounts, details, one button. The Face ID glyph on it says what pressing it does.',
  },
  {
    frame: 'review-approval',
    preset: 'review-approval',
    title: 'Review · needs approval',
    note: 'On the web, an approval is a second wallet prompt. In the app it’s a word on the button: the same scan signs both.',
  },
  {
    frame: 'face-id',
    preset: 'face-id',
    title: 'Face ID',
    note: 'The system’s own Face ID square, in the island. The sheet holds the amounts you’re signing.',
  },
  {
    frame: 'signed',
    preset: 'signed',
    title: 'Signed',
    note: 'The check lands; the sheet slides away and the form behind it clears. The island keeps the swap.',
  },
  {
    frame: 'compact',
    preset: 'compact',
    title: 'Live Activity · compact',
    note: 'The pair leading, a ring trailing. It’s still there if you leave the app.',
  },
  {
    frame: 'expanded',
    preset: 'expanded',
    title: 'Live Activity · expanded',
    note: 'Tapped open: what the chain is doing, the ETA, the web surface’s conversion track, and its steps as one bar.',
  },
  {
    frame: 'success',
    preset: 'success',
    title: 'Swap complete',
    note: 'The island opens on its own with the receipt: Buy with the check badge, what you got, what it cost.',
  },
  {
    frame: 'settled',
    preset: 'success',
    title: 'Settled',
    note: 'After 3.5s the alert folds to compact with its check; 3s later the activity ends.',
    presentation: COMPACT,
  },
  {
    frame: 'rejected',
    preset: 'rejected',
    title: 'Face ID cancelled',
    note: 'The island shakes and goes back to rest. The sheet never left, so Try again is where you already are.',
  },
]

/* Presentations ----------------------------------------------------------- */

const PRESENTATIONS: { frame: string; preset: string; title: string; note: string; presentation: IslandPresentation; size: string }[] = [
  { frame: 'rest', preset: 'review', title: 'At rest', note: 'The sensor housing; everything grows around it.', presentation: IDLE, size: 'idle' },
  { frame: 'faceid', preset: 'face-id', title: 'Face ID · scanning', note: 'Corners breathe while it looks.', presentation: SCANNING, size: 'faceid' },
  { frame: 'faceid-ok', preset: 'signed', title: 'Face ID · matched', note: 'The face gives way to a check; holds 750ms.', presentation: SIGNED, size: 'faceid' },
  { frame: 'faceid-no', preset: 'rejected', title: 'Face ID · cancelled', note: 'Shakes sideways, then rests.', presentation: DECLINED, size: 'faceid' },
  { frame: 'compact', preset: 'compact', title: 'Compact', note: 'Leading and trailing views only; nothing crosses the sensor.', presentation: COMPACT, size: 'compact' },
  { frame: 'compact-done', preset: 'success', title: 'Compact · done', note: 'The ring becomes the check; Buy takes the leading view.', presentation: COMPACT, size: 'compact' },
  { frame: 'expanded', preset: 'expanded', title: 'Expanded', note: 'Top row beside the sensor; the rest below it.', presentation: EXPANDED, size: 'expanded' },
  { frame: 'alert', preset: 'success', title: 'Alert', note: 'The receipt at the system’s alert size.', presentation: ALERT, size: 'alert' },
]

function sizeLabel(kind: string) {
  const s = ISLAND_SIZE[kind as keyof typeof ISLAND_SIZE]
  return `${s.width} × ${s.height}pt, r${s.radius}`
}

/** Minimal: another app's activity has the island, so the swap waits beside it as a bubble. */
function MinimalStrip() {
  const p = preset('compact')
  return (
    <Strip id="compact" presentation={IDLE} condensed>
      <span className="absolute top-[11px]" style={{ left: `calc(50% + ${SENSOR.width / 2 + 6}px)` }}>
        <IslandMinimal trade={p.trade} state={p.state} />
      </span>
    </Strip>
  )
}

/** The lock screen, with the activity under the clock. */
function LockScreen({ id }: { id: string }) {
  const p = preset(id)
  return (
    <PhoneFrame scale={0.6}>
      <div
        className="relative h-full w-full text-white"
        style={{ background: 'radial-gradient(120% 80% at 20% 0%, #ff37c7 0%, #7b1fa2 38%, #1a0b2e 75%, #07030d 100%)' }}
      >
        <PhoneStatusBar />
        <DynamicIsland trade={p.trade} state={p.state} presentation={IDLE} />
        <div className="absolute inset-x-0 top-[100px] flex flex-col items-center">
          <span className="text-[22px] leading-none font-semibold opacity-90">Saturday 24 October</span>
          <span className="mt-[2px] text-[104px] leading-none font-semibold tracking-[-0.03em]">9:41</span>
        </div>
        <div className="absolute inset-x-0 top-[330px] flex justify-center">
          <LiveActivityCard trade={p.trade} state={p.state} />
        </div>
        <PhoneHomeIndicator />
      </div>
    </PhoneFrame>
  )
}

/* Web → iPhone ------------------------------------------------------------ */

const MAPPING: [string, string, string][] = [
  ['Review card', 'Review sheet', 'The same amounts and details, at the bottom of the screen where your thumb already is.'],
  ['Approve in wallet, then Confirm in wallet', 'One Face ID, in the island', 'The app is the wallet: one scan signs the approval and the swap. Two prompts become one glance.'],
  ['Amounts turn side by side', 'Not on the sheet', 'The sheet’s job ends at commit, so it never morphs; the pair reappears in the island.'],
  ['Title (Swapping)', 'Step label, leading', 'Beside the sensor: what the chain is doing now, with the web steps’ active dot.'],
  ['Conversion track', 'Expanded track', 'The same dotted track, connector and tokens riding it, at island size on black.'],
  ['Steps (approve, sign, confirm)', 'Segmented bar', 'Three rows don’t fit in 148pt; three segments do, filling in the same order.'],
  ['~14s beside the active step', 'ETA trailing; ring in compact', 'One progress value drives the ring, the bar’s last segment and the countdown.'],
  ['Receipt (Buy grows, arrow → check)', 'Alert, unprompted', 'The island opens by itself: the Buy logo with the check badge, what you got, what it cost.'],
  ['One button, relabelled', 'Tap to open, tap to fold', 'The island isn’t a control. The sheet’s button ends at commit; the island only opens and folds.'],
  ['Rejected: red step, Try again', 'Shake, rest; Try again on the sheet', 'Face ID’s own no. Nothing was sent, and the sheet is still up to retry from.'],
  ['Price updated', 'Sheet only', 'A re-quote needs a decision, so it stays on the sheet. The island never asks questions.'],
]

function WebPair({ web, island, presentation }: { web: string; island: string; presentation: IslandPresentation }) {
  const w = getReviewPreset(web)!
  return (
    <div className="flex items-start gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs leading-4 font-medium text-muted-foreground">Web</span>
        <UniswapScope style={{ width: 420 }}>
          <ReviewSurface trade={w.trade} state={w.state} onClose={() => {}} onAction={() => {}} />
        </UniswapScope>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs leading-4 font-medium text-muted-foreground">iPhone</span>
        <Strip id={island} presentation={presentation} />
      </div>
    </div>
  )
}

/* Motion spec ------------------------------------------------------------- */

const MOTION_SPEC: [string, string, string, string][] = [
  ['Island grows', '450ms', 'spring, bounce 0.32', 'Width, height and radius together; overshoots, as the system’s does'],
  ['Island settles', '380ms', 'spring, bounce 0.16', 'Folding back barely overshoots'],
  ['Content in', '280ms after 100ms', 'ease-out (0.23, 1, 0.32, 1)', 'Scale 0.92 → 1 from the top, 6px blur. Laid out at its final size and clipped by the growing shape'],
  ['Content out', '120ms', 'ease-out', 'Scale 0.96, 4px blur. Exits beat entries'],
  ['Face ID scan', '1.2s loop', 'ease-in-out', 'Corners breathe 1 → 0.9'],
  ['Face ID match', '320ms draw', 'ease-in-out', 'Face out, check in; holds 750ms, then hands over to compact'],
  ['Face ID cancel', '550ms', 'ease-out', 'Sideways shake, 14px dying to 0; rests after 1.3s'],
  ['Sheet out', '420ms', 'spring, no bounce', 'Leaves as Face ID lands; the form behind it clears'],
  ['Progress', 'the ETA', 'linear', 'Ring, bar and countdown share one value; it caps at 92% until the chain confirms'],
  ['Success', '3.5s, then 3s', 'n/a', 'Alert unprompted, folds to compact with its check, then the activity ends'],
  ['Reduced motion', '200ms', 'ease-out', 'No bounce, blur, shake or flow: shapes tween, content crossfades'],
]

const TIMINGS: [string, string][] = [
  ['Face ID (approval, if needed)', '0.9s'],
  ['Face ID (swap)', '1.3s'],
  ['Submitted → confirmed', '6s'],
  ['Face ID cancelled', '1.3s'],
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

export function IslandCanvas({ controller }: { controller: CanvasController }) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2200} initialFocus="flow" aria-label="Dynamic Island canvas">
      <CanvasSection
        id="flow"
        title="Flow"
        description="The web surface morphs through every state on one card. On iPhone the card’s job ends at commit: the sheet reviews, Face ID signs in the island, and the island carries the swap from there, in or out of the app."
      >
        {FLOW.map((f) => (
          <CanvasFrame key={f.frame} id={`flow-${f.frame}`} title={f.title} note={f.note} width={250}>
            <Phone id={f.preset} presentation={f.presentation} />
          </CanvasFrame>
        ))}
      </CanvasSection>

      <CanvasSection
        id="island"
        title="Island"
        description="Every presentation at 1:1, over the status bar it covers. The island is hardware, so it’s black in both themes and its content uses Uniswap’s dark tokens."
      >
        {PRESENTATIONS.map((p) => (
          <CanvasFrame key={p.frame} id={`island-${p.frame}`} title={p.title} note={`${p.note} ${sizeLabel(p.size)}`}>
            <Strip id={p.preset} presentation={p.presentation} />
          </CanvasFrame>
        ))}
        <CanvasFrame id="island-minimal" title="Minimal" note="Another app’s activity has the island: the swap waits beside it, the ring around Buy.">
          <MinimalStrip />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="lock-screen" title="Lock Screen" description="The same activity under the clock, with no sensor to work around.">
        <CanvasFrame id="lock-pending" title="Swapping" note="Expanded layout, in a card." width={250}>
          <LockScreen id="compact" />
        </CanvasFrame>
        <CanvasFrame id="lock-success" title="Swap complete" note="The receipt stays until you clear it." width={250}>
          <LockScreen id="success" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="web-to-iphone"
        title="Web → iPhone"
        description="What each part of the web surface became. The language carries over (track, connector, check badge, one progress order); the layout answers to the island."
      >
        <CanvasFrame id="mapping" title="Mapping" note="Web review surface → iPhone app">
          <div className="w-[820px] max-w-full rounded-2xl border border-border bg-background p-4">
            <SpecTable head={['Web', 'iPhone', 'Why']} rows={MAPPING} />
          </div>
        </CanvasFrame>
        <CanvasFrame id="pair-pending" title="In flight" note="Track, steps and ETA, folded into 148pt.">
          <WebPair web="pending" island="expanded" presentation={EXPANDED} />
        </CanvasFrame>
        <CanvasFrame id="pair-success" title="Receipt" note="Buy with its check badge; the details stay in the app.">
          <WebPair web="success" island="success" presentation={ALERT} />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="themes" title="Light / dark" description="The app follows the theme; the island doesn’t.">
        {(['review', 'compact'] as const).map((id) =>
          (['light', 'dark'] as const).map((theme) => (
            <CanvasFrame key={`${id}-${theme}`} id={`theme-${id}-${theme}`} title={`${preset(id).label} · ${theme}`} width={250}>
              <Phone id={id} theme={theme} />
            </CanvasFrame>
          )),
        )}
      </CanvasSection>

      <CanvasSection
        id="motion"
        title="Motion"
        description="The island is a spring; everything inside it is a short ease-out. Every change is interruptible: a tap or a phase retargets from wherever the shape is."
      >
        <CanvasFrame id="motion-spec" title="Motion spec" note="Durations and curves used by the island">
          <div className="w-[820px] max-w-full rounded-2xl border border-border bg-background p-4">
            <SpecTable head={['Moment', 'Duration', 'Curve', 'Notes']} rows={MOTION_SPEC} />
          </div>
        </CanvasFrame>
        <CanvasFrame id="motion-timings" title="Simulated timings" note="What the island flow waits for">
          <div className="w-[320px] max-w-full rounded-2xl border border-border bg-background p-4">
            <SpecTable head={['Step', 'Wait']} rows={TIMINGS} />
          </div>
        </CanvasFrame>
      </CanvasSection>
    </Canvas>
  )
}
