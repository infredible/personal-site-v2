import { cn } from '@/lib/utils'
import { SegmentedControl } from '../../SegmentedControl'

/*
 * Heading, mode switch and description of the range step (Uniswap's
 * SelectPriceRangeStep header): "Set price range" in subheading1, a
 * full-width large SegmentedControl, and a body3 neutral2 sentence that
 * changes with the mode. Gap 20 between the three, like the step's own stack.
 */

const OPTIONS = [
  { value: 'full', label: 'Full range' },
  { value: 'custom', label: 'Custom range' },
] as const

export const RANGE_MODE_DESCRIPTIONS = {
  full: 'Providing full range liquidity ensures continuous market participation across all possible prices, offering simplicity but with potential for higher impermanent loss.',
  custom:
    'Custom range allows you to concentrate your liquidity within specific price bounds, enhancing capital efficiency and fee earnings but requiring more active management.',
} as const

interface RangeModeControlProps {
  fullRange: boolean
  onFullRangeChange?: (fullRange: boolean) => void
  className?: string
}

function RangeModeControl({ fullRange, onFullRangeChange, className }: RangeModeControlProps) {
  return (
    <div data-slot="range-mode" className={cn('flex flex-col gap-uni-20', className)}>
      <h3 className="text-subheading1 text-neutral1">Set price range</h3>
      <SegmentedControl
        size="large"
        fullWidth
        aria-label="Range type"
        options={OPTIONS}
        value={fullRange ? 'full' : 'custom'}
        onValueChange={(value) => onFullRangeChange?.(value === 'full')}
      />
      <p className="text-body3 text-neutral2">{RANGE_MODE_DESCRIPTIONS[fullRange ? 'full' : 'custom']}</p>
    </div>
  )
}

export { RangeModeControl }
export type { RangeModeControlProps }
