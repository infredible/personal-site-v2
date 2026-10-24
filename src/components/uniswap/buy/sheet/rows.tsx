import { cn } from '@/lib/utils'
import { formatPercent, formatTokenAmount, formatUsd } from '../../swap/format'
import { TokenLogo } from '../../swap/parts/TokenLogo'
import type { Token } from '../../swap/types'
import { MethodIcon, ProviderLogo } from '../parts/logos'
import type { PaymentMethod, Provider } from '../types'

/*
 * The sheet's building blocks: method chips, provider rows, token rows and
 * tiles, and section headings. Display only; BuyWithPanel lays them out.
 */

const rowButton =
  'flex w-full cursor-pointer items-center justify-between gap-uni-8 rounded-uni-16 p-uni-8 text-left outline-none transition-colors duration-100 hover:bg-surface2 focus-visible:bg-surface2 aria-[current=true]:bg-surface2'

export function SectionHeading({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-uni-4 p-uni-8 text-subheading2 text-neutral1 [&_svg]:size-uni-18 [&_svg]:shrink-0">
      {icon}
      {children}
    </h3>
  )
}

/** One payment method chip: inverted when it's the one in view */
export function MethodChip({
  method,
  selected,
  onClick,
  tabIndex,
  onKeyDown,
}: {
  method: PaymentMethod
  selected: boolean
  onClick?: () => void
  tabIndex?: number
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-method={method.id}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'flex h-uni-32 shrink-0 cursor-pointer items-center justify-center gap-uni-4 rounded-uni-full border py-uni-6 pr-uni-20 pl-uni-16 text-buttonLabel3 whitespace-nowrap outline-none select-none',
        'transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97]',
        'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral3',
        selected ? 'border-neutral1 bg-neutral1 text-surface1' : 'border-surface3 bg-surface1 text-neutral1 hover:bg-surface1Hovered',
      )}
    >
      <MethodIcon method={method.id} />
      {method.label}
    </button>
  )
}

export function ProviderRow({
  provider,
  worse,
  usd,
  selected = false,
  onClick,
}: {
  provider: Provider
  /** Fraction worse than the cheapest in the list; 0 marks the lowest price */
  worse: number
  /** Amount being bought, in USD; 0 shows the provider's limit instead of a cost */
  usd: number
  selected?: boolean
  onClick?: () => void
}) {
  const cost = usd * (1 + provider.markup)
  const overLimit = usd > 0 && cost > provider.limitUsd + 0.005
  return (
    <button type="button" aria-current={selected || undefined} tabIndex={onClick ? undefined : -1} onClick={onClick} className={rowButton}>
      <span className="flex min-w-0 items-center gap-uni-8">
        <ProviderLogo provider={provider} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body2 text-neutral1">{provider.name}</span>
          {worse < 0.0005 ? (
            <span className="text-body3 text-accent1">Lowest price</span>
          ) : (
            <span className="text-body3 text-neutral2">≈ {formatPercent(worse, 1)} worse</span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end tabular-nums">
        <span className="text-body2 text-neutral1">
          {usd > 0 ? formatUsd(cost) : `$${provider.limitUsd.toLocaleString('en-US')}`}
        </span>
        <span className={cn('text-body3', overLimit ? 'text-statusCritical' : 'text-neutral2')}>
          {usd > 0 ? (overLimit ? `Over $${provider.limitUsd.toLocaleString('en-US')} limit` : 'You pay') : 'Limit'}
        </span>
      </span>
    </button>
  )
}

export function TokenRow({
  token,
  balance,
  selected = false,
  onClick,
}: {
  token: Token
  /** Held amount: shows its value and the amount on the right */
  balance?: number
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button type="button" aria-current={selected || undefined} tabIndex={onClick ? undefined : -1} onClick={onClick} className={rowButton}>
      <span className="flex min-w-0 items-center gap-uni-8">
        <TokenLogo token={token} size={36} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body2 text-neutral1">{token.name}</span>
          <span className="text-body3 text-neutral2">{token.symbol}</span>
        </span>
      </span>
      {balance !== undefined && (
        <span className="flex shrink-0 flex-col items-end tabular-nums">
          <span className="text-body2 text-neutral1">{formatUsd(balance * token.priceUsd)}</span>
          <span className="text-body3 text-neutral2">{formatTokenAmount(balance)}</span>
        </span>
      )}
    </button>
  )
}

export function TokenTile({ token, selected = false, onClick }: { token: Token; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-current={selected || undefined}
      aria-label={token.name}
      tabIndex={onClick ? undefined : -1}
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer flex-col items-center gap-uni-8 rounded-uni-16 py-uni-8 outline-none',
        'transition-[background-color,scale] duration-100 ease-out active:scale-[0.97] focus-visible:outline-1 focus-visible:outline-neutral3',
        selected ? 'bg-surface3' : 'bg-surface2 hover:bg-surface2Hovered',
      )}
    >
      <TokenLogo token={token} size={32} />
      <span className="text-buttonLabel4 text-neutral1">{token.symbol}</span>
    </button>
  )
}
