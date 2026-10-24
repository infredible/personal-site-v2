'use client'

import * as React from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ChartPeriod } from '../chart/mockPriceHistory'
import { axisTicks, formatAxisTime, linePath } from '../chart/sparkline'
import { buildLiquidityBuckets, getMockLiquidity, type LiquidityBucket } from './mockLiquidity'
import { getPairPriceHistory, tokenColor } from './pools'
import {
  TICK_BASE,
  currentVisualTick,
  formatRangePrice,
  formatSignedPercent,
  nearestUsableTick,
  pairTokens,
  percentFromCurrent,
  usableTickBounds,
  visualHistory,
  withLower,
  withUpper,
  type VisualRange,
} from './ticks'
import type { Pool, RangePeriod, RangeView } from './types'
import { VIEW_ANIMATION_MS, fitRangeView, zoomViewAt } from './view'

/*
 * RangeChart: the "Set price range" chart of Uniswap's Create Position flow
 * (features/Liquidity/charts/D3LiquidityRangeInput/D3LiquidityRangeChart),
 * without d3: plain SVG drawn by React from the visible window.
 *
 * It's vertical. Price runs up the Y axis, linear in ticks (so log price),
 * time runs along X. Left to right: the pair's price history over [0, W],
 * the liquidity histogram right-aligned in the next 103px, and a 16px range
 * track at the far edge, where W = width - 120 (LIQUIDITY_CHART_WIDTH).
 *
 * The selected range is a 20% band in the pair's token colors, split at the
 * current price: the base token's color above it (that side of a position is
 * all base token), the quote's below. The price line and bars take the same
 * colors inside the range and fade (line: neutral2, bars: 20%) outside it.
 *
 * Interaction (store/actions/dragActions): drag an edge or its handle to move
 * that end (past the other end, they swap), drag the band or grip to move the
 * whole range, drag on the histogram to draw a new one, wheel to zoom around
 * the pointer. Ends snap to the tick spacing and stay at least one spacing and
 * 40px apart. Touch only drags the track's handles, grip and indicator, so a
 * finger elsewhere still scrolls the page. Full range shows the band over
 * everything and turns all of it off.
 */

/* Geometry (D3LiquidityChartShared/constants) ------------------------------ */

export const RANGE_CHART_HEIGHT = 300
/** Histogram + range track, right of the price line */
const LIQUIDITY_WIDTH = 120
const TRACK_WIDTH = 16
/** Track width + 1px gap */
const SECTION_OFFSET = TRACK_WIDTH + 1
const BARS_WIDTH = LIQUIDITY_WIDTH - SECTION_OFFSET
const TIMESCALE_HEIGHT = 20
const BAR_MIN = 3
const BAR_GAP = 1
const MIN_RANGE_PX = 40
const DRAG_MARGIN = 10
const DOT_RADIUS = 4
const HANDLE_RADIUS = 6
/** Invisible hit target around each handle, for fingers */
const HANDLE_HIT_RADIUS = 14
const EDGE_LINE = 3
const EDGE_HIT = 30
/** Shapes far off screen are clamped here, so rect sizes stay sane */
const OVERDRAW = 60

const LN_BASE = Math.log(TICK_BASE)
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The sparkline's mock history only goes back a year */
const AXIS_PERIOD: Record<RangePeriod, ChartPeriod> = { '1D': '1D', '1W': '1W', '1M': '1M', '1Y': '1Y', ALL: '1Y' }

// MinMaxPriceIndicatorsRenderer's fast-forward / fast-backward chevrons, centred on 0,0
const CHEVRON_UP =
  'M-3 -4.875L3 -4.875C3.207 -4.875 3.375 -4.707 3.375 -4.5C3.375 -4.293 3.207 -4.125 3 -4.125L0.77295 -4.125L2.78955 -1.57202C3.29355 -0.93402 2.83555 0 2.01855 0L0.00952 0C0.29402 0.0025 0.577 0.127 0.771 0.3725L2.78955 2.92798C3.29355 3.56598 2.83555 4.5 2.01855 4.5L-2.01855 4.5C-2.83555 4.5 -3.29355 3.56648 -2.78955 2.92798L-0.77148 0.3725C-0.57748 0.127 -0.29353 0.0025 -0.00903 0L-2.01855 0C-2.83555 0 -3.29355 -0.93352 -2.78955 -1.57202L-0.77295 -4.125L-3 -4.125C-3.207 -4.125 -3.375 -4.293 -3.375 -4.5C-3.375 -4.707 -3.207 -4.875 -3 -4.875Z'
