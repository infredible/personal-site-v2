import { cn } from '@/lib/utils'
import { stablePercentLabel } from '../ticks'
import type { PriceStrategyId } from '../types'

/*
 * "Price strategies" (DefaultPriceStrategies): four cards on surface2, each
 * with a title, a value and a one-line use case. The selected card sits on
 * surface3; the rest on surface1 with a surface3 border. Only Stable carries
 * a hover hint ("± 3 ticks"). Four columns, two in narrow containers.
 */

interface PriceStrategiesProps {
  tickSpacing: number
  /** The strategy the range came from; null once edited by hand */
  selected: PriceStrategyId | null
  onSelect?: (id: PriceStrategyId) => void
  className?: string
}

const STRATEGIES: { id: PriceStrategyId; title: string; description: string; hint?: string }[] = [
  { id: 'stable', title: 'Stable', description: 'Good for stablecoins or low volatility pairs', hint: '± 3 ticks' },
  { id: 'wide', title: 'Wide', description: 'Good for volatile pairs' },
  { id: 'one-sided-lower', title: 'One-sided lower', description: 'Supply liquidity if price goes down' },
  { id: 'one-sided-upper', title: 'One-sided upper', description: 'Supply liquidity if price goes up' },
]

function strategyValue(id: PriceStrategyId, tickSpacing: number) {
  switch (id) {
    case 'stable':
      return stablePercentLabel(tickSpacing)
    case 'wide':
      return '–50% — +100%'
    case 'one-sided-lower':
      return '–50%'
    case 'one-sided-upper':
      return '+100%'
  }
}

function PriceStrategies({ tickSpacing, selected, onSelect, className }: PriceStrategiesProps) {
  return (
    <div data-slot="price-strategies" className={cn('flex flex-col gap-uni-16 bg-surface2 p-uni-16', className)}>
      <span className="text-body3 text-neutral2">Price strategies</span>
      <div
        role="group"
        aria-label="Price strategies"
        className="grid grid-cols-4 gap-uni-8 @max-[440px]/range:grid-cols-2"
      >
        {STRATEGIES.map((strategy) => {
          const isSelected = selected === strategy.id
          return (
            <button
              key={strategy.id}
              type="button"
              aria-pressed={isSelected}
              data-strategy={strategy.id}
              onClick={() => onSelect?.(strategy.id)}
              className={cn(
                'group/strategy flex min-w-0 flex-col items-start gap-uni-8 rounded-uni-12 border border-surface3 p-uni-12 text-left outline-none',
                '@max-[440px]/range:gap-uni-4 @max-[440px]/range:p-uni-8',
                'transition-[opacity,background-color,transform,translate,scale,rotate] duration-100 ease-out',
                'hover:opacity-80 active:scale-[0.98] focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
                isSelected ? 'bg-surface3' : 'bg-surface1',
                onSelect ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span className="flex w-full flex-wrap items-baseline gap-x-uni-4">
                <span className="text-buttonLabel3 text-neutral2">{strategy.title}</span>
                {strategy.hint && (
                  <span className="text-body4 text-neutral2 opacity-0 transition-opacity duration-100 group-hover/strategy:opacity-100 group-focus-visible/strategy:opacity-100">
                    {strategy.hint}
                  </span>
                )}
              </span>
              <span className="text-body2 text-neutral1">{strategyValue(strategy.id, tickSpacing)}</span>
              <span className="mt-uni-16 text-body4 text-neutral2 @max-[440px]/range:mt-uni-4">{strategy.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { PriceStrategies }
export type { PriceStrategiesProps }
