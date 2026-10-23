'use client'

import * as React from 'react'
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '../SegmentedControl'
import { Shimmer, TextSkeleton } from '../Skeleton'
import { ArrowUpRight, Heart } from '../icons'
import { UniTooltip } from '../UniTooltip'
import { TokenLogo } from '../swap/parts/TokenLogo'
import type { Token } from '../swap/types'
import { CHART_PERIODS, getMockPriceHistory, isStablecoin, type ChartPeriod, type PricePoint } from './mockPriceHistory'
import {
  VIEW_H,
  VIEW_W,
  areaPath,
  directionOf,
  formatChartTime,
  formatFiatDelta,
  formatPercentAbs,
  formatTokenPrice,
  linePath,
  percentChange,
  toViewY,
  waveY,
  xAt,
  type PriceDirection,
} from './sparkline'

/*
 * TokenPriceSparkline: the mini price chart Uniswap web shows beside the swap
 * box on wide screens (apps/web/src/pages/Swap/Swap/SlideoutChartCard):
 * token row, price + change with a 1H…1Y period selector beside it, and a
 * line chart with a fill fading down from the line. Hover or touch-drag scrubs: a crosshair
 * and dot follow the pointer and the header shows that point's price, change
 * from the period start, and time; leaving reverts to the latest price.
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
  start: number
  end: number
  /** Change over the period, as a fraction */
  change: number
  direction: PriceDirection
}

export function useSparklineModel(token: Token, period: ChartPeriod): SparklineModel {
  return React.useMemo(() => {
    const points = getMockPriceHistory(token, period)
    const start = points[0].value
    const end = points[points.length - 1].value
    const change = percentChange(start, end)
    return {
      token,
      period,
      points,
      ys: toViewY(points, { stablecoin: isStablecoin(token) }),
      start,
      end,
      change,
      direction: directionOf(change),
    }
  }, [token, period])
}

/** Line color by direction: success up, critical down, neutral when it rounds to 0.00% */
const DIRECTION_TEXT: Record<PriceDirection, string> = {
  up: 'text-statusSuccess',
  down: 'text-statusCritical',
  flat: 'text-neutral2',
}

/* Delta ------------------------------------------------------------------- */

