import { cn } from '@/lib/utils'
import { formatUsd } from '../../swap/format'
import { ChevronsOut, Gas } from '../../icons'
import { TextSkeleton } from '../../Skeleton'
import type { QuoteStatus } from '../types'

/*
 * "Network cost" under the keypad. Uniswap's loading rule: the first fetch
 * shows a skeleton the size of the value; a refetch (every keypress) keeps
 * the last value on screen and pulses it. No amount, no cost: a dash.
 */
export function NetworkCostRow({
  status,
  usd,
  hasAmount,
  className,
}: {
  status: QuoteStatus
  usd?: number
  hasAmount: boolean
  className?: string
}) {
  const loading = status === 'loading'
  return (
    <div data-slot="buy-network-cost" className={cn('flex items-center justify-between px-uni-12 py-uni-12', className)}>
      <span className="flex items-center gap-uni-4 text-body4 text-neutral2">
        <Gas className="size-uni-16" />
        Network cost
      </span>
      <span className="flex items-center gap-uni-4 text-body4 text-neutral2 tabular-nums">
        {!hasAmount ? (
          <span>-</span>
        ) : usd === undefined ? (
          loading ? <TextSkeleton placeholder="$0.00" shimmer className="text-body4" /> : <span>-</span>
        ) : (
          <span className={cn(loading && 'animate-pulse')} aria-busy={loading || undefined}>
            {formatUsd(usd)}
          </span>
        )}
        <ChevronsOut className="size-uni-16" />
      </span>
    </div>
  )
}
