import Image from 'next/image'
import { cn } from '@/lib/utils'
import { paymentMethod } from '../data'
import { AppleLogo, Bank, Coin, CreditCard } from '../icons'
import type { PaymentMethodId, Provider } from '../types'

const GLYPHS: Partial<Record<PaymentMethodId, React.ComponentType<React.SVGProps<SVGSVGElement>>>> = {
  tokens: Coin,
  'apple-pay': AppleLogo,
  card: CreditCard,
  ach: Bank,
  swift: Bank,
}

/**
 * A payment method's mark: the brand image (Venmo, PayPal, Revolut) or a
 * glyph in currentColor, so it inverts with a selected chip.
 */
export function MethodIcon({ method, size = 16, className }: { method: PaymentMethodId; size?: number; className?: string }) {
  const { image } = paymentMethod(method)
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        aria-hidden
        width={size}
        height={size}
        unoptimized
        draggable={false}
        className={cn('shrink-0 rounded-uni-4 select-none', className)}
        style={{ width: size, height: size }}
      />
    )
  }
  const Glyph = GLYPHS[method] ?? Coin
  return <Glyph className={cn('shrink-0', className)} style={{ width: size, height: size }} />
}

/** A fiat method in the token-logo slot of the pay card: brand image, or the glyph on a neutral disc */
export function MethodLogo({ method, size }: { method: PaymentMethodId; size: number }) {
  if (paymentMethod(method).image) return <MethodIcon method={method} size={size} className="rounded-uni-full" />
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-uni-full bg-neutral1 text-surface1"
      style={{ width: size, height: size }}
    >
      <MethodIcon method={method} size={Math.round(size * 0.5)} />
    </span>
  )
}

/** An onramp's logo, or its initial on the prototype's monogram color */
export function ProviderLogo({ provider, size = 36 }: { provider: Provider; size?: number }) {
  if (provider.logo) {
    return (
      <Image
        src={provider.logo}
        alt=""
        aria-hidden
        width={size}
        height={size}
        unoptimized
        draggable={false}
        className="shrink-0 rounded-uni-full object-cover select-none"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-uni-full text-buttonLabel3 text-white select-none"
      style={{ width: size, height: size, backgroundColor: provider.color }}
    >
      {provider.name.charAt(0)}
    </span>
  )
}
