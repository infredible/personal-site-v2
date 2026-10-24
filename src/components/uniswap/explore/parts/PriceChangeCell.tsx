import { cn } from '@/lib/utils'
import { DeltaTriangle } from '../../chart/TokenPriceSparkline'
import { directionOf } from '../../chart/sparkline'
import { formatPercent } from '../format'

/*
 * 1H / 1D change, as production's DeltaArrow + TableText: the absolute value
 * in neutral1 and a 16px arrow carrying the direction (statusSuccess up,
 * statusCritical down, neutral3 up arrow when it rounds to zero). The arrow's
 * label ("up" / "down") gives screen readers the sign.
 */
export function PriceChangeCell({ change, className }: { change: number; className?: string }) {
  if (!Number.isFinite(change)) return <span className={className}>-</span>
  const direction = directionOf(change)
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-uni-4', className)}>
      <DeltaTriangle
        direction={direction}
        className={
          direction === 'up' ? 'text-statusSuccess' : direction === 'down' ? 'text-statusCritical' : 'text-neutral3'
        }
      />
      <span className="truncate">{formatPercent(Math.abs(change))}</span>
    </span>
  )
}
