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
function NotAvailable() {
  return (
    <>
      <span aria-hidden>-</span>
      <span className="sr-only">Not available</span>
    </>
  )
}

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
    <div data-slot="buy-network-cost" className={cn('flex items-center justify-between px-uni-12 pt-uni-12 pb-[20px]', className)}>
      <span className="flex items-center gap-uni-4 text-body4 text-neutral2">
        <Gas className="size-uni-16" />
        Network cost
      </span>
      <span className="flex items-center gap-uni-4 text-body4 text-neutral2 tabular-nums">
        {!hasAmount ? (
          <NotAvailable />
        ) : usd === undefined ? (
          loading ? <TextSkeleton placeholder="$0.00" shimmer className="text-body4" /> : <NotAvailable />
        ) : (
          <span className={cn(loading && 'animate-pulse motion-reduce:animate-none')}>
            {formatUsd(usd)}
          </span>
        )}
        <ChevronsOut className="size-uni-16" />
      </span>
    </div>
  )
}
