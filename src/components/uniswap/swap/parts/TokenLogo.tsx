import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ChainLogo } from '../overlays/NetworkMenu'
import type { Chain, Token } from '../types'

/**
 * Round token logo (Uniswap's CurrencyLogo). The swap form is mainnet-only and
 * leaves out the network badge; pass `chain` to show it, as the Explore tables
 * do: a chain logo at 40% of the size, bottom-right (bottom -2, right -3), with
 * a 1.5px surface1 cutout ring (NetworkLogoBadge).
 */
export function TokenLogo({
  token,
  size,
  shape = 'circle',
  chain,
  className,
}: {
  token: Pick<Token, 'logo' | 'symbol'>
  size: number
  /** Uniswap's NetworkLogo uses a rounded square */
  shape?: 'circle' | 'square'
  /** Network badge (Uniswap's STATUS_RATIO: 0.4 of the logo) */
  chain?: Chain
  className?: string
}) {
  const image = (
    <Image
      src={token.logo}
      alt={token.symbol}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn('shrink-0 select-none', shape === 'circle' ? 'rounded-uni-full' : 'rounded-uni-4', !chain && className)}
      style={{ width: size, height: size }}
    />
  )
  if (!chain) return image
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {image}
      <ChainLogo
        chain={chain}
        size={Math.round(size * 0.4)}
        className="absolute -right-[3px] -bottom-[2px] ring-[1.5px] ring-surface1"
      />
    </span>
  )
}
