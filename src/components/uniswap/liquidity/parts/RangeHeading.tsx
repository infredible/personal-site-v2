import { cn } from '@/lib/utils'

/*
 * Heading and description of the range step (Uniswap's SelectPriceRangeStep
 * header): "Set price range" in subheading1 over a body3 neutral2 sentence
 * that changes with the mode. Uniswap puts a Full range | Custom range
 * SegmentedControl between the two; here full range and custom are options
 * in PriceStrategies, so the step has one place to choose a range.
 */

export const RANGE_MODE_DESCRIPTIONS = {
  full: 'Providing full range liquidity ensures continuous market participation across all possible prices, offering simplicity but with potential for higher impermanent loss.',
  custom:
    'Custom range allows you to concentrate your liquidity within specific price bounds, enhancing capital efficiency and fee earnings but requiring more active management.',
} as const

interface RangeHeadingProps {
  fullRange: boolean
  className?: string
}

function RangeHeading({ fullRange, className }: RangeHeadingProps) {
  return (
    <div data-slot="range-heading" className={cn('flex flex-col gap-uni-8', className)}>
      <h3 className="text-subheading1 text-neutral1">Set price range</h3>
      <p className="text-body3 text-neutral2">{RANGE_MODE_DESCRIPTIONS[fullRange ? 'full' : 'custom']}</p>
    </div>
  )
}

export { RangeHeading }
export type { RangeHeadingProps }
