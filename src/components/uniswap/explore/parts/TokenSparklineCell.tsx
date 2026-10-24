import { cn } from '@/lib/utils'
import { isStablecoin, getMockPriceHistory } from '../../chart/mockPriceHistory'
import { VIEW_H, VIEW_W, linePath, toViewY } from '../../chart/sparkline'
import type { Token } from '../../swap/types'

/*
 * The "1D chart" cell: production's SparklineChart, 80 × 20, a 1.5px line with
 * no fill, axes or hover, green unless the 1D change is negative. Draws the
 * same mock 1D series as the token sparkline showcase (getMockPriceHistory),
 * with its calmer stablecoin range, as a monotone spline (production: d3
 * curveCardinal) in a stretched viewBox.
 */

const paths = new Map<string, string>()

function pathFor(token: Token) {
  let d = paths.get(token.symbol)
  if (!d) {
    d = linePath(toViewY(getMockPriceHistory(token, '1D'), { stablecoin: isStablecoin(token) }))
    paths.set(token.symbol, d)
  }
  return d
}

export function TokenSparklineCell({ token, change, className }: { token: Token; change: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn('h-[20px] w-[80px] shrink-0', change < 0 ? 'text-statusCritical' : 'text-statusSuccess', className)}
    >
      <path
        d={pathFor(token)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
