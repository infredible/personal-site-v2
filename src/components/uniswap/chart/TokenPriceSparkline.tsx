'use client'

import * as React from 'react'
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '../SegmentedControl'
import { Shimmer, TextSkeleton } from '../Skeleton'
import { ArrowUpRight, ArrowsLeftRight, Check, Heart, HeartOutline, LineChartDots, MoreHorizontal } from '../icons'
import { Copy } from 'lucide-react'
import { UniMenu, UniMenuContent, UniMenuItem, UniMenuSeparator, UniMenuTrigger } from '../UniMenu'
import { TokenLogo } from '../swap/parts/TokenLogo'
import type { Token } from '../swap/types'
import {
  CHART_PERIODS,
  LIVE_WINDOW_MS,
  getMockPriceHistory,
  isStablecoin,
  type ChartPeriod,
  type PricePoint,
} from './mockPriceHistory'
import {
  CANDLE_BODY,
  LIVE_CANDLE_MS,
  VIEW_H,
  VIEW_W,
  areaPath,
  axisTicks,
  candleGlyphs,
  candleIndexAt,
  candlePaths,
  glyph,
  toCandles,
  directionOf,
  formatAxisTime,
  formatChartTime,
  formatFiatDelta,
  formatPercentAbs,
  formatTokenPrice,
  linePath,
  percentChange,
  valueRange,
  valueToViewY,
  viewYToValue,
  sampleY,
  waveY,
  xAt,
  type Candle,
  type CandleGlyph,
  type ChartType,
  type PriceDirection,
} from './sparkline'
import { useLivePriceHistory, type LiveClock } from './useLivePriceHistory'

/*
 * TokenPriceSparkline: the mini price chart Uniswap web shows beside the swap
 * box on wide screens (apps/web/src/pages/Swap/Swap/SlideoutChartCard):
 * token row, price + change with a Live…1Y period selector beside it, and a
 * line chart with a fill fading down from the line, over time labels. Live
 * streams a point every 500ms and animates like Liveline. Hover or touch-drag scrubs: a crosshair
 * and dot follow the pointer and the header shows that point's price, change
 * from the period start, and time; leaving reverts to the latest price.
 *
 * With a `priceLine` (the swap's Limit tab), a dashed line marks the limit
 * price across the chart, with its distance from market in a pill. Dragging
 * it moves the price (snapping to the presets); the y range takes the line in,
 * but holds still mid-drag so the line stays under the pointer, and eases to
 * fit once it's let go.
 *
 * The token bar switches between the line and candlesticks (OHLC per hour on
 * 1D, per 5 seconds on Live): scrubbing then steps candle by candle, the
 * header shows each one's close, and an O/H/L/C readout sits over the chart.
 * Switching morphs the line into candles and back.
 *
 * Exported in parts (header, chart, period selector) so the showcase canvas can
 * lay out the same components one by one.
 */

/* Model ------------------------------------------------------------------- */

export interface SparklineModel {
  token: Token
  period: ChartPeriod
  points: PricePoint[]
  /** viewBox y per point */
  ys: number[]
  /** The value range `ys` are drawn in */
  scale: { lo: number; range: number }
  /** An extra value the range takes in (a price line) */
  include?: number
  start: number
  end: number
  /** OHLC over the points (see toCandles); the candlestick view draws these */
  candles: Candle[]
  /** Change over the period, as a fraction */
  change: number
  direction: PriceDirection
  /** Live period: the feed's clock, which the chart reads every frame to scroll */
  clock?: LiveClock
}

/**
 * `paused` holds a live feed still (pass it while scrubbing, so the point under
 * the pointer stays put); other periods ignore it.
 */
export function useSparklineModel(
  token: Token,
  period: ChartPeriod,
  { paused = false, include }: { paused?: boolean; include?: number } = {},
): SparklineModel {
  const isLive = period === 'LIVE'
  const feed = useLivePriceHistory(token, { enabled: isLive, paused })
  const livePoints = isLive ? feed.points : null
  return React.useMemo(() => {
    const points = livePoints ?? getMockPriceHistory(token, period)
    const start = points[0].value
    const end = points[points.length - 1].value
    const change = percentChange(start, end)
    const scale = valueRange(points, { stablecoin: isStablecoin(token), include })
    return {
      token,
      period,
      points,
      ys: points.map((p) => valueToViewY(p.value, scale)),
      scale,
      candles: toCandles(points, { live: !!livePoints }),
      include,
      start,
      end,
      change,
      direction: directionOf(change),
      clock: livePoints ? feed.clock : undefined,
    }
  }, [token, period, livePoints, feed.clock, include])
}

/** Line color by direction: success up, critical down, neutral when it rounds to 0.00% */
const DIRECTION_TEXT: Record<PriceDirection, string> = {
  up: 'text-statusSuccess',
  down: 'text-statusCritical',
  flat: 'text-neutral2',
}

/* Delta ------------------------------------------------------------------- */

/** Uniswap's ArrowChange (a rounded triangle), pointing down; rotated for up */
export function DeltaTriangle({ direction, className }: { direction: PriceDirection; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={direction === 'flat' ? 'unchanged' : direction}
      className={cn('size-uni-16 shrink-0', direction !== 'down' && 'rotate-180', className)}
    >
      <path
        d="M10.6979 16.2453L6.31787 9.75247C5.58184 8.66118 6.2058 7 7.35185 7L16.6482 7C17.7942 7 18.4182 8.66243 17.6821 9.75247L13.3021 16.2453C12.623 17.2516 11.377 17.2516 10.6979 16.2453Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** "▲ $62.07 (1.84%)", colored by direction (PriceChartDelta with the fiat delta) */
export function PriceDelta({ start, end, className }: { start: number; end: number; className?: string }) {
  const change = percentChange(start, end)
  const direction = directionOf(change)
  const color = direction === 'up' ? 'text-statusSuccess' : direction === 'down' ? 'text-statusCritical' : 'text-neutral3'
  return (
    <span className={cn('inline-flex items-center gap-uni-4 text-body2 tabular-nums', color, className)}>
      <DeltaTriangle direction={direction} />
      <span>
        {formatFiatDelta(Math.abs(end - start))} ({formatPercentAbs(change)})
      </span>
    </span>
  )
}

/* Header ------------------------------------------------------------------ */

export interface SparklineHeaderProps {
  model: SparklineModel
  /** Scrubbed point, or null for the latest price */
  hoverIndex?: number | null
  /** Price history hasn't arrived: price and change are skeletons (the token row is already known) */
  loading?: boolean
  /** Rendered right of the price, top-aligned (the card puts the period selector here) */
  aside?: React.ReactNode
  /** The pair's other token: shows a button in the token bar that switches the chart to it */
  pairToken?: Token
  onPairTokenSelect?: () => void
  /** Line or candlesticks: shows a switch in the token bar when `onChartTypeChange` is set */
  chartType?: ChartType
  onChartTypeChange?: (type: ChartType) => void
  className?: string
}

function LineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path d="M1.75 11.5 5.5 7.25l3 2.5 5.75-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CandlesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path d="M4.5 2v12M11.5 1.5v10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <rect x="2.75" y="4.5" width="3.5" height="6.5" rx="1" fill="currentColor" />
      <rect x="9.75" y="3.5" width="3.5" height="5" rx="1" fill="currentColor" />
    </svg>
  )
}

