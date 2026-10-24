import { cn } from '@/lib/utils'
import { Check } from '../../icons'
import { stablePercentLabel } from '../ticks'
import type { PriceStrategyId } from '../types'

/*
 * "Price strategies", redesigned. Uniswap's DefaultPriceStrategies puts four
 * narrow cards in a row (title, value, a sentence), and in a ~560px step the
 * values and sentences wrap into ragged three-line stacks. Here each option is
 * a wide tile in a 2×2 grid (one column in narrow containers):
 *
 *   Stable                    ± 0.3%
 *   Stablecoins, low volatility
 *
 * - Title and value share the first line; the value is tabular and never
 *   wraps (Wide reads "−50% to +100%" instead of a stacked dash).
 * - The use case is a short phrase on one line, rather than a sentence.
 * - Selection is a radio group: surface3 fill plus a check, so the selected
 *   tile reads without relying on a subtle fill alone. A range edited by hand
 *   selects none.
 * - It sits first in the step, so picking a strategy is the default path and
 *   the chart is the advanced one.
 */

interface PriceStrategiesProps {
  tickSpacing: number
  /** The strategy the range came from; null once edited by hand */
  selected: PriceStrategyId | null
  onSelect?: (id: PriceStrategyId) => void
  className?: string
}

const STRATEGIES: { id: PriceStrategyId; title: string; description: string }[] = [
  { id: 'stable', title: 'Stable', description: 'Stablecoins, low volatility' },
  { id: 'wide', title: 'Wide', description: 'Volatile pairs' },
  { id: 'one-sided-lower', title: 'One-sided lower', description: 'Buys in as the price falls' },
  { id: 'one-sided-upper', title: 'One-sided upper', description: 'Sells out as the price rises' },
]

function strategyValue(id: PriceStrategyId, tickSpacing: number) {
  switch (id) {
    case 'stable':
      return stablePercentLabel(tickSpacing)
    case 'wide':
      return '−50% to +100%'
    case 'one-sided-lower':
      return '−50% to 0%'
    case 'one-sided-upper':
      return '0% to +100%'
  }
}

function PriceStrategies({ tickSpacing, selected, onSelect, className }: PriceStrategiesProps) {
  return (
    <div data-slot="price-strategies" className={cn('flex flex-col gap-uni-12 bg-surface2 p-uni-16', className)}>
      <span className="text-body3 text-neutral2">Price strategies</span>
      <div
        role="radiogroup"
        aria-label="Price strategies"
        className="grid grid-cols-2 gap-uni-8 @max-[440px]/range:grid-cols-1"
      >
        {STRATEGIES.map((strategy) => {
          const isSelected = selected === strategy.id
          return (
            <button
              key={strategy.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-strategy={strategy.id}
              onClick={() => onSelect?.(strategy.id)}
              className={cn(
                'flex min-w-0 flex-col gap-uni-2 rounded-uni-12 border px-uni-12 py-uni-12 text-left outline-none',
                'transition-[background-color,border-color,scale] duration-100 ease-out',
                'active:scale-[0.98] focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
                isSelected
                  ? 'border-transparent bg-surface3'
                  : 'border-surface3 bg-surface1 hover:bg-surface1Hovered',
                onSelect ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span className="flex items-center justify-between gap-uni-8">
                <span className="flex min-w-0 items-center gap-uni-4 text-buttonLabel3 text-neutral1">
                  <span className="truncate">{strategy.title}</span>
                  {isSelected && <Check aria-hidden className="size-uni-16 shrink-0 text-accent1" />}
                </span>
                <span className="shrink-0 text-body3 whitespace-nowrap text-neutral1 tabular-nums">
                  {strategyValue(strategy.id, tickSpacing)}
                </span>
              </span>
              <span className="truncate text-body4 text-neutral2">{strategy.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { PriceStrategies }
export type { PriceStrategiesProps }