const CHEVRON_DOWN =
  'M-3 4.875L3 4.875C3.207 4.875 3.375 4.707 3.375 4.5C3.375 4.293 3.207 4.125 3 4.125L0.77295 4.125L2.78955 1.57202C3.29355 0.93402 2.83555 0 2.01855 0L0.00952 0C0.29402 -0.0025 0.577 -0.127 0.771 -0.3725L2.78955 -2.92798C3.29355 -3.56598 2.83555 -4.5 2.01855 -4.5L-2.01855 -4.5C-2.83555 -4.5 -3.29355 -3.56648 -2.78955 -2.92798L-0.77148 -0.3725C-0.57748 -0.127 -0.29353 -0.0025 -0.00903 0L-2.01855 0C-2.83555 0 -3.29355 0.93352 -2.78955 1.57202L-0.77295 4.125L -3 4.125C-3.207 4.125 -3.375 4.293 -3.375 4.5C-3.375 4.707 -3.207 4.875 -3 4.875Z'

/** The handles' look: white, hairline stroke, soft shadow */
const HANDLE_STYLE = {
  fill: 'white',
  stroke: 'rgba(0,0,0,0.1)',
  strokeWidth: 1,
  style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' },
} as const

/** Colors above and below the current price: the base token's, then the quote's (useColor of each logo) */
export function getRangeChartColors(pool: Pool, inverted: boolean) {
  const { base, quote } = pairTokens(pool, inverted)
  return { above: tokenColor(base), below: tokenColor(quote) }
}

/* Hooks ------------------------------------------------------------------- */

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

const sameView = (a: RangeView, b: RangeView) => a.top === b.top && a.bottom === b.bottom

/**
 * The window on screen, easing to each new `view` over VIEW_ANIMATION_MS
 * (easeOutQuart, as the zoom buttons animate). `jump` shows a view at once,
 * for the views the chart emits itself (wheel): when that view comes back as
 * the prop it already matches, so nothing eases.
 */