const CHART_TYPE_OPTIONS = [
  { value: 'line' as const, label: 'Line', Icon: LineIcon },
  { value: 'candles' as const, label: 'Candles', Icon: CandlesIcon },
].map(({ value, label, Icon }) => ({
  value,
  label: (
    <span className="flex h-uni-16 items-center">
      <Icon className="size-uni-16" />
      <span className="sr-only">{label}</span>
    </span>
  ),
}))

/** Line or candlesticks: icon-only, borderless like the period selector */
export function SparklineChartTypeToggle({ value, onValueChange }: { value: ChartType; onValueChange: (type: ChartType) => void }) {
  return (
    <SegmentedControl
      aria-label="Chart type"
      size="small"
      outlined={false}
      options={CHART_TYPE_OPTIONS}
      value={value}
      onValueChange={onValueChange}
      className="min-h-0 gap-uni-2 border-0 p-0"
    />
  )
}

/** The token bar's "…" menu: a 32px round button with a 20px icon, like the swap header's gear. Items are mock (nothing navigates). */
function TokenMenu({ token }: { token: Token }) {
  const [favorited, setFavorited] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  return (
    <UniMenu onOpenChange={(open) => open && setCopied(false)}>
      <UniMenuTrigger asChild>
        <button
          type="button"
          aria-label={`More ${token.symbol} options`}
          className={cn(
            'flex size-uni-32 shrink-0 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 outline-none',
            'transition-colors duration-[80ms] ease-out hover:bg-surface2 hover:text-neutral1 data-[state=open]:bg-surface2 data-[state=open]:text-neutral1',
            'focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered [&_svg]:size-uni-20',
          )}
        >
          <MoreHorizontal />
        </button>
      </UniMenuTrigger>
      <UniMenuContent>
        <UniMenuItem onSelect={() => setFavorited((f) => !f)}>
          {favorited ? <Heart className="text-accent1" /> : <HeartOutline />}
          {favorited ? 'Remove from favorites' : 'Add to favorites'}
        </UniMenuItem>
        <UniMenuItem
          // Copies this page's link; stays open to show it worked
          onSelect={(e) => {
            e.preventDefault()
            void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true), () => {})
          }}
        >
          {copied ? <Check className="text-statusSuccess" /> : <Copy />}
          {copied ? 'Copied' : 'Copy link'}
        </UniMenuItem>
        <UniMenuSeparator />
        <UniMenuItem>
          <ArrowUpRight />
          View {token.symbol} details
        </UniMenuItem>
        <UniMenuItem>
          <LineChartDots />
          Open in Explore
        </UniMenuItem>
      </UniMenuContent>
    </UniMenu>
  )
}

