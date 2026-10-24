import { cn } from '@/lib/utils'
import { SegmentedControl } from '../../SegmentedControl'
import { formatUsd } from '../../swap/format'
import { TokenLogo } from '../../swap/parts/TokenLogo'
import type { Token } from '../../swap/types'
import { formatRangePrice } from '../ticks'
import type { Pool } from '../types'

/*
 * Top of the chart card (D3LiquidityChartHeader + DisplayCurrentPrice):
 * "Current price" in body3 neutral2 over "3,412.55 USDC = 1 ETH" in
 * subheading1, with the fiat value of 1 base in neutral2. On the right, the
 * token toggle: a small SegmentedControl of the pool's two tokens, 16px logo +
 * symbol each. The highlighted token is the BASE (the "1 ETH" side), so
 * picking USDC flips the price to ETH per USDC. Stacks in narrow containers.
 */

interface RangeChartHeaderProps {
  pool: Pool
  inverted: boolean
  /** Displayed price of the pool: quote per base */
  price: number
  base: Token
  quote: Token
  onInvertedChange?: (inverted: boolean) => void
  className?: string
}

function TokenOption({ token }: { token: Token }) {
  return (
    <span className="flex items-center gap-uni-6 text-buttonLabel3">
      <TokenLogo token={token} size={16} />
      {token.symbol}
    </span>
  )
}

function RangeChartHeader({ pool, inverted, price, base, quote, onInvertedChange, className }: RangeChartHeaderProps) {
  const options = [
    { value: 'token0', label: <TokenOption token={pool.token0} /> },
    { value: 'token1', label: <TokenOption token={pool.token1} /> },
  ] as const

  return (
    <div
      data-slot="range-chart-header"
      className={cn(
        'flex items-center justify-between gap-uni-12 p-uni-16',
        '@max-[440px]/range:flex-col @max-[440px]/range:items-start @max-[440px]/range:gap-uni-8',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col">
        <span className="text-body3 text-neutral2">Current price</span>
        <span className="text-subheading1 text-neutral1">
          {formatRangePrice(price)} {quote.symbol} = 1 {base.symbol}{' '}
          <span className="text-neutral2">({formatUsd(base.priceUsd)})</span>
        </span>
      </div>
      <SegmentedControl
        size="small"
        aria-label="Price denomination"
        options={options}
        value={inverted ? 'token1' : 'token0'}
        onValueChange={(value) => onInvertedChange?.(value === 'token1')}
      />
    </div>
  )
}

export { RangeChartHeader }
export type { RangeChartHeaderProps }
