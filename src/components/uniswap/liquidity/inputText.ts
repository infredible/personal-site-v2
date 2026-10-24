import { formatInputPrice, percentFromCurrent, rangeEndPrice } from './ticks'
import type { RangeInputMode } from './types'

/**
 * Committed text of a min/max input: the snapped price ("3412.55"), or in
 * percent mode its % from the current price ("-8.00"). Full range reads 0 / ∞.
 */
export function rangeEndText({
  tick,
  end,
  mode,
  fullRange,
  tickSpacing,
  currentTick,
}: {
  /** Visual tick of this end */
  tick: number
  end: 'lower' | 'upper'
  mode: RangeInputMode
  fullRange: boolean
  tickSpacing: number
  currentTick: number
}) {
  if (fullRange || mode === 'price') return formatInputPrice(rangeEndPrice(tick, end, tickSpacing, fullRange))
  return (percentFromCurrent(tick, currentTick) * 100).toFixed(2)
}
