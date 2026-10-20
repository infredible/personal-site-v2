import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Token } from '../types'
import { TokenLogo } from './TokenLogo'

/*
 * Uniswap's SelectTokenButton (packages/uniswap/src/components/CurrencyInputPanel/SelectTokenButton.tsx).
 * A 36px-tall full-round pill with a 1px surface3Solid border: surface1 with the
 * token's 28px logo + symbol, or the branded accent1 "Select token" pill when empty.
 * Press scales to 0.98.
 */

interface TokenSelectButtonProps {
  token?: Token
  onClick?: () => void
  /** Hides the chevron (Uniswap's compact variant on mobile web / native) */
  compact?: boolean
  className?: string
}

function TokenSelectButton({ token, onClick, compact = false, className }: TokenSelectButtonProps) {
  const interactive = Boolean(onClick)
  const Comp = interactive ? 'button' : 'span'

  return (
    <Comp
      {...(interactive && {
        type: 'button' as const,
        onClick: (event: React.MouseEvent) => {
          // The panel focuses its input on click; the button opens the selector instead
          event.stopPropagation()
          onClick?.()
        },
      })}
      aria-label={token ? `${token.symbol}, change token` : 'Select token'}
      data-slot="token-select-button"
      className={cn(
        'inline-flex h-uni-36 w-fit shrink-0 items-center gap-uni-6 rounded-uni-full border border-surface3Solid px-uni-12',
        'shadow-[0_0_10px_rgba(19,19,19,0.04)] select-none outline-none',
        'transition-[transform,translate,scale,rotate,background-color] duration-100 ease-[cubic-bezier(0.17,0.67,0.45,1)]',
        'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral3Hovered',
        token ? 'bg-surface1 text-neutral1' : 'bg-accent1 text-white',
        interactive && 'cursor-pointer active:scale-[0.98]',
        interactive && (token ? 'hover:bg-surface1Hovered' : 'hover:bg-accent1Hovered'),
        className,
      )}
    >
      {token && <TokenLogo token={token} size={28} className="-ml-uni-8" />}
      <span className="text-buttonLabel2 whitespace-nowrap">{token ? token.symbol : 'Select token'}</span>
      {!compact && (
        <ChevronDown
          aria-hidden
          strokeWidth={2.25}
          className={cn('-mx-uni-2 size-uni-24', token ? 'text-neutral2' : 'text-white')}
        />
      )}
    </Comp>
  )
}

export { TokenSelectButton }
export type { TokenSelectButtonProps }
