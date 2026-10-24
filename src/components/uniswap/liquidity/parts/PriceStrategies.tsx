import { cn } from '@/lib/utils'
import { Check } from '../../icons'
import { formatSignedPercent, percentFromCurrent, stablePercentLabel, type VisualRange } from '../ticks'
import type { PriceStrategyId, RangeOption } from '../types'

/*
 * The range options, redesigned. Uniswap splits this choice in two: a Full
 * range | Custom range SegmentedControl at the top of the step, and four
 * narrow "Price strategies" cards under the chart whose values and sentences
 * wrap into ragged stacks. Here it's one radio group of six wide tiles, 2×3
 * (one column in narrow containers), ordered widest to narrowest:
 *
 *   Full range        0 to ∞   Wide       −50% to +100%
 *   One-sided lower  −50% to 0%   One-sided upper  0% to +100%
 *   Stable            ± 0.3%   Custom    −10.65% to +11.90%
 *
 * - Title and value share the first line; the value is tabular and never
 *   wraps. The use case is a short phrase on one line.
 * - Custom is the range set by hand. It's selected whenever the range matches
 *   no preset (a drag, a stepper, a typed price), and its value is the live
 *   range; picking it keeps the current range to start from.
 * - Selection: surface3 fill plus a check, so it doesn't rest on a fill alone.
 * - The group comes first in the step, so choosing a range is the default
 *   path, and the chart is the advanced one.
 */

interface PriceStrategiesProps {
  tickSpacing: number
  selected: RangeOption
  /** The committed range and current price (visual ticks), for Custom's value */
  range: VisualRange
  currentTick: number
  onSelect?: (option: RangeOption) => void
  className?: string
}

const OPTIONS: { id: RangeOption; title: string; description: string }[] = [
  { id: 'full', title: 'Full range', description: 'Every price, least upkeep' },
  { id: 'wide', title: 'Wide', description: 'Volatile pairs' },
  { id: 'one-sided-lower', title: 'One-sided lower', description: 'Buys in as the price falls' },
  { id: 'one-sided-upper', title: 'One-sided upper', description: 'Sells out as the price rises' },
  { id: 'stable', title: 'Stable', description: 'Stablecoins, low volatility' },
  { id: 'custom', title: 'Custom', description: 'Set your own min and max' },
]

const STRATEGY_VALUES: Record<Exclude<PriceStrategyId, 'stable'>, string> = {
  wide: '−50% to +100%',
  'one-sided-lower': '−50% to 0%',
  'one-sided-upper': '0% to +100%',
}

/** A bound's % from the current price, with a true minus to match the other tiles */
const tileOffset = (tick: number, currentTick: number) =>
  formatSignedPercent(percentFromCurrent(tick, currentTick)).replace('-', '−')

function optionValue(id: RangeOption, { tickSpacing, selected, range, currentTick }: PriceStrategiesProps) {
  switch (id) {
    case 'full':
      return '0 to ∞'
    case 'stable':
      return stablePercentLabel(tickSpacing)
    case 'custom':
      if (selected !== 'custom') return 'Any range'
      return `${tileOffset(range.lower, currentTick)} to ${tileOffset(range.upper, currentTick)}`
    default:
      return STRATEGY_VALUES[id]
  }
}

function PriceStrategies(props: PriceStrategiesProps) {
  const { selected, onSelect, className } = props
  return (
    <div
      data-slot="price-strategies"
      role="radiogroup"
      aria-label="Price range"
      className={cn('grid grid-cols-2 gap-uni-8 bg-surface2 p-uni-16 @max-[440px]/range:grid-cols-1', className)}
    >
      {OPTIONS.map((option) => {
        const isSelected = selected === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-option={option.id}
            onClick={() => onSelect?.(option.id)}
            className={cn(
              'flex min-w-0 flex-col gap-uni-2 rounded-uni-12 border px-uni-12 py-uni-12 text-left outline-none',
              'transition-[background-color,border-color,scale] duration-100 ease-out',
              'active:scale-[0.98] focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
              isSelected ? 'border-transparent bg-surface3' : 'border-surface3 bg-surface1 hover:bg-surface1Hovered',
              onSelect ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <span className="flex items-center justify-between gap-uni-8">
              <span className="flex min-w-0 items-center gap-uni-4 text-buttonLabel3 text-neutral1">
                <span className="truncate">{option.title}</span>
                {isSelected && <Check aria-hidden className="size-uni-16 shrink-0 text-accent1" />}
              </span>
              <span
                className={cn(
                  'shrink-0 text-body3 whitespace-nowrap tabular-nums',
                  option.id === 'custom' && !isSelected ? 'text-neutral3' : 'text-neutral1',
                )}
              >
                {optionValue(option.id, props)}
              </span>
            </span>
            <span className="truncate text-body4 text-neutral2">{option.description}</span>
          </button>
        )
      })}
    </div>
  )
}

export { PriceStrategies }
export type { PriceStrategiesProps }