function useAnimatedView(view: RangeView, reduceMotion: boolean) {
  const [shown, setShown] = React.useState(view)
  const shownRef = React.useRef(view)
  const frame = React.useRef(0)

  const jump = React.useCallback((next: RangeView) => {
    cancelAnimationFrame(frame.current)
    shownRef.current = next
    setShown(next)
  }, [])

  React.useEffect(() => {
    const from = shownRef.current
    if (sameView(from, view)) return
    if (reduceMotion) return jump(view)
    const start = performance.now()
    const step = (now: number) => {
      const t = easeOutQuart(Math.min(1, (now - start) / VIEW_ANIMATION_MS))
      const next = { top: from.top + (view.top - from.top) * t, bottom: from.bottom + (view.bottom - from.bottom) * t }
      shownRef.current = next
      setShown(next)
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
    // Primitives: a new object holding the same window isn't a new view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.top, view.bottom, reduceMotion, jump])

  return { shown, shownRef, jump }
}

const subscribeNoop = () => () => {}
/** Axis labels and the hover date are local times: rendered after hydration so server and browser agree */
const useMounted = () => React.useSyncExternalStore(subscribeNoop, () => true, () => false)

/* Chart ------------------------------------------------------------------- */

export interface RangeChartProps {
  pool: Pool
  inverted: boolean
  period: RangePeriod
  /** Visual range (lower = displayed Min price) */
  range: VisualRange
  fullRange: boolean
  /** Visible window. The chart eases to a new view over VIEW_ANIMATION_MS (easeOutQuart), except views it emitted itself via onViewChange (wheel), which apply at once. Reduced motion: no easing. */
  view: RangeView
  onViewChange?: (view: RangeView) => void
  /** Drags of a handle, the band/grip (moves the whole range, keeps width), or drag-to-draw on the histogram. final=true on pointer up. Visual ticks, snapped to spacing, min gap 1 spacing and 40px. Disabled in full range. */
  onRangeChange?: (range: VisualRange, info: { final: boolean }) => void
  /** Range % tooltips beside the min/max lines always (percent input mode); otherwise only while hovering the chart */
  showPercentTooltips?: boolean
  height?: number
  className?: string
}

type DragKind = 'lower' | 'upper' | 'move' | 'draw'

interface Drag {
  kind: DragKind
  pointerId: number
  /** The range when the drag began; every move is computed from it */
  start: VisualRange
  startY: number
  /** move: pointer offset from the range's centre */
  offset: number
  /** The latest range sent, null until the pointer moves */
  last: VisualRange | null
}

const DRAG_CURSOR: Record<DragKind, string> = { lower: 'ns-resize', upper: 'ns-resize', move: 'move', draw: 'crosshair' }

export function RangeChart({
  pool,
  inverted,
  period,
  range: rangeProp,
  fullRange,
  view,
  onViewChange,
  onRangeChange,
  showPercentTooltips = false,
  height = RANGE_CHART_HEIGHT,
  className,
}: RangeChartProps) {
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const rootRef = React.useRef<HTMLDivElement>(null)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const width = useWidth(rootRef)
  const reduceMotion = useReducedMotion() ?? false
  const { shown, shownRef, jump } = useAnimatedView(view, reduceMotion)
  const mounted = useMounted()

  const drag = React.useRef<Drag | null>(null)
  const [dragKind, setDragKind] = React.useState<DragKind | null>(null)
  /** The range mid-drag, ahead of the parent's prop */
  const [liveRange, setLiveRange] = React.useState<VisualRange | null>(null)
  const [hovered, setHovered] = React.useState(false)
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const [hoverBucket, setHoverBucket] = React.useState<number | null>(null)

  const range = liveRange ?? rangeProp
  const s = pool.tickSpacing
  const bounds = usableTickBounds(s)
  const current = currentVisualTick(pool, inverted)
  const colors = getRangeChartColors(pool, inverted)
  const { base, quote } = pairTokens(pool, inverted)
  const interactive = !fullRange && !!onRangeChange

  /* Scales: visual tick <-> y in the window on screen */
  const W = Math.max(0, width - LIQUIDITY_WIDTH)
  const span = shown.top - shown.bottom
  const tickToY = (tick: number) => ((shown.top - tick) / span) * height
  const yToTick = (y: number) => shown.top - (y / height) * span
  const clampY = (y: number) => clamp(y, -OVERDRAW, height + OVERDRAW)

  /* Price history, in displayed prices */
  const history = getPairPriceHistory(pool, period)
  const prices = React.useMemo(() => visualHistory(history, inverted), [history, inverted])
  const first = history[0].timestamp
  const last = history[history.length - 1].timestamp
  const xs = history.map((p) => (last === first ? 0 : ((p.timestamp - first) / (last - first)) * W))
  const dotY = tickToY(current)
  // The line ends at the pool's current price, on the dot (Uniswap appends it as the last point)
  const ys = prices.map((p, i) => (i === prices.length - 1 ? dotY : tickToY(Math.log(p) / LN_BASE)))
  const path = W > 0 ? linePath(ys, xs) : ''

  /* Liquidity buckets for the window */
  const segments = getMockLiquidity(pool)
  const buckets = React.useMemo(
    () => buildLiquidityBuckets(segments, shown.bottom, shown.top, s, inverted),
    [segments, shown.bottom, shown.top, s, inverted],
  )
  let maxLiquidity = 0
  for (const b of buckets) {
    if (b.upper > shown.bottom && b.lower < shown.top && b.liquidity > maxLiquidity) maxLiquidity = b.liquidity
  }

  /* The range on screen (full range covers everything) */
  const topY = fullRange ? 0 : clampY(tickToY(range.upper))
  const bottomY = fullRange ? height : clampY(tickToY(range.lower))
  const splitY = clamp(dotY, -OVERDRAW, height + OVERDRAW)
  // The track's indicator is at least 40px tall, grown about its centre
  const grow = Math.max(0, MIN_RANGE_PX - (bottomY - topY)) / 2
  const indTop = fullRange ? 0 : topY - grow
  const indBottom = fullRange ? height : bottomY + grow
  const trackX = W + BARS_WIDTH
  const handleX = W + LIQUIDITY_WIDTH - TRACK_WIDTH / 2 - 1
  const pastTop = !fullRange && tickToY(range.upper) < 0
  const pastBottom = !fullRange && tickToY(range.lower) > height
  const partlyVisible = tickToY(range.upper) < height && tickToY(range.lower) > 0
  const colorAt = (tick: number) => (tick >= current ? colors.above : colors.below)

  /* Range changes ------------------------------------------------------- */

  const snapFloor = (t: number) => Math.floor(t / s) * s
  const snapCeil = (t: number) => Math.ceil(t / s) * s
  const inBounds = (t: number) => clamp(t, bounds.minTick, bounds.maxTick)

  /** One end dragged to `raw` against the fixed `other` end, on the given side of it */
  const endAgainst = (other: number, raw: number, side: 'above' | 'below'): VisualRange => {
    const otherY = tickToY(other)
    if (side === 'above') {
      let t = raw
      if (otherY - tickToY(t) < MIN_RANGE_PX) t = snapCeil(yToTick(otherY - MIN_RANGE_PX))
      return { lower: other, upper: inBounds(Math.max(t, other + s)) }
    }
    let t = raw
    if (tickToY(t) - otherY < MIN_RANGE_PX) t = snapFloor(yToTick(otherY + MIN_RANGE_PX))
    return { lower: inBounds(Math.min(t, other - s)), upper: other }
  }

  const rangeAt = (d: Drag, y: number): VisualRange => {
    if (d.kind === 'upper' || d.kind === 'lower') {
      const raw = nearestUsableTick(yToTick(clamp(y, -DRAG_MARGIN, height + DRAG_MARGIN)), s)
      // Dragged past the other end, the two swap
      if (d.kind === 'upper') return endAgainst(d.start.lower, raw, raw >= d.start.lower ? 'above' : 'below')
      return endAgainst(d.start.upper, raw, raw <= d.start.upper ? 'below' : 'above')
    }
    if (d.kind === 'move') {
      // Keeps the width; the centre follows the pointer (less the grab offset)
      const width = d.start.upper - d.start.lower
      const center = yToTick(clamp(y - d.offset, 0, height))
      const lower = clamp(nearestUsableTick(center - width / 2, s), bounds.minTick, bounds.maxTick - width)
      return { lower, upper: lower + width }
    }
    // Draw: from where the drag began to the pointer, outward to whole spacings
    const a = yToTick(d.startY)
    const b = yToTick(clamp(y, 0, height))
    const lower = inBounds(snapFloor(Math.min(a, b)))
    return { lower, upper: inBounds(Math.max(snapCeil(Math.max(a, b)), lower + s)) }
  }

  const pointerY = (e: React.PointerEvent) => e.clientY - (svgRef.current?.getBoundingClientRect().top ?? 0)

  const beginDrag = (kind: DragKind) => (e: React.PointerEvent) => {
    if (!interactive || e.button !== 0) return
    // Fingers only drag the track's controls; elsewhere they scroll the page
    if (e.pointerType === 'touch' && (kind === 'draw' || e.currentTarget.getAttribute('data-track') === null)) return
    e.preventDefault()
    e.stopPropagation()
    svgRef.current?.setPointerCapture(e.pointerId)
    const y = pointerY(e)
    const center = (tickToY(range.upper) + tickToY(range.lower)) / 2
    drag.current = { kind, pointerId: e.pointerId, start: range, startY: y, offset: y - center, last: null }
    setDragKind(kind)
    setHoverIndex(null)
    setHoverBucket(null)
  }

  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return false
    const next = rangeAt(d, pointerY(e))
    // A draw starts once the pointer has moved a little, so a click on the bars doesn't draw a sliver
    if (d.kind === 'draw' && !d.last && Math.abs(pointerY(e) - d.startY) < 3) return true
    if (!d.last || next.lower !== d.last.lower || next.upper !== d.last.upper) {
      d.last = next
      setLiveRange(next)
      onRangeChange?.(next, { final: false })
    }
    return true
  }

  const endDrag = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragKind(null)
    setLiveRange(null)
    if (d.last) onRangeChange?.(d.last, { final: true })
  }

  /** Arrow keys on a handle: one spacing (PageUp/PageDown: ten) */
  const handleKeyDown = (end: 'lower' | 'upper') => (e: React.KeyboardEvent) => {
    if (!interactive) return
    const steps = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key]
    if (!steps) return
    e.preventDefault()
    const next =
      end === 'upper' ? withUpper(range, range.upper + steps * s, s) : withLower(range, range.lower + steps * s, s)
    onRangeChange?.(next, { final: true })
  }

  /* Wheel: zoom about the pointer. Native and non-passive, so the page doesn't scroll. */
  const latest = React.useRef({ fullRange, onViewChange, s, height, interactive })
  React.useLayoutEffect(() => {
    latest.current = { fullRange, onViewChange, s, height, interactive }
  })
  React.useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const { fullRange, onViewChange, s, height } = latest.current
      if (fullRange || !onViewChange) return
      e.preventDefault()
      const y = clamp(e.clientY - el.getBoundingClientRect().top, 0, height)
      const v = shownRef.current
      const anchor = v.top - (y / height) * (v.top - v.bottom)
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1)
      // Trackpad pinches arrive as small ctrl+wheel deltas: scale them up
      const factor = clamp(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.002)), 0.5, 2)
      const next = zoomViewAt(v, factor, anchor, s)
      jump(next)
      onViewChange(next)
    }
    // touch-action on SVG shapes isn't honored everywhere (iOS): a finger on the
    // track's controls also cancels the scroll here. Elsewhere the page scrolls.
    const onTouchStart = (e: TouchEvent) => {
      if (latest.current.interactive && e.target instanceof Element && e.target.closest('[data-track]')) e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
    }
  }, [jump, shownRef])

  /* Hover: the dot follows the nearest price point; bars light up under the pointer */
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (moveDrag(e)) return
    if (e.pointerType !== 'mouse') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let index: number | null = null
    if (x >= 0 && x < W && xs.length > 0) {
      index = 0
      for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[index] - x)) index = i
    }
    let bucket: number | null = null
    if (x >= W && x < trackX) {
      const tick = yToTick(y)
      const i = buckets.findIndex((b) => tick >= b.lower && tick < b.upper)
      bucket = i >= 0 ? i : null
    }
    if (index !== hoverIndex) setHoverIndex(index)
    if (bucket !== hoverBucket) setHoverBucket(bucket)
  }

  /* Range % tooltips: beside each edge, nudged apart when the edges are close */
  const showPercents = !fullRange && (showPercentTooltips || hovered || dragKind !== null)
  const TIP_HALF = 17
  let maxTipY = tickToY(range.upper)
  let minTipY = tickToY(range.lower)
  if (minTipY - maxTipY < TIP_HALF * 2 + 4) {
    const mid = (minTipY + maxTipY) / 2
    maxTipY = mid - TIP_HALF - 2
    minTipY = mid + TIP_HALF + 2
  }
  const percentTips = showPercents
    ? [
        { key: 'max', y: maxTipY, visible: tickToY(range.upper) >= 0 && tickToY(range.upper) <= height, tick: range.upper },
        { key: 'min', y: minTipY, visible: tickToY(range.lower) >= 0 && tickToY(range.lower) <= height, tick: range.lower },
      ].filter((t) => t.visible)
    : []

  /* Time labels: about four, clear of the ends */
  const axisPeriod = AXIS_PERIOD[period]
  let timeLabels: { t: number; x: number }[] = []
  if (mounted && W > 0) {
    const all = axisTicks(first, last, axisPeriod)
      .map((t) => ({ t, x: ((t - first) / (last - first)) * W }))
      .filter(({ x }) => x > 24 && x < W - 20)
    const most = clamp(Math.floor(W / 60), 2, 4)
    const every = Math.ceil(all.length / most)
    timeLabels = all.filter((_, i) => i % every === 0)
  }

  const hoverPoint = hoverIndex !== null && dragKind === null ? hoverIndex : null
  const dotX = hoverPoint !== null ? xs[hoverPoint] : W
  const dotCy = hoverPoint !== null ? ys[hoverPoint] : dotY
  const touchNone = { touchAction: 'none' } as const

  const bandRects = (x: number, w: number, opacity: number) => (
    <>
      {topY < splitY && (
        <rect x={x} y={topY} width={w} height={Math.max(0, Math.min(splitY, bottomY) - topY)} fill={colors.above} opacity={opacity} />
      )}
      {bottomY > splitY && (
        <rect x={x} y={Math.max(topY, splitY)} width={w} height={Math.max(0, bottomY - Math.max(topY, splitY))} fill={colors.below} opacity={opacity} />
      )}
    </>
  )

  const barOpacity = (b: LiquidityBucket, i: number) => {
    if (i === hoverBucket) return 1
    const center = (b.lower + b.upper) / 2
    const base = fullRange || (center >= range.lower && center <= range.upper) ? 0.8 : 0.2
    return b.liquidity > 0 ? base : base * 0.3
  }
  const bars = (fill: string) =>
    buckets.map((b, i) => {
      const w = clamp(maxLiquidity > 0 ? (b.liquidity / maxLiquidity) * BARS_WIDTH : 0, BAR_MIN, BARS_WIDTH)
      const y = tickToY(b.upper)
      if (y > height + OVERDRAW || tickToY(b.lower) < -OVERDRAW) return null
      return (
        <rect
          key={b.lower}
          x={trackX - w}
          y={y}
          width={w}
          height={Math.max(BAR_MIN, tickToY(b.lower) - y - BAR_GAP)}
          fill={fill}
          opacity={barOpacity(b, i)}
        />
      )
    })

  return (
    <div
      ref={rootRef}
      data-slot="range-chart"
      className={cn('relative w-full select-none', className)}
      style={{ cursor: dragKind ? DRAG_CURSOR[dragKind] : undefined }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        setHovered(false)
        setHoverIndex(null)
        setHoverBucket(null)
      }}
    >
      <svg
        ref={svgRef}
        role="group"
        aria-label={`${base.symbol}/${quote.symbol} price range chart`}
        width={width || undefined}
        height={height}
        className="block w-full overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        {width > 0 && (
          <>
            <defs>
              <clipPath id={`${id}-in-above`}>
                <rect x={0} y={topY} width={W} height={Math.max(0, Math.min(splitY, bottomY) - topY)} />
              </clipPath>
              <clipPath id={`${id}-in-below`}>
                <rect x={0} y={Math.max(topY, splitY)} width={W} height={Math.max(0, bottomY - Math.max(topY, splitY))} />
              </clipPath>
              <clipPath id={`${id}-out`}>
                <rect x={0} y={-OVERDRAW} width={W} height={Math.max(0, topY + OVERDRAW)} />
                <rect x={0} y={bottomY} width={W} height={Math.max(0, height + OVERDRAW - bottomY)} />
              </clipPath>
              <clipPath id={`${id}-bars-above`}>
                <rect x={W} y={-OVERDRAW} width={LIQUIDITY_WIDTH} height={Math.max(0, splitY + OVERDRAW)} />
              </clipPath>
              <clipPath id={`${id}-bars-below`}>
                <rect x={W} y={splitY} width={LIQUIDITY_WIDTH} height={Math.max(0, height + OVERDRAW - splitY)} />
              </clipPath>
              <clipPath id={`${id}-indicator`}>
                <rect x={trackX} y={indTop} width={TRACK_WIDTH} height={indBottom - indTop} rx={8} />
              </clipPath>
              <linearGradient id={`${id}-dot`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.above} />
                <stop offset="100%" stopColor={colors.below} />
              </linearGradient>
            </defs>

            {/* Hover target for the price plot */}
            <rect x={0} y={0} width={W} height={height} fill="transparent" />

            {/* Price history: token colors inside the range, neutral outside */}
            <g fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
              <path d={path} stroke={colors.above} clipPath={`url(#${id}-in-above)`} />
              <path d={path} stroke={colors.below} clipPath={`url(#${id}-in-below)`} />
              <path d={path} className="stroke-neutral2" clipPath={`url(#${id}-out)`} />
            </g>

            {/* Liquidity histogram */}
            <g pointerEvents="none">
              <g clipPath={`url(#${id}-bars-above)`}>{bars(colors.above)}</g>
              <g clipPath={`url(#${id}-bars-below)`}>{bars(colors.below)}</g>
            </g>

            {/* Selected band, across the plot and the bars */}
            <g pointerEvents="none">{bandRects(0, trackX, 0.2)}</g>

            {/* Edge lines, just outside the band */}
            {!fullRange && (
              <g pointerEvents="none" opacity={0.08} strokeWidth={EDGE_LINE}>
                <line x1={0} x2={trackX} y1={topY - EDGE_LINE / 2} y2={topY - EDGE_LINE / 2} stroke={colorAt(range.upper)} />
                <line x1={0} x2={trackX} y1={bottomY + EDGE_LINE / 2} y2={bottomY + EDGE_LINE / 2} stroke={colorAt(range.lower)} />
              </g>
            )}

            {/* Range track and its indicator */}
            <rect x={trackX} y={0} width={TRACK_WIDTH} height={height} rx={4} className="fill-surface3" />
            <g
              clipPath={`url(#${id}-indicator)`}
              data-track=""
              onPointerDown={beginDrag('move')}
              style={interactive ? { ...touchNone, cursor: 'move' } : undefined}
            >
              {indTop < splitY && (
                <rect x={trackX} y={indTop} width={TRACK_WIDTH} height={Math.max(0, Math.min(splitY, indBottom) - indTop)} fill={colors.above} />
              )}
              {indBottom > splitY && (
                <rect
                  x={trackX}
                  y={Math.max(indTop, splitY)}
                  width={TRACK_WIDTH}
                  height={Math.max(0, indBottom - Math.max(indTop, splitY))}
                  fill={colors.below}
                />
              )}
            </g>

            {interactive && (
              <>
                {/* Drag targets: the band moves the range, the edges move an end, the bars draw a new one */}
                <rect
                  x={0}
                  y={topY}
                  width={W}
                  height={Math.max(0, bottomY - topY)}
                  fill="transparent"
                  style={{ cursor: 'move' }}
                  onPointerDown={beginDrag('move')}
                />
                <line
                  x1={0}
                  x2={W}
                  y1={topY}
                  y2={topY}
                  stroke="transparent"
                  strokeWidth={EDGE_HIT}
                  style={{ cursor: 'ns-resize' }}
                  onPointerDown={beginDrag('upper')}
                />
                <line
                  x1={0}
                  x2={W}
                  y1={bottomY}
                  y2={bottomY}
                  stroke="transparent"
                  strokeWidth={EDGE_HIT}
                  style={{ cursor: 'ns-resize' }}
                  onPointerDown={beginDrag('lower')}
                />
                <rect
                  x={W}
                  y={0}
                  width={BARS_WIDTH}
                  height={height}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onPointerDown={beginDrag('draw')}
                />
              </>
            )}

            {/* Current price: a dotted line, and a dot at the end of the price line */}
            <g pointerEvents="none">
              <line
                x1={0}
                x2={trackX}
                y1={dotY}
                y2={dotY}
                className="stroke-neutral2"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray="0,6"
                opacity={0.8}
              />
              <circle cx={dotX} cy={dotCy} r={DOT_RADIUS} fill={`url(#${id}-dot)`} />
            </g>

            {/* Handles and grip, or a chevron where an end is out of view */}
            {!fullRange && (
              <>
                {pastTop ? (
                  <g
                    transform={`translate(${handleX}, 10)`}
                    className="cursor-pointer"
                    onClick={() => onViewChange?.(fitRangeView(range, s))}
                  >
                    <rect x={-8} y={-8} width={16} height={16} fill="transparent" />
                    <path d={CHEVRON_UP} fill={partlyVisible ? 'white' : colorAt(range.upper)} opacity={0.65} />
                  </g>
                ) : (
                  <Handle
                    cx={handleX}
                    cy={indTop + 8}
                    label="Max price"
                    valueText={formatRangePrice(Math.pow(TICK_BASE, range.upper))}
                    interactive={interactive}
                    onPointerDown={beginDrag('upper')}
                    onKeyDown={handleKeyDown('upper')}
                  />
                )}
                {pastBottom ? (
                  <g
                    transform={`translate(${handleX}, ${height - 10})`}
                    className="cursor-pointer"
                    onClick={() => onViewChange?.(fitRangeView(range, s))}
                  >
                    <rect x={-8} y={-8} width={16} height={16} fill="transparent" />
                    <path d={CHEVRON_DOWN} fill={partlyVisible ? 'white' : colorAt(range.lower)} opacity={0.65} />
                  </g>
                ) : (
                  <Handle
                    cx={handleX}
                    cy={indBottom - 8}
                    label="Min price"
                    valueText={formatRangePrice(Math.pow(TICK_BASE, range.lower))}
                    interactive={interactive}
                    onPointerDown={beginDrag('lower')}
                    onKeyDown={handleKeyDown('lower')}
                  />
                )}
                <g
                  data-track=""
                  onPointerDown={beginDrag('move')}
                  style={interactive ? { ...touchNone, cursor: 'move' } : undefined}
                >
                  <rect x={handleX - HANDLE_HIT_RADIUS} y={(indTop + indBottom) / 2 - 8} width={HANDLE_HIT_RADIUS * 2} height={16} fill="transparent" />
                  <rect x={handleX - 6} y={(indTop + indBottom) / 2 - 3} width={12} height={6} rx={2} {...HANDLE_STYLE} />
                  {[0, 1, 2].map((i) => (
                    <rect
                      key={i}
                      x={handleX - 1.75 + i * 1.25}
                      y={(indTop + indBottom) / 2 - 1.5}
                      width={0.5}
                      height={3}
                      fill="rgba(0,0,0,0.3)"
                      pointerEvents="none"
                    />
                  ))}
                </g>
              </>
            )}
          </>
        )}
      </svg>

      {/* Timescale */}
      <div aria-hidden className="relative text-[12px] leading-[20px] text-neutral2 tabular-nums" style={{ height: TIMESCALE_HEIGHT }}>
        {timeLabels.map(({ t, x }) => (
          <span key={t} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: x }}>
            {formatAxisTime(t, axisPeriod)}
          </span>
        ))}
      </div>

      {/* Range % beside each edge */}
      {percentTips.map((tip) => (
        <div
          key={tip.key}
          className={cn(Tooltip, 'left-uni-8 min-w-[60px] -translate-y-1/2 justify-center text-neutral1')}
          style={{ top: clamp(tip.y, TIP_HALF, height - TIP_HALF) }}
        >
          <span className="font-medium">{formatSignedPercent(percentFromCurrent(tip.tick, current))}</span>
        </div>
      ))}

      {/* Price at the hovered point */}
      {hoverPoint !== null && mounted && (
        <div
          className={cn(Tooltip, 'flex-col gap-uni-4')}
          style={{
            top: clamp(ys[hoverPoint] - 18, 0, height - 52),
            ...(xs[hoverPoint] > W * 0.6
              ? { right: width - xs[hoverPoint] + DOT_RADIUS + 8 }
              : { left: xs[hoverPoint] + DOT_RADIUS + 8 }),
          }}
        >
          <span className="text-neutral2">
            {new Date(history[hoverPoint].timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          <span className="text-neutral1 tabular-nums">
            {formatRangePrice(prices[hoverPoint])}{' '}
            <span className="text-neutral2">
              {base.symbol}/{quote.symbol}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

/** Tooltip surface (PriceTooltip / PriceDifferenceTooltip) */
const Tooltip =
  'pointer-events-none absolute flex whitespace-nowrap rounded-uni-12 border border-surface3 bg-surface2 p-uni-8 text-body4'

function Handle({
  cx,
  cy,
  label,
  valueText,
  interactive,
  onPointerDown,
  onKeyDown,
}: {
  cx: number
  cy: number
  label: string
  valueText: string
  interactive: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <g
      data-track=""
      role={interactive ? 'slider' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      aria-orientation={interactive ? 'vertical' : undefined}
      aria-valuetext={interactive ? valueText : undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="group/handle outline-none"
      style={interactive ? { touchAction: 'none', cursor: 'ns-resize' } : undefined}
    >
      <circle cx={cx} cy={cy} r={HANDLE_HIT_RADIUS} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={HANDLE_RADIUS}
        {...HANDLE_STYLE}
        className="group-focus-visible/handle:stroke-neutral1 group-focus-visible/handle:stroke-2"
      />
    </g>
  )
}
