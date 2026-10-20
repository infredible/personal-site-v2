import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Token } from '../types'

/** Round token logo (Uniswap's CurrencyLogo without the network badge: everything here is mainnet). */
export function TokenLogo({
  token,
  size,
  shape = 'circle',
  className,
}: {
  token: Pick<Token, 'logo' | 'symbol'>
  size: number
  /** Uniswap's NetworkLogo uses a rounded square */
  shape?: 'circle' | 'square'
  className?: string
}) {
  return (
    <Image
      src={token.logo}
      alt={token.symbol}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn('shrink-0 select-none', shape === 'circle' ? 'rounded-uni-full' : 'rounded-uni-4', className)}
      style={{ width: size, height: size }}
    />
  )
}
