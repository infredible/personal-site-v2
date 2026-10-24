import { cn } from '@/lib/utils'
import { ChevronDown, LineChartDots } from '../../icons'

/*
 * The disclosure that reveals the liquidity chart. Not in Uniswap: there the
 * chart is always open, which puts a dense, drag-heavy instrument in front of
 * everyone. Here strategies and the min/max inputs cover the common path, and
 * the chart is the advanced view:
 *
 *   [~] Advanced                                      Show chart ⌄
 *       Liquidity chart, drag to set the range
 *
 * A full-width row at the foot of the current-price card, so it reads as part
 * of that card; the chart then opens beneath it. Narrow containers keep only
 * the chevron, so the subtitle gets the room. aria-expanded / -controls
 * tie it to the region it opens.
 */

interface AdvancedToggleProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  /** id of the region it opens */
  controls?: string
  className?: string
}

function AdvancedToggle({ open, onOpenChange, controls, className }: AdvancedToggleProps) {
  return (
    <button
      type="button"
      data-slot="advanced-toggle"
      aria-expanded={open}
      aria-controls={controls}
      onClick={() => onOpenChange?.(!open)}
      className={cn(
        'group/advanced flex w-full cursor-pointer items-center gap-uni-12 border-t border-surface3 px-uni-16 py-uni-12 text-left outline-none',
        'transition-colors duration-100 hover:bg-surface2Hovered focus-visible:bg-surface2Hovered',
        className,
      )}
    >
      <span className="flex size-uni-32 shrink-0 items-center justify-center rounded-uni-full bg-surface3 text-neutral2">
        <LineChartDots aria-hidden className="size-uni-16" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-buttonLabel3 text-neutral1">Advanced</span>
        <span className="truncate text-body4 text-neutral2">Liquidity chart, drag to set the range</span>
      </span>
      <span className="flex shrink-0 items-center gap-uni-4 text-buttonLabel4 text-neutral2 group-hover/advanced:text-neutral1">
        <span className="@max-[440px]/range:sr-only">{open ? 'Hide chart' : 'Show chart'}</span>
        {/* ChevronDown is itself a rotation, so the flip goes on a wrapper */}
        <span className={cn('flex transition-transform duration-200', open && 'rotate-180')}>
          <ChevronDown aria-hidden className="size-uni-16" />
        </span>
      </span>
    </button>
  )
}

export { AdvancedToggle }
export type { AdvancedToggleProps }
