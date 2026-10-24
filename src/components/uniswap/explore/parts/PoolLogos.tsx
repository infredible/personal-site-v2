import { cn } from '@/lib/utils'
import { ChainLogo } from '../../swap/overlays/NetworkMenu'
import { TokenLogo } from '../../swap/parts/TokenLogo'
import type { Chain, Token } from '../../swap/types'

/*
 * Production's DoubleCurrencyLogo in its default 'split' orientation
 * (SplitLogo): one circle, the left half from token0 and the right half from
 * token1, 1px apart, with the network badge bottom-right (-4, -4) at 40% of
 * the size. Decorative: the pair is named next to it.
 */
export function PoolLogos({
  token0,
  token1,
  chain,
  size = 32,
  className,
}: {
  token0: Token
  token1: Token
  chain?: Chain
  size?: number
  className?: string
}) {
  const half = size / 2 - 1
  return (
    <span aria-hidden className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      <span className="absolute top-0 left-0 overflow-hidden" style={{ width: half, height: size }}>
        <TokenLogo token={token0} size={size} className="max-w-none" />
      </span>
      <span className="absolute top-0 right-0 flex flex-row-reverse overflow-hidden" style={{ width: half, height: size }}>
        <TokenLogo token={token1} size={size} className="max-w-none" />
      </span>
      {chain && (
        <ChainLogo
          chain={chain}
          size={Math.round(size * 0.4)}
          className="absolute -right-uni-4 -bottom-uni-4 ring-[1.5px] ring-surface1"
        />
      )}
    </span>
  )
}
