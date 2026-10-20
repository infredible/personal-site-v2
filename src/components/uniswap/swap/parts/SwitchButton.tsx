'use client'

import * as React from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * The direction toggle between the Sell and Buy panels. Ported from Uniswap's
 * SwitchCurrenciesButton + SwapArrowButton
 * (packages/uniswap/src/features/transactions/swap/{form/SwapFormScreen/SwitchCurrenciesButton,components/SwapArrowButton}.tsx):
 * surface2 fill, a 4px surface1 border that "cuts" the button out of both panels,
 * rounded16, 8px padding around a 24px stroke-2 arrow (48px overall). Hover →
 * surface2Hovered, press scales to 0.98. Each switch spins the arrow one full
 * turn, so it always settles pointing down (Sell → Buy).
 *
 * Render it between the panels inside a zero-height row (see SwitchButtonSeam)
 * so it overlaps the seam without taking layout space.
 */

interface SwitchButtonProps {
  onClick?: () => void
  disabled?: boolean
  /** Forces the hover fill (for static state displays) */
  hovered?: boolean
  className?: string
}

function SwitchButton({ onClick, disabled = false, hovered = false, className }: SwitchButtonProps) {
  const [turns, setTurns] = React.useState(0)
  const interactive = Boolean(onClick) && !disabled

  return (
    <button
      type="button"
      aria-label="Switch tokens"
      data-slot="switch-button"
      disabled={disabled}
      tabIndex={onClick ? undefined : -1}
      onClick={() => {
        if (!interactive) return
        setTurns((t) => t + 1)
        onClick?.()
      }}
      className={cn(
        'flex w-fit shrink-0 items-center justify-center rounded-uni-16 border-4 border-surface1 bg-surface2 p-uni-8 text-neutral1 outline-none',
        'transition-[transform,translate,scale,rotate,background-color] duration-100 ease-[cubic-bezier(0.17,0.67,0.45,1)]',
        'focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-neutral3Hovered',
        interactive ? 'cursor-pointer hover:bg-surface2Hovered active:scale-[0.98]' : 'cursor-default',
        hovered && 'bg-surface2Hovered',
        disabled && 'opacity-50',
        className,
      )}
    >
      <ArrowDown
        aria-hidden
        strokeWidth={2}
        className="size-uni-24 transition-transform duration-300 ease-[cubic-bezier(0.17,0.67,0.45,1)]"
        style={{ transform: `rotate(${turns * 360}deg)` }}
      />
    </button>
  )
}

/** Zero-height row that centers the switch button on the seam between two panels. */
function SwitchButtonSeam({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex h-0 items-center justify-center">
      <div className="absolute">{children}</div>
    </div>
  )
}

export { SwitchButton, SwitchButtonSeam }
export type { SwitchButtonProps }
