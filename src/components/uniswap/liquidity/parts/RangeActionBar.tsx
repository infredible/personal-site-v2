import { Expand, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '../../SegmentedControl'
import { UniButton } from '../../UniButton'
import { UniTooltip } from '../../UniTooltip'
import { RANGE_PERIODS } from '../pools'
import type { RangePeriod } from '../types'

/*
 * Under the chart (LiquidityRangeActionButtons): the time-period
 * SegmentedControl (1D 1W 1M 1Y All time; the long names are tooltips), then a
 * zoom cluster of three joined icon buttons in one pill (zoom out / expand to
 * fit the range / zoom in; 1px surface3 borders, the middle one has none at
 * the sides) and a tertiary xsmall Reset. Expand is disabled in full range.
 * Stacks in narrow containers.
 */

interface RangeActionBarProps {
  period: RangePeriod
  onPeriodChange?: (period: RangePeriod) => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onExpand?: () => void
  onReset?: () => void
  /** Expand re-centers on the range, which full range doesn't have */
  expandDisabled?: boolean
  className?: string
}

const zoomButton =
  'flex items-center justify-center border border-surface3 bg-transparent p-uni-8 text-neutral1 outline-none ' +
  'transition-[opacity,background-color] duration-100 enabled:cursor-pointer enabled:hover:opacity-80 enabled:active:bg-surface3 ' +
  'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-neutral3Hovered ' +
  'disabled:cursor-default disabled:text-neutral3 [&_svg]:size-uni-16'

function ZoomCluster({
  onZoomIn,
  onZoomOut,
  onExpand,
  expandDisabled,
}: Pick<RangeActionBarProps, 'onZoomIn' | 'onZoomOut' | 'onExpand' | 'expandDisabled'>) {
  return (
    <div role="group" aria-label="Zoom" className="flex">
      <UniTooltip content="Zoom out">
        <button type="button" aria-label="Zoom out" onClick={onZoomOut} className={cn(zoomButton, 'rounded-l-uni-full')}>
          <ZoomOut aria-hidden />
        </button>
      </UniTooltip>
      <UniTooltip content="Fit to range">
        <button
          type="button"
          aria-label="Fit to range"
          disabled={expandDisabled}
          onClick={onExpand}
          className={cn(zoomButton, 'border-x-0')}
        >
          <Expand aria-hidden />
        </button>
      </UniTooltip>
      <UniTooltip content="Zoom in">
        <button type="button" aria-label="Zoom in" onClick={onZoomIn} className={cn(zoomButton, 'rounded-r-uni-full')}>
          <ZoomIn aria-hidden />
        </button>
      </UniTooltip>
    </div>
  )
}

function RangeActionBar({
  period,
  onPeriodChange,
  onZoomIn,
  onZoomOut,
  onExpand,
  onReset,
  expandDisabled,
  className,
}: RangeActionBarProps) {
  return (
    <div
      data-slot="range-action-bar"
      className={cn(
        'flex items-center justify-between gap-uni-12 p-uni-16',
        '@max-[440px]/range:flex-col @max-[440px]/range:items-stretch @max-[440px]/range:gap-uni-8',
        className,
      )}
    >
      <SegmentedControl
        aria-label="Price history period"
        options={RANGE_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
        value={period}
        onValueChange={(value) => onPeriodChange?.(value)}
        className="@max-[440px]/range:w-full"
      />
      <div className="flex grow items-center justify-between gap-uni-12">
        <ZoomCluster onZoomIn={onZoomIn} onZoomOut={onZoomOut} onExpand={onExpand} expandDisabled={expandDisabled} />
        <UniButton size="xsmall" emphasis="tertiary" onClick={onReset}>
          Reset
        </UniButton>
      </div>
    </div>
  )
}

export { RangeActionBar }
export type { RangeActionBarProps }