/** Uniswap's ArrowChange (a rounded triangle), pointing down; rotated for up */
function DeltaTriangle({ direction, className }: { direction: PriceDirection; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={direction === 'down' ? 'down' : 'up'}
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
  className?: string
}

/** 32px round icon button with a 20px icon, like the swap header's gear; tooltip names it */
function HeaderIconButton({ label, className, children, ...props }: React.ComponentProps<'button'> & { label: string }) {
  return (
    <UniTooltip content={label} side="top">
      <button
        type="button"
        aria-label={label}
        className={cn(
          'flex size-uni-32 shrink-0 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 outline-none',
          'transition-colors duration-[80ms] ease-out hover:text-neutral2Hovered [&_svg]:size-uni-20',
          'focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </UniTooltip>
  )
}

export function SparklineHeader({ model, hoverIndex = null, loading = false, aside, className }: SparklineHeaderProps) {
  const { token, points, start, period } = model
  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined
  const price = hovered?.value ?? model.end
  const label = hovered ? formatChartTime(hovered.timestamp, period) : CHART_PERIODS.find((p) => p.value === period)?.description
  const [favorited, setFavorited] = React.useState(false)

  return (
    <div data-slot="sparkline-header" className={cn('flex flex-col gap-uni-12', className)}>
      {/* Token bar: spans the card edge to edge, ruled off from the price */}
      <div className="-mx-uni-8 flex min-w-0 items-center gap-uni-8 border-b border-surface3 px-uni-16 pt-uni-8 pb-uni-12">
        <TokenLogo token={token} size={24} />
        <span className="truncate text-body2 text-neutral1">{token.name}</span>
        <div className="-mr-uni-4 ml-auto flex shrink-0 items-center gap-uni-4">
          <HeaderIconButton
            label={favorited ? 'Remove from favorites' : 'Favorite'}
            aria-pressed={favorited}
            onClick={() => setFavorited((f) => !f)}
            className={cn(favorited && 'text-accent1 hover:text-accent1Hovered')}
          >
            <Heart />
          </HeaderIconButton>
          <HeaderIconButton label={`View ${token.symbol}`}>
            <ArrowUpRight />
          </HeaderIconButton>
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

export interface SparklineChartProps {
  model: SparklineModel
  hoverIndex?: number | null
  /** Scrubbing callback; null when the pointer leaves or the touch ends. Omit for a static chart. */
  onHoverIndexChange?: (index: number | null) => void
  /** Draws a placeholder wave under a shimmer; when data arrives the wave morphs into the line */
  loading?: boolean
  className?: string
  style?: React.CSSProperties
}

export function SparklineChart({ model, hoverIndex = null, onHoverIndexChange, loading = false, className, style }: SparklineChartProps) {
  const gradientId = React.useId().replace(/:/g, '')
  const reduceMotion = useReducedMotion()
  const lineRef = React.useRef<SVGPathElement>(null)
  const areaRef = React.useRef<SVGPathElement>(null)
  const drawn = React.useRef<number[] | null>(null)
  const morph = React.useRef<AnimationPlaybackControls | null>(null)

  const n = model.points.length
  const target = React.useMemo(() => (loading ? waveY(n) : model.ys), [loading, n, model.ys])

  const draw = React.useCallback((ys: number[]) => {
    drawn.current = ys
    lineRef.current?.setAttribute('d', linePath(ys))
    areaRef.current?.setAttribute('d', areaPath(ys))
  }, [])

  // React renders `d` at the target; on a change, this rewinds it to what was on
  // screen before paint and morphs point by point to the new series.
  React.useLayoutEffect(() => {
    const from = drawn.current
    if (!from || from.length !== target.length || reduceMotion) return void draw(target)
    const controls = animate(0, 1, {
      ...MORPH,
      onUpdate: (t) => draw(from.map((y, i) => y + (target[i] - y) * t)),
      onComplete: () => {
        morph.current = null
        draw(target)
      },
    })
    morph.current = controls
    return () => controls.stop()
  }, [target, reduceMotion, draw])

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
    return Math.round(f * (n - 1))
  }

  const hovered = !loading && hoverIndex !== null ? hoverIndex : null
  // The dot sits on the scrubbed point, else blips on the latest one
  const marked = loading ? null : (hovered ?? n - 1)
  const x = marked !== null ? (xAt(marked, n) / VIEW_W) * 100 : 0
  const y = marked !== null ? (model.ys[marked] / VIEW_H) * 100 : 0

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
        'relative min-h-0 rounded-r-uni-12 outline-none select-none focus-visible:ring-1 focus-visible:ring-neutral3',
        interactive && 'cursor-none touch-pan-y',
        loading ? 'text-neutral3' : DIRECTION_TEXT[model.direction],
        // Direction changes (e.g. switching to a down token) recolor with the morph
        'transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
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
              const step = e.shiftKey ? 8 : 1
              const current = hoverIndex ?? n - 1
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
          </defs>
          <path
            ref={areaRef}
            d={areaPath(target)}
            fill={`url(#${gradientId})`}
            className={cn('transition-opacity duration-200 ease-out', loading && 'opacity-0')}
          />
          <path
            ref={lineRef}
            d={linePath(target)}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </Shimmer>

      {hovered !== null && (
        // Crosshair: a dotted vertical line, no horizontal
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-0 -translate-x-1/2 border-l border-dotted border-neutral3"
          style={{ left: `${x}%` }}
        />
      )}
      {marked !== null && (
        <span aria-hidden className="pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%` }}>
          {/* At rest, the latest point blips: a halo pings out from the dot */}
          {hovered === null && (
            <span className="absolute size-uni-16 -translate-1/2 rounded-uni-full bg-current opacity-40 motion-safe:animate-ping" />
          )}
          <span className="absolute size-[10px] -translate-1/2 rounded-uni-full border-2 border-white bg-current" />
        </span>
      )}
    </div>
  )
}

/* Period selector --------------------------------------------------------- */

const PERIOD_OPTIONS = CHART_PERIODS.map(({ value, label }) => ({ value, label }))

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
  className?: string
}

/** Floor for the chart when the card has a fixed height; it otherwise takes whatever the header leaves */
const MIN_CHART_HEIGHT = 64

function TokenPriceSparklineInner({
  token,
  defaultPeriod = '1D',
  period: periodProp,
  onPeriodChange,
  loading = false,
  scrubIndex,
  height,
  chartHeight = 160,
  explode = false,
  className,
}: TokenPriceSparklineProps) {
  const [ownPeriod, setOwnPeriod] = React.useState(defaultPeriod)
  const period = periodProp ?? ownPeriod
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const model = useSparklineModel(token, period)
  const shownIndex = hoverIndex ?? scrubIndex ?? null

  const setPeriod = (next: ChartPeriod) => {
    setHoverIndex(null)
    setOwnPeriod(next)
    onPeriodChange?.(next)
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
          hoverIndex={shownIndex}
          onHoverIndexChange={setHoverIndex}
          loading={loading}
          className={height ? 'flex-1' : undefined}
          style={height ? undefined : { height: chartHeight }}
        />
      </div>
    </div>
  )
}

export const TokenPriceSparkline = React.memo(TokenPriceSparklineInner)
