import { priceToTick, usableTickBounds, type VisualRange } from './ticks'
import type { RangeView } from './types'

/*
 * The chart's visible window (D3LiquidityChartShared viewport utils), in
 * visual ticks. Uniswap keeps zoom + pan over the full tick range; a window
 * is the same thing, and simpler to animate and fit.
 */

/** Zoom buttons step by 1.3× (ZOOM_FACTOR), animated over 400ms */
export const ZOOM_FACTOR = 1.3
export const VIEW_ANIMATION_MS = 400

/** Closest zoom: ~10 spacings tall (maxZoom = 30 · fullRange / (spacing · 300)) */
export const minViewSpan = (tickSpacing: number) => tickSpacing * 10

function clampSpan(span: number, tickSpacing: number) {
  const { minTick, maxTick } = usableTickBounds(tickSpacing)
  return Math.min(maxTick - minTick, Math.max(minViewSpan(tickSpacing), span))
}

const around = (center: number, span: number): RangeView => ({ bottom: center - span / 2, top: center + span / 2 })

export const viewSpan = (view: RangeView) => view.top - view.bottom
export const viewCenter = (view: RangeView) => (view.top + view.bottom) / 2

/** Zoom about the window's center: factor > 1 zooms in */
export function zoomView(view: RangeView, factor: number, tickSpacing: number): RangeView {
  return around(viewCenter(view), clampSpan(viewSpan(view) / factor, tickSpacing))
}

/** Zoom about a tick (wheel zoom under the pointer): that tick stays put on screen */
export function zoomViewAt(view: RangeView, factor: number, anchor: number, tickSpacing: number): RangeView {
  const span = clampSpan(viewSpan(view) / factor, tickSpacing)
  const t = (anchor - view.bottom) / viewSpan(view)
  return { bottom: anchor - t * span, top: anchor + (1 - t) * span }
}

/** Expand / Reset: the range fills 1/1.5 of the window, centered */
export function fitRangeView({ lower, upper }: VisualRange, tickSpacing: number, padding = 1.5): RangeView {
  return around((lower + upper) / 2, clampSpan((upper - lower) * padding, tickSpacing))
}

/** Full range: the window fits the price history (and the current price) */
export function historyView(history: number[], currentTick: number, tickSpacing: number): RangeView {
  const ticks = [...history.map(priceToTick), currentTick]
  return fitRangeView({ lower: Math.min(...ticks), upper: Math.max(...ticks) }, tickSpacing, 1.3)
}
