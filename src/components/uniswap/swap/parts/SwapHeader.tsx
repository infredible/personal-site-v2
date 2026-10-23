'use client'

import * as React from 'react'
import { Settings } from '../../icons'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '../../SegmentedControl'
import { UniTooltip } from '../../UniTooltip'
import { formatPercent } from '../format'
import type { SwapMode } from '../types'

/*
 * Swap page header row. Ported from Uniswap web's SwapHeaderTabRow
 * (apps/web/src/pages/Swap/SwapHeaderTabRow.tsx): a large, non-outlined
 * SegmentedControl of Swap / Limit / Buy / Sell, and on the Swap tab the
 * settings gear (TransactionSettingsButton + TransactionSettingsButtonWithSlippage
 * in packages/uniswap/src/features/transactions/components/settings/).
 *
 * The gear is 20px neutral2 in a 32px-tall round frame and turns 90° on hover
 * (80ms ease-out). With a custom slippage it becomes a pill: "1%" (buttonLabel3)
 * + gear, tinted surface3 when at or under auto, statusWarning2/statusWarning
 * above auto, and statusCritical2/statusCritical at 20%+.
 */

const MODE_OPTIONS = [
  { value: 'swap', label: 'Swap' },
  { value: 'limit', label: 'Limit' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
] as const satisfies readonly { value: SwapMode; label: string }[]

/** Uniswap's SLIPPAGE_CRITICAL_TOLERANCE (20%), as a fraction */
export const SLIPPAGE_CRITICAL = 0.2

type SlippageTone = 'neutral' | 'warning' | 'critical'

export function getSlippageTone(customSlippage: number, autoSlippage: number): SlippageTone {
  if (customSlippage >= SLIPPAGE_CRITICAL) return 'critical'
  if (customSlippage > autoSlippage) return 'warning'
  return 'neutral'
}

interface SwapSettingsButtonProps {
  /** Fraction. Set when the user picked a custom max slippage; shows the badge. */
  customSlippage?: number
  /** Fraction the custom value is compared against (Uniswap's auto slippage). */
  autoSlippage?: number
  onClick?: () => void
  /** Forces the hover appearance (for static state displays) */
  hovered?: boolean
  className?: string
}

function SwapSettingsButton({
  customSlippage,
  autoSlippage = 0.005,
  onClick,
  hovered = false,
  className,
}: SwapSettingsButtonProps) {
  const hasCustom = customSlippage !== undefined && customSlippage > 0
  const tone = hasCustom ? getSlippageTone(customSlippage, autoSlippage) : 'neutral'

  const button = (
    <button
      type="button"
      aria-label={hasCustom ? `Settings, max slippage ${formatPercent(customSlippage, 4)}` : 'Settings'}
      data-slot="swap-settings-button"
      onClick={onClick}
      tabIndex={onClick ? undefined : -1}
      className={cn(
        'group/gear flex h-uni-32 w-fit shrink-0 items-center justify-center gap-uni-4 rounded-uni-full py-uni-4 outline-none',
        'focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
        onClick ? 'cursor-pointer' : 'cursor-default',
        hasCustom ? 'px-uni-8' : 'px-uni-4',
        hasCustom && tone === 'neutral' && 'bg-surface3 text-neutral2',
        hasCustom && tone === 'warning' && 'bg-statusWarning2 text-statusWarning',
        hasCustom && tone === 'critical' && 'bg-statusCritical2 text-statusCritical',
        !hasCustom && 'text-neutral2',
        className,
      )}
    >
      {hasCustom && <span className="text-buttonLabel3">{formatPercent(customSlippage, 4)}</span>}
      <Settings
        aria-hidden
        className={cn(
          'size-uni-20 transition-[transform,translate,scale,rotate,color] duration-[80ms] ease-out',
          'group-hover/gear:rotate-90',
          tone === 'neutral' && 'group-hover/gear:text-neutral2Hovered',
          hovered && 'rotate-90',
        )}
      />
    </button>
  )

  // Uniswap warns on hover when the custom value is above auto
  if (hasCustom && tone !== 'neutral') {
    return (
      <UniTooltip content="This may result in an unfavorable trade. Try lowering your slippage setting." side="top">
        {button}
      </UniTooltip>
    )
  }
  return button
}

interface SwapHeaderProps {
  mode: SwapMode
  onModeChange?: (mode: SwapMode) => void
  onSettingsClick?: () => void
  /** Fraction; shows the slippage badge on the gear */
  customSlippage?: number
  autoSlippage?: number
  className?: string
}

function SwapHeader({ mode, onModeChange, onSettingsClick, customSlippage, autoSlippage, className }: SwapHeaderProps) {
  return (
    <div data-slot="swap-header" className={cn('flex items-center justify-between', className)}>
      <SegmentedControl
        aria-label="Trade type"
        size="large"
        outlined={false}
        options={MODE_OPTIONS}
        value={mode}
        onValueChange={(next) => onModeChange?.(next)}
        className="max-[450px]:gap-uni-8"
      />
      <div className="flex items-center gap-uni-8">
        {mode === 'swap' && (
          <SwapSettingsButton customSlippage={customSlippage} autoSlippage={autoSlippage} onClick={onSettingsClick} />
        )}
      </div>
    </div>
  )
}

export { SwapHeader, SwapSettingsButton }
export type { SwapHeaderProps, SwapSettingsButtonProps }