/** Switches the chart to the other token in the pair: its logo and symbol, with the swap-direction arrows */
function PairTokenButton({ token, onClick }: { token: Token; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show ${token.symbol} chart`}
      className={cn(
        'flex h-uni-28 shrink-0 cursor-pointer items-center gap-uni-6 rounded-uni-full border border-surface3 pr-uni-8 pl-uni-4 text-body3 text-neutral1 outline-none',
        'transition-[background-color,scale] duration-[80ms] ease-out hover:bg-surface2 active:scale-[0.97]',
        'focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
      )}
    >
      <TokenLogo token={token} size={20} />
      {token.symbol}
      <ArrowsLeftRight className="size-uni-16 text-neutral2" />
    </button>
  )
}

export function SparklineHeader({
  model,
  hoverIndex = null,
  loading = false,
  aside,
  pairToken,
  onPairTokenSelect,
  chartType = 'line',
  onChartTypeChange,
  className,
}: SparklineHeaderProps) {
  const { token, points, start, period } = model
  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined
  const price = hovered?.value ?? model.end
  const label = hovered ? formatChartTime(hovered.timestamp, period) : CHART_PERIODS.find((p) => p.value === period)?.description
  return (
    <div data-slot="sparkline-header" className={cn('flex flex-col gap-uni-12', className)}>
      {/* Token bar: spans the card edge to edge, ruled off from the price */}
      <div className="-mx-uni-8 flex min-w-0 items-center gap-uni-8 border-b border-surface3 px-uni-16 pt-uni-8 pb-uni-12">
        {/* Looks like the link to the token page (arrow on hover) but goes nowhere */}
        <div className="group/token flex min-w-0 cursor-pointer items-center gap-uni-8">
          <TokenLogo token={token} size={24} />
          <span className="truncate text-body2 text-neutral1">{token.name}</span>
          <ArrowUpRight
            className={cn(
              'size-uni-16 shrink-0 -translate-x-uni-4 text-neutral2 opacity-0',
              'transition-[opacity,translate] duration-150 ease-out group-hover/token:translate-x-0 group-hover/token:opacity-100',
            )}
          />
        </div>
        <div className="-mr-uni-4 ml-auto flex shrink-0 items-center gap-uni-4">
          {onChartTypeChange && <SparklineChartTypeToggle value={chartType} onValueChange={onChartTypeChange} />}
          {pairToken && <PairTokenButton token={pairToken} onClick={onPairTokenSelect} />}
          <TokenMenu token={token} />
        </div>
      </div>
      <div className="flex items-start justify-between gap-uni-12 px-uni-8">
        {loading ? (
          <Shimmer role="status" aria-label="Loading price" className="flex min-w-0 flex-col items-start gap-uni-4">
            <TextSkeleton placeholder="$0,000.00" className="text-heading3" />
            <TextSkeleton placeholder="$00.00 (0.00%) Past day" className="text-body2" />
          </Shimmer>
        ) : (
          <div className="flex min-w-0 flex-col gap-uni-4">
            <span className="text-heading3 text-neutral1 tabular-nums">{formatTokenPrice(price)}</span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-uni-8">
              <PriceDelta start={start} end={price} />
              <span className="truncate text-body2 text-neutral3">{label}</span>
            </div>
          </div>
        )}
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </div>
  )
}

/* Chart ------------------------------------------------------------------- */

// Strong ease-out, under 300ms (period and token changes; never while scrubbing)
const MORPH = { duration: 0.24, ease: [0.23, 1, 0.32, 1] as const }
const easeOut = (t: number) => 1 - (1 - t) ** 4

/** Frame-rate independent ease toward a target (Liveline's lerp): `speed` is the share of the gap closed per 60fps frame */
const approach = (current: number, target: number, speed: number, dt: number) =>
  current + (target - current) * (1 - Math.pow(1 - speed, dt / (1000 / 60)))
// Liveline's tuning: the live tip and y range ease at 0.08/frame, up to 0.28 when the gap is small
const TIP_SPEED = 0.08
const TIP_ADAPTIVE_BOOST = 0.2
// Scrubbing fades the line ahead of the crosshair to 40%
const SCRUB_SPEED = 0.12
const SCRUB_DIM = 0.6

const lerp = (from: number[], to: number[], t: number) => from.map((v, i) => v + (to[i] - v) * t)
const evenXs = (n: number) => Array.from({ length: n }, (_, i) => xAt(i, n))

const GLYPH_KEYS = ['x', 'w', 'open', 'high', 'low', 'close'] as const
const lerpGlyphs = (from: CandleGlyph[], to: CandleGlyph[], t: number) =>
  to.map((g, i) => {
    const out = { ...g }
    for (const k of GLYPH_KEYS) out[k] = from[i][k] + (g[k] - from[i][k]) * t
    return out
  })
/** Candles flattened onto a drawn line: where a line → candles morph starts */
const collapse = (glyphs: CandleGlyph[], xs: number[], ys: number[]) =>
  glyphs.map((g) => {
    const y = sampleY(xs, ys, g.x)
    return { ...g, open: y, high: y, low: y, close: y }
  })
type CandlePathKey = keyof ReturnType<typeof candlePaths>
const NO_CANDLES: Record<CandlePathKey, string> = { upBody: '', upWick: '', downBody: '', downWick: '' }

const subscribeNoop = () => () => {}
/** Axis labels are local times: rendered after hydration so server and browser agree */
const useMounted = () => React.useSyncExternalStore(subscribeNoop, () => true, () => false)

/** Labels fade out at both ends (live labels scroll through them) */
const AXIS_MASK = 'linear-gradient(to right, transparent, black 12%, black 92%, transparent)'

/**
 * Time labels under the line. Static periods place ticks across the period and
 * drop any that would hang off an end. Live places them relative to the latest
 * point and the chart slides `trackRef` with the line between ticks.
 */
function SparklineAxis({
  model,
  loading,
  trackRef,
}: {
  model: SparklineModel
  loading: boolean
  trackRef: React.Ref<HTMLDivElement>
}) {
  const mounted = useMounted()
  const { points, period } = model
  const first = points[0].timestamp
  const last = points[points.length - 1].timestamp
  const live = !!model.clock

  let ticks: { t: number; x: number }[] = []
  if (mounted && !loading) {
    ticks = live
      ? axisTicks(last - LIVE_WINDOW_MS - 30_000, last + 5_000, period).map((t) => ({ t, x: 1 - (last - t) / LIVE_WINDOW_MS }))
      : axisTicks(first, last, period)
          .map((t) => ({ t, x: (t - first) / (last - first) }))
          .filter(({ x }) => x > 0.06 && x < 0.94)
  }

  return (
    <div
      aria-hidden
      className="relative h-uni-12 shrink-0 overflow-hidden text-body5 text-neutral3 tabular-nums"
      style={{ maskImage: AXIS_MASK, WebkitMaskImage: AXIS_MASK }}
    >
      <div ref={trackRef} key={live ? 'live' : 'static'} className="absolute inset-0">
        {ticks.map(({ t, x }) => (
          <span
            key={t}
            // New labels fade in (live: as they scroll in from the right; otherwise on a period change)
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
            style={{ left: `${x * 100}%` }}
          >
            {formatAxisTime(t, period)}
          </span>
        ))}
      </div>
    </div>
  )
}

export interface SparklinePriceLine {
  /** In the chart's units (USD per token) */
  value: number
  /** Pill text, e.g. "+5%" */
  label: string
  tone?: 'accent' | 'warning' | 'critical'
  /** Values a drag snaps to (e.g. preset prices) when the pointer comes within a few pixels */
  snaps?: number[]
  /** Drag (or arrow keys) moved the line; `snap` is the index into `snaps` when it snapped */
  onChange?: (value: number, snap?: number) => void
  /** Accessible name, e.g. "Limit price" */
  name?: string
}

export interface SparklineChartProps {
  model: SparklineModel
  /** A draggable horizontal line, e.g. a limit price */
  priceLine?: SparklinePriceLine
  /** A price line drag started (true) or ended (false): hold the y range still meanwhile */
  onPriceLineDragChange?: (dragging: boolean) => void
  hoverIndex?: number | null
  /** Scrubbing callback; null when the pointer leaves or the touch ends. Omit for a static chart. */
  onHoverIndexChange?: (index: number | null) => void
  /** Draws a placeholder wave under a shimmer; when data arrives the wave morphs into the line */
  loading?: boolean
  /** Line (default) or candlesticks from `model.candles`; switching morphs between them */
  type?: ChartType
  className?: string
  style?: React.CSSProperties
}

const PRICE_LINE_TONE = {
  accent: 'text-accent1',
  warning: 'text-statusWarning',
  critical: 'text-statusCritical',
} as const
/** Snap distance for a dragged price line, in CSS pixels */
const SNAP_PX = 6
/** Arrow keys move the price line by this share of its value (Shift: 5×) */
const PRICE_LINE_STEP = 0.0025

export function SparklineChart({
  model,
  priceLine,
  onPriceLineDragChange,
  hoverIndex = null,
  onHoverIndexChange,
  loading = false,
  type = 'line',
  className,
  style,
}: SparklineChartProps) {
  const id = React.useId().replace(/:/g, '')
  const gradientId = `${id}-fill`
  const clipId = `${id}-clip`
  const fadeId = `${id}-fade`
  const scrubId = `${id}-scrub`
  const reduceMotion = useReducedMotion()
  const lineRef = React.useRef<SVGPathElement>(null)
  const areaRef = React.useRef<SVGPathElement>(null)
  const markerRef = React.useRef<HTMLSpanElement>(null)
  const crosshairRef = React.useRef<HTMLSpanElement>(null)
  const axisTrackRef = React.useRef<HTMLDivElement>(null)
  const drawn = React.useRef<number[] | null>(null)
  /** x per drawn point when they aren't evenly spaced (live) */
  const drawnXs = React.useRef<number[] | null>(null)
  const morph = React.useRef<AnimationPlaybackControls | null>(null)
  const scrubDimRef = React.useRef<SVGRectElement>(null)
  const areaBoxRef = React.useRef<HTMLDivElement>(null)
  const priceLineRef = React.useRef<HTMLDivElement>(null)
  /** The scale on screen: the model's, or live's eased one */
  const scaleRef = React.useRef(model.scale)
  const [draggingLine, setDraggingLine] = React.useState(false)
  const candleRefs = React.useRef<Record<CandlePathKey, SVGPathElement | null>>({ upBody: null, upWick: null, downBody: null, downWick: null })
  /** The candles on screen, when it's showing candles */
  const drawnGlyphs = React.useRef<CandleGlyph[] | null>(null)

  const n = model.points.length
  const target = React.useMemo(() => (loading ? waveY(n) : model.ys), [loading, n, model.ys])
  const clock = loading ? undefined : model.clock
  const stablecoin = isStablecoin(model.token)
  const hovered = !loading && hoverIndex !== null ? hoverIndex : null
  // Loading always draws the wave; the candles morph out of it
  const candleMode = type === 'candles' && !loading
  const glyphs = React.useMemo(
    () => (candleMode ? candleGlyphs(model.candles, n, model.scale) : null),
    [candleMode, model.candles, n, model.scale],
  )
  const candles = model.candles
  const hoveredCandle = candleMode && hovered !== null ? candleIndexAt(candles, hovered) : null

  const setCandlePaths = (paths: Record<CandlePathKey, string>) => {
    for (const key of Object.keys(paths) as CandlePathKey[]) candleRefs.current[key]?.setAttribute('d', paths[key])
  }
  const draw = React.useCallback((ys: number[], xs: number[] | null = null) => {
    drawn.current = ys
    drawnXs.current = xs
    drawnGlyphs.current = null
    lineRef.current?.setAttribute('d', linePath(ys, xs ?? undefined))
    areaRef.current?.setAttribute('d', areaPath(ys, xs ?? undefined))
    setCandlePaths(NO_CANDLES)
  }, [])
  // Leaves the closes as the drawn line, so switching back morphs from them
  const drawCandles = React.useCallback((next: CandleGlyph[]) => {
    drawn.current = next.map((g) => g.close)
    drawnXs.current = next.map((g) => g.x)
    drawnGlyphs.current = next
    lineRef.current?.setAttribute('d', '')
    areaRef.current?.setAttribute('d', '')
    setCandlePaths(candlePaths(next))
  }, [])

  // React renders `d` at the target; on a change, this rewinds it to what was on
  // screen before paint and morphs to the new series (resampled, so a series of
  // a different length, like Live's, morphs too). Candles morph candle by candle
  // from the last candles, or grow out of the line that was there.
  React.useLayoutEffect(() => {
    if (clock) return
    const from = drawn.current
    if (glyphs) {
      if (!from || reduceMotion) return void drawCandles(glyphs)
      const prev = drawnGlyphs.current
      const start = prev && prev.length === glyphs.length ? prev : collapse(glyphs, drawnXs.current ?? evenXs(from.length), from)
      const controls = animate(0, 1, {
        ...MORPH,
        onUpdate: (t) => drawCandles(lerpGlyphs(start, glyphs, t)),
        onComplete: () => {
          morph.current = null
          drawCandles(glyphs)
        },
      })
      morph.current = controls
      return () => controls.stop()
    }
    if (!from || reduceMotion) return void draw(target)
    const fromXs = drawnXs.current ?? evenXs(from.length)
    const start = evenXs(target.length).map((x) => sampleY(fromXs, from, x))
    const controls = animate(0, 1, {
      ...MORPH,
      onUpdate: (t) => draw(lerp(start, target, t)),
      onComplete: () => {
        morph.current = null
        draw(target)
      },
    })
    morph.current = controls
    return () => controls.stop()
  }, [target, glyphs, clock, reduceMotion, draw, drawCandles])

  /*
   * Live, after Liveline (benjitaylor/liveline): drawn every frame from the
   * feed's clock rather than by React. The x axis is time, ending at the
   * clock's now, so the line scrolls continuously and its tip always sits at
   * the right edge. The tip's value isn't the latest point's: it eases toward
   * it (closing small gaps faster than big ones), so each new price glides in
   * instead of the line stepping to it. The y range eases the same way, and
   * scrubbing dims the line ahead of the crosshair. Candles scroll the same
   * way, each at its slot's time, and the forming one closes at the eased tip.
   * Reduced motion draws each tick as it lands.
   */
  const live = React.useRef({ model, hovered, priceLine })
  const liveFrame = React.useRef<(() => void) | null>(null)
  /** The eased tip and y range, kept when switching line ↔ candles so neither jumps */
  const liveEase = React.useRef<{ clock: LiveClock; tip: number | null; scale: { lo: number; range: number } | null } | null>(null)
  React.useLayoutEffect(() => {
    if (!clock) scaleRef.current = model.scale
    live.current = { model, hovered, priceLine }
    // React just re-rendered the paths and dot at static positions: put them back before paint
    liveFrame.current?.()
  })

  React.useLayoutEffect(() => {
    if (!clock) return
    // Entering live, or switching line ↔ candles, morphs in from what was on screen
    let blend =
      drawn.current && !reduceMotion
        ? { ys: drawn.current, xs: drawnXs.current ?? evenXs(drawn.current.length), start: performance.now() }
        : null
    if (liveEase.current?.clock !== clock) liveEase.current = { clock, tip: null, scale: null }
    const eased = liveEase.current
    let { tip, scale } = eased
    let scrub = 0
    let scrubX = VIEW_W
    let prev = performance.now()

    const frame = () => {
      const { model, hovered, priceLine } = live.current
      const { points } = model
      const count = points.length
      const latest = points[count - 1]
      const t = performance.now()
      // Capped, so a frame after a stall (background tab) doesn't leap
      const dt = Math.min(t - prev, 50)
      prev = t
      // A late tick extends the line flat rather than leaving a gap at the edge
      const now = reduceMotion ? latest.timestamp : Math.max(clock.now(), latest.timestamp)

      if (tip === null || scale === null || reduceMotion) {
        tip = latest.value
        scale = valueRange(points, { stablecoin, include: [tip, model.include] })
      } else {
        const gap = Math.min(Math.abs(latest.value - tip) / scale.range, 1)
        const speed = TIP_SPEED + (1 - gap) * TIP_ADAPTIVE_BOOST
        tip = approach(tip, latest.value, speed, dt)
        if (Math.abs(tip - latest.value) < scale.range * 1e-3) tip = latest.value
        const goal = valueRange(points, { stablecoin, include: [tip, model.include] })
        scale = { lo: approach(scale.lo, goal.lo, speed, dt), range: approach(scale.range, goal.range, speed, dt) }
      }

      eased.tip = tip
      eased.scale = scale

      const xOf = (time: number) => (1 - (now - time) / LIVE_WINDOW_MS) * VIEW_W
      const b = blend ? Math.min((t - blend.start) / (MORPH.duration * 1000), 1) : 1
      if (b >= 1) blend = null
      const tipY = valueToViewY(tip, scale)
      // Where the crosshair and dot go
      let mark: (index: number) => { x: number; y: number }
      if (candleMode) {
        const slot = (LIVE_CANDLE_MS / LIVE_WINDOW_MS) * VIEW_W
        const candles = model.candles
        let gs = candles.map((c, i) => {
          if (i < candles.length - 1) return glyph(c, xOf((c.start + c.end) / 2), slot * CANDLE_BODY, scale!)
          // The forming candle: its ticks so far, closing at the eased tip
          let high = Math.max(c.open, tip!)
          let low = Math.min(c.open, tip!)
          for (let j = c.first; j < c.last; j++) {
            high = Math.max(high, points[j].value)
            low = Math.min(low, points[j].value)
          }
          return glyph({ open: c.open, high, low, close: tip! }, xOf((c.start + c.end) / 2), slot * CANDLE_BODY, scale!)
        })
        if (blend) gs = lerpGlyphs(collapse(gs, blend.xs, blend.ys), gs, easeOut(b))
        drawCandles(gs)
        mark = (index) => {
          const g = gs[candleIndexAt(candles, index)]
          return { x: g.x, y: g.close }
        }
      } else {
        // Every point at its time, the newest at the eased value, plus the tip at now
        const xs = points.map((p) => xOf(p.timestamp))
        xs.push(VIEW_W)
        let ys = points.map((p, i) => (i === count - 1 ? tipY : valueToViewY(p.value, scale!)))
        ys.push(tipY)
        if (blend) {
          const { ys: fromYs, xs: fromXs } = blend
          ys = ys.map((y, i) => {
            const from = sampleY(fromXs, fromYs, xs[i])
            return from + (y - from) * easeOut(b)
          })
        }
        draw(ys, xs)
        mark = (index) => ({ x: xs[index], y: ys[index] })
      }
      scaleRef.current = scale
      if (priceLineRef.current && priceLine) {
        priceLineRef.current.style.top = `${(valueToViewY(priceLine.value, scale) / VIEW_H) * 100}%`
      }

      const active = hovered !== null && hovered < count
      const marked = active ? mark(hovered) : { x: VIEW_W, y: tipY }
      if (active) scrubX = marked.x
      scrub = reduceMotion ? Number(active) : approach(scrub, Number(active), SCRUB_SPEED, dt)
      if (Math.abs(scrub - Number(active)) < 0.01) scrub = Number(active)
      if (scrubDimRef.current) {
        scrubDimRef.current.setAttribute('x', String(scrubX))
        scrubDimRef.current.setAttribute('fill-opacity', String(SCRUB_DIM * scrub))
      }

      const left = `${(marked.x / VIEW_W) * 100}%`
      if (markerRef.current) {
        markerRef.current.style.left = left
        markerRef.current.style.top = `${(marked.y / VIEW_H) * 100}%`
      }
      if (crosshairRef.current) crosshairRef.current.style.left = left
      if (axisTrackRef.current) {
        axisTrackRef.current.style.transform = `translateX(${(-(now - latest.timestamp) / LIVE_WINDOW_MS) * 100}%)`
      }
    }

    liveFrame.current = frame
    frame()
    // Reduced motion only redraws when a tick re-renders
    let raf = reduceMotion ? 0 : requestAnimationFrame(function loop() {
      frame()
      raf = requestAnimationFrame(loop)
    })
    return () => {
      cancelAnimationFrame(raf)
      liveFrame.current = null
    }
  }, [clock, candleMode, reduceMotion, stablecoin, draw, drawCandles])

  const interactive = !!onHoverIndexChange && !loading
  const scrubTo = (index: number | null) => {
    // Scrubbing is direct manipulation: land any running morph immediately
    if (morph.current) {
      morph.current.stop()
      morph.current = null
      draw(target)
    }
    if (index !== hoverIndex) onHoverIndexChange?.(index)
  }
  const indexAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const f = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    // Candles: the nearest one on screen, as its close
    const centers = candleMode ? drawnXs.current : null
    if (centers && centers.length === candles.length) {
      let best = candles.length - 1
      for (let i = 0; i < centers.length; i++) {
        if (Math.abs(centers[i] - f * VIEW_W) < Math.abs(centers[best] - f * VIEW_W)) best = i
      }
      return candles[best].last
    }
    const xs = clock ? drawnXs.current : null
    if (!xs) return Math.round(f * (n - 1))
    // Live points sit wherever the scroll left them: take the nearest one on screen
    let best = n - 1
    for (let i = 0; i < n; i++) {
      if (i < n && Math.abs(xs[i] - f * VIEW_W) < Math.abs(xs[best] - f * VIEW_W)) best = i
    }
    return best
  }

  /* Price line drag: pointer y → value in the scale on screen, which holds still mid-drag */
  const lineDrag = React.useRef<{ rect: DOMRect } | null>(null)
  const valueAtPointer = (clientY: number, rect: DOMRect) => {
    const scale = scaleRef.current
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height)
    // Snap when within a few pixels of a snap value's line
    const pxPerView = rect.height / VIEW_H
    let snap: number | undefined
    priceLine?.snaps?.forEach((v, i) => {
      const dist = Math.abs(valueToViewY(v, scale) * pxPerView - y)
      if (dist < SNAP_PX && (snap === undefined || dist < Math.abs(valueToViewY(priceLine.snaps![snap], scale) * pxPerView - y))) snap = i
    })
    return snap !== undefined ? { value: priceLine!.snaps![snap], snap } : { value: viewYToValue(y / pxPerView, scale) }
  }
  const endLineDrag = () => {
    if (!lineDrag.current) return
    lineDrag.current = null
    setDraggingLine(false)
    onPriceLineDragChange?.(false)
  }
  const lineHandlers: React.HTMLAttributes<HTMLDivElement> | undefined =
    priceLine?.onChange && !loading
      ? {
          // Kept off the chart's own handlers: the line drags, the chart scrubs
          onPointerDown: (e) => {
            e.stopPropagation()
            e.preventDefault()
            const rect = areaBoxRef.current?.getBoundingClientRect()
            if (!rect) return
            e.currentTarget.setPointerCapture(e.pointerId)
            e.currentTarget.focus({ preventScroll: true })
            scrubTo(null)
            lineDrag.current = { rect }
            setDraggingLine(true)
            onPriceLineDragChange?.(true)
          },
          onPointerMove: (e) => {
            e.stopPropagation()
            if (!lineDrag.current) return
            const { value, snap } = valueAtPointer(e.clientY, lineDrag.current.rect)
            priceLine.onChange?.(value, snap)
          },
          onPointerEnter: (e) => {
            if (e.pointerType === 'mouse') scrubTo(null)
          },
          onPointerUp: (e) => {
            e.stopPropagation()
            endLineDrag()
          },
          onPointerCancel: endLineDrag,
          onLostPointerCapture: endLineDrag,
          onKeyDown: (e) => {
            const step = PRICE_LINE_STEP * (e.shiftKey ? 5 : 1)
            if (e.key === 'ArrowUp') priceLine.onChange?.(priceLine.value * (1 + step))
            else if (e.key === 'ArrowDown') priceLine.onChange?.(priceLine.value * (1 - step))
            else return
            e.preventDefault()
            e.stopPropagation()
          },
        }
      : undefined
  const lineY = priceLine ? (valueToViewY(priceLine.value, model.scale) / VIEW_H) * 100 : 0

  // The dot sits on the scrubbed point, else blips on the latest one; candles show no dot, only the crosshair
  const marked = loading || candleMode ? null : (hovered ?? n - 1)
  const x =
    hoveredCandle !== null && glyphs
      ? (glyphs[hoveredCandle].x / VIEW_W) * 100
      : marked !== null
        ? (xAt(marked, n) / VIEW_W) * 100
        : 0
  const y = marked !== null ? (model.ys[marked] / VIEW_H) * 100 : 0
  const staticCandlePaths = React.useMemo(() => (glyphs ? candlePaths(glyphs) : NO_CANDLES), [glyphs])
  const ohlc = hoveredCandle !== null ? candles[hoveredCandle] : null
  // Remounted when live starts or stops, so styles the live frame set don't outlive it
  const mode = clock ? 'live' : 'static'

  return (
    <div
      data-slot="sparkline-chart"
      role={interactive ? 'slider' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${model.token.symbol} price chart, ${CHART_PERIODS.find((p) => p.value === model.period)?.description.toLowerCase()}`}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? n - 1 : undefined}
      aria-valuenow={interactive ? (hovered ?? n - 1) : undefined}
      aria-valuetext={
        interactive
          ? `${formatTokenPrice(model.points[hovered ?? n - 1].value)}, ${formatChartTime(model.points[hovered ?? n - 1].timestamp, model.period)}`
          : undefined
      }
      className={cn(
        'flex min-h-0 flex-col gap-uni-4 rounded-r-uni-12 outline-none select-none focus-visible:ring-1 focus-visible:ring-neutral3',
        interactive && 'cursor-none touch-pan-y',
        className,
      )}
      style={style}
      onPointerDown={interactive ? (e) => scrubTo(indexAt(e)) : undefined}
      onPointerMove={
        interactive
          ? (e) => {
              // Mouse scrubs on hover; touch and pen while pressed
              if (e.pointerType === 'mouse' || e.buttons) scrubTo(indexAt(e))
            }
          : undefined
      }
      onPointerLeave={interactive ? () => scrubTo(null) : undefined}
      onPointerUp={
        interactive
          ? (e) => {
              // A lifted finger reverts, like leaving with the mouse
              if (e.pointerType !== 'mouse') scrubTo(null)
            }
          : undefined
      }
      onPointerCancel={interactive ? () => scrubTo(null) : undefined}
      onBlur={interactive ? () => scrubTo(null) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              const current = hoverIndex ?? n - 1
              if (candleMode) {
                // A candle at a time (Shift: 4)
                const step = e.shiftKey ? 4 : 1
                const k = candleIndexAt(candles, current)
                if (e.key === 'ArrowLeft') scrubTo(candles[Math.max(0, k - step)].last)
                else if (e.key === 'ArrowRight') scrubTo(candles[Math.min(candles.length - 1, k + step)].last)
                else if (e.key === 'Home') scrubTo(candles[0].last)
                else if (e.key === 'End') scrubTo(n - 1)
                else if (e.key === 'Escape') scrubTo(null)
                else return
                e.preventDefault()
                return
              }
              const step = e.shiftKey ? 8 : 1
              if (e.key === 'ArrowLeft') scrubTo(Math.max(0, current - step))
              else if (e.key === 'ArrowRight') scrubTo(Math.min(n - 1, current + step))
              else if (e.key === 'Home') scrubTo(0)
              else if (e.key === 'End') scrubTo(n - 1)
              else if (e.key === 'Escape') scrubTo(null)
              else return
              e.preventDefault()
            }
          : undefined
      }
    >
      <div
        ref={areaBoxRef}
        className={cn(
          'relative min-h-0 flex-1',
          loading ? 'text-neutral3' : DIRECTION_TEXT[model.direction],
          // Direction changes (e.g. switching to a down token) recolor with the morph
          'transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
        )}
      >
        <Shimmer disabled={!loading} className="absolute inset-0">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            aria-hidden
            className="absolute inset-0 size-full overflow-visible"
            // The line runs to the card's left edge and fades in from it
            style={{ maskImage: 'linear-gradient(to right, transparent, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 20%)' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
              {/* The fill also fades out toward the right edge, so it doesn't end in a hard vertical cut */}
              <linearGradient id={`${fadeId}-ramp`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="80%" stopColor="white" />
                <stop offset="100%" stopColor="white" stopOpacity={0} />
              </linearGradient>
              <mask id={fadeId} maskUnits="userSpaceOnUse" x={0} y={-VIEW_H} width={VIEW_W} height={VIEW_H * 3}>
                <rect x={0} y={-VIEW_H} width={VIEW_W} height={VIEW_H * 3} fill={`url(#${fadeId}-ramp)`} />
              </mask>
              {/* Live: the oldest points scroll off the left edge */}
              {/* (Candles get a slot's room on the right: the forming one's slot runs past now) */}
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                <rect x={0} y={-VIEW_H} width={VIEW_W * (candleMode ? 1 + LIVE_CANDLE_MS / LIVE_WINDOW_MS : 1)} height={VIEW_H * 3} />
              </clipPath>
              {/* Live scrubbing: the black rect, moved to the crosshair and faded in, dims what's ahead of it */}
              <mask id={scrubId} maskUnits="userSpaceOnUse" x={0} y={-VIEW_H} width={VIEW_W} height={VIEW_H * 3}>
                <rect x={0} y={-VIEW_H} width={VIEW_W} height={VIEW_H * 3} fill="white" />
                <rect ref={scrubDimRef} x={VIEW_W} y={-VIEW_H} width={VIEW_W} height={VIEW_H * 3} fill="black" fillOpacity={0} />
              </mask>
            </defs>
            <g clipPath={clock ? `url(#${clipId})` : undefined} mask={clock ? `url(#${scrubId})` : undefined}>
              <path
                ref={areaRef}
                d={glyphs ? '' : areaPath(target)}
                fill={`url(#${gradientId})`}
                mask={`url(#${fadeId})`}
                className={cn('transition-opacity duration-200 ease-out', loading && 'opacity-0')}
              />
              <path
                ref={lineRef}
                d={glyphs ? '' : linePath(target)}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* Candles: green up, red down, whatever the period's direction */}
              {(['up', 'down'] as const).map((dir) => (
                <g key={dir} className={dir === 'up' ? 'text-statusSuccess' : 'text-statusCritical'}>
                  <path
                    ref={(el) => void (candleRefs.current[`${dir}Wick`] = el)}
                    d={staticCandlePaths[`${dir}Wick`]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <path ref={(el) => void (candleRefs.current[`${dir}Body`] = el)} d={staticCandlePaths[`${dir}Body`]} fill="currentColor" />
                </g>
              ))}
            </g>
          </svg>
        </Shimmer>

        {ohlc && (
          // The scrubbed candle's values, top left (the header shows its close)
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-uni-16 z-10 flex flex-wrap gap-x-uni-8 rounded-uni-8 bg-surface1/90 px-uni-6 py-uni-2 text-body4 text-neutral2 tabular-nums"
          >
            {(['open', 'high', 'low', 'close'] as const).map((k) => (
              <span key={k}>
                {k[0].toUpperCase()}{' '}
                <span className={k === 'close' ? (ohlc.close >= ohlc.open ? 'text-statusSuccess' : 'text-statusCritical') : 'text-neutral1'}>
                  {formatTokenPrice(ohlc[k])}
                </span>
              </span>
            ))}
          </div>
        )}
        {hovered !== null && (
          // Crosshair: a dotted vertical line, no horizontal
          <span
            key={`crosshair-${mode}`}
            ref={crosshairRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-0 -translate-x-1/2 border-l border-dotted border-neutral3"
            style={{ left: `${x}%` }}
          />
        )}
        {marked !== null && (
          <span key={`marker-${mode}`} ref={markerRef} aria-hidden className="pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%` }}>
            {/* At rest, the latest point blips: a halo pings out from the dot */}
            {hovered === null && (
              <span className="absolute size-uni-16 -translate-1/2 rounded-uni-full bg-current opacity-40 motion-safe:animate-ping" />
            )}
            <span className="absolute size-[10px] -translate-1/2 rounded-uni-full border-2 border-white bg-current" />
          </span>
        )}
        {priceLine && !loading && (
          <div
            key={`price-line-${mode}`}
            ref={priceLineRef}
            data-slot="sparkline-price-line"
            className={cn(
              'pointer-events-none absolute inset-x-0 h-0',
              PRICE_LINE_TONE[priceLine.tone ?? 'accent'],
              // Follows the line's rescale morph; never while dragging (it tracks the pointer) or live (set per frame)
              !draggingLine && !clock && 'transition-[top] duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            )}
            style={{ top: `${lineY}%` }}
          >
            <div
              role={lineHandlers ? 'slider' : undefined}
              tabIndex={lineHandlers ? 0 : undefined}
              aria-label={lineHandlers ? (priceLine.name ?? 'Price line') : undefined}
              aria-orientation={lineHandlers ? 'vertical' : undefined}
              aria-valuenow={lineHandlers ? priceLine.value : undefined}
              aria-valuetext={lineHandlers ? `${formatTokenPrice(priceLine.value)}, ${priceLine.label}` : undefined}
              aria-hidden={lineHandlers ? undefined : true}
              {...lineHandlers}
              className={cn(
                'group/line absolute inset-x-0 -top-uni-12 h-uni-24 rounded-uni-4 outline-none',
                lineHandlers && 'pointer-events-auto cursor-row-resize touch-none',
              )}
            >
              {/* Dashed, fading in from the left like the line; solid while held */}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2',
                  draggingLine ? 'bg-current' : 'bg-[repeating-linear-gradient(to_right,currentColor_0_6px,transparent_6px_10px)]',
                )}
                style={{ maskImage: 'linear-gradient(to right, transparent, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 20%)' }}
              />
              {/* Left of the latest-point dot, so at market it reads "Market ●" */}
              <span
                aria-hidden
                className={cn(
                  'absolute top-1/2 right-uni-16 flex h-uni-20 -translate-y-1/2 items-center gap-uni-2 rounded-uni-full bg-current pr-uni-6 pl-uni-4',
                  'transition-[scale] duration-100 ease-out',
                  lineHandlers && 'group-hover/line:scale-105 group-focus-visible/line:ring-2 group-focus-visible/line:ring-current/30',
                  draggingLine && 'scale-105',
                )}
              >
                {lineHandlers && (
                  <svg viewBox="0 0 12 12" className="size-uni-12 text-white" aria-hidden>
                    <path d="M3.5 4.5 6 2l2.5 2.5M3.5 7.5 6 10l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className="text-buttonLabel4 whitespace-nowrap text-white tabular-nums">{priceLine.label}</span>
              </span>
            </div>
          </div>
        )}
      </div>
      <SparklineAxis model={model} loading={loading} trackRef={axisTrackRef} />
    </div>
  )
}

/* Period selector --------------------------------------------------------- */

/** Live gets its own treatment: green, with a dot that blinks while it's selected (steady under reduced motion) */
function LivePeriodLabel({ children }: { children: React.ReactNode }) {
  return (
    // Flex (not inline-flex) so the dot doesn't set a baseline and push the text off the others' line
    <span className="flex items-center gap-uni-4 text-statusSuccess transition-colors duration-100 group-hover/option:text-statusSuccessHovered">
      <span
        aria-hidden
        className="size-[6px] shrink-0 rounded-uni-full bg-current group-data-[state=on]/option:motion-safe:animate-uni-live-blink"
      />
      {children}
    </span>
  )
}

const PERIOD_OPTIONS = CHART_PERIODS.map(({ value, label }) =>
  value === 'LIVE'
    ? {
        value,
        label: <LivePeriodLabel>{label}</LivePeriodLabel>,
        // A green-tinted pill in place of the gray one
        indicatorClassName: 'bg-statusSuccess/12 group-hover/option:bg-statusSuccess/16',
      }
    : { value, label },
)

export function SparklinePeriodSelector({
  value,
  onValueChange,
  className,
}: {
  value: ChartPeriod
  onValueChange: (period: ChartPeriod) => void
  className?: string
}) {
  return (
    <div data-slot="sparkline-periods" className={cn('flex items-center justify-between', className)}>
      {/* Small and borderless, flush with the price row (no container padding) */}
      <SegmentedControl
        aria-label="Time period"
        size="small"
        outlined={false}
        options={PERIOD_OPTIONS}
        value={value}
        onValueChange={onValueChange}
        className="min-h-0 gap-uni-2 border-0 p-0"
      />
    </div>
  )
}

/* Card -------------------------------------------------------------------- */

export interface TokenPriceSparklineProps {
  token: Token
  /** Uncontrolled starting period. Default 1D. */
  defaultPeriod?: ChartPeriod
  /** Controlled period */
  period?: ChartPeriod
  onPeriodChange?: (period: ChartPeriod) => void
  /** Uncontrolled starting chart type. Default line. */
  defaultChartType?: ChartType
  /** Controlled chart type */
  chartType?: ChartType
  onChartTypeChange?: (type: ChartType) => void
  /** First load: price and chart are skeletons; when it turns false the line morphs in */
  loading?: boolean
  /** Show this point as scrubbed while the pointer isn't on the chart (static demos) */
  scrubIndex?: number
  /**
   * Fixed card height (e.g. matched to the swap box's panels); the chart takes
   * the leftover space, at least 108px. Unset, the chart is `chartHeight` tall.
   */
  height?: number
  /** Chart height when `height` is unset. Default 160. */
  chartHeight?: number
  /** Mark header / chart / periods with data-explode for a showcase's exploded-view transition */
  explode?: boolean
  /** The other token in the swap pair, offered as a switch in the header (see SparklineHeader) */
  pairToken?: Token
  onPairTokenSelect?: () => void
  /** A draggable price line over the chart (see SparklineChart) */
  priceLine?: SparklinePriceLine
  className?: string
}

/** Floor for the chart when the card has a fixed height; it otherwise takes whatever the header leaves */
const MIN_CHART_HEIGHT = 64

function TokenPriceSparklineInner({
  token,
  defaultPeriod = '1D',
  period: periodProp,
  onPeriodChange,
  defaultChartType = 'line',
  chartType: chartTypeProp,
  onChartTypeChange,
  loading = false,
  scrubIndex,
  height,
  chartHeight = 160,
  explode = false,
  pairToken,
  onPairTokenSelect,
  priceLine,
  className,
}: TokenPriceSparklineProps) {
  const [ownPeriod, setOwnPeriod] = React.useState(defaultPeriod)
  const period = periodProp ?? ownPeriod
  const [ownChartType, setOwnChartType] = React.useState(defaultChartType)
  const chartType = chartTypeProp ?? ownChartType
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const pinnedIndex = hoverIndex ?? scrubIndex ?? null
  // The y range takes the price line in, from where it was when a drag began until it ends
  const [heldInclude, setHeldInclude] = React.useState<number | null>(null)
  const include = priceLine ? (heldInclude ?? priceLine.value) : undefined
  const model = useSparklineModel(token, period, { paused: pinnedIndex !== null, include })
  // Candles scrub by candle: a pinned point shows as its candle's close
  const shownIndex =
    pinnedIndex !== null && chartType === 'candles' && !loading ? model.candles[candleIndexAt(model.candles, pinnedIndex)].last : pinnedIndex

  const setPeriod = (next: ChartPeriod) => {
    setHoverIndex(null)
    setOwnPeriod(next)
    onPeriodChange?.(next)
  }
  const setChartType = (next: ChartType) => {
    setHoverIndex(null)
    setOwnChartType(next)
    onChartTypeChange?.(next)
  }

  return (
    <div
      data-slot="token-price-sparkline"
      className={cn(
        'flex w-full flex-col gap-uni-8 rounded-uni-20 border border-surface3 bg-surface1 p-uni-8 shadow-uni-short',
        className,
      )}
      style={height ? { height } : undefined}
    >
      <div data-explode={explode ? 'header' : undefined}>
        <SparklineHeader
          model={model}
          pairToken={pairToken}
          onPairTokenSelect={onPairTokenSelect}
          chartType={chartType}
          onChartTypeChange={setChartType}
          hoverIndex={shownIndex}
          loading={loading}
          aside={
            <div data-explode={explode ? 'periods' : undefined}>
              <SparklinePeriodSelector value={period} onValueChange={setPeriod} />
            </div>
          }
        />
      </div>
      <div
        data-explode={explode ? 'chart' : undefined}
        // Bleeds into the card's left padding so the line starts at the edge; the
        // right inset keeps the latest-point blip clear of the border
        className={cn('-ml-uni-8 mr-uni-16', height && 'flex min-h-0 flex-1 basis-0 flex-col')}
        style={height ? { minHeight: MIN_CHART_HEIGHT } : undefined}
      >
        <SparklineChart
          model={model}
          priceLine={priceLine}
          onPriceLineDragChange={(dragging) => setHeldInclude(dragging && priceLine ? priceLine.value : null)}
          hoverIndex={shownIndex}
          onHoverIndexChange={setHoverIndex}
          loading={loading}
          type={chartType}
          className={height ? 'flex-1' : undefined}
          style={height ? undefined : { height: chartHeight }}
        />
      </div>
    </div>
  )
}

export const TokenPriceSparkline = React.memo(TokenPriceSparklineInner)
