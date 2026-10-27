'use client'

import * as React from 'react'
import { Check, ChevronDown, Gas } from '../../icons'
import { cn } from '@/lib/utils'
import { UniMenu, UniMenuContent, UniMenuItem, UniMenuTrigger } from '../../UniMenu'
import { UniTooltip } from '../../UniTooltip'
import { LIMIT_EXPIRIES, expiryLabel } from '../limit'
import type { LimitExpiry } from '../types'

/*
 * The row under the limit button, in the place of the swap's rate · gas
 * footer. Uniswap gives expiry its own row of four buttons above the CTA and
 * a disclaimer block below it; expiry is a set-once choice with a sound
 * default, so here it's a menu in the footer sentence, beside the one fact
 * worth knowing about cost: placing a limit is a signature, so there's no gas.
 */

const NO_GAS_TOOLTIP =
  'Placing a limit is a signature, not a transaction. Fillers pay the network cost when your order fills.'

interface LimitFooterProps {
  expiry: LimitExpiry
  onExpiryChange?: (expiry: LimitExpiry) => void
  className?: string
}

function LimitFooter({ expiry, onExpiryChange, className }: LimitFooterProps) {
  const trigger = (
    <button
      type="button"
      data-slot="limit-expiry"
      tabIndex={onExpiryChange ? undefined : -1}
      className={cn(
        'group/expiry -my-uni-2 flex items-center gap-uni-2 rounded-uni-8 px-uni-4 py-uni-2 text-body3 text-neutral1 outline-none',
        'transition-colors duration-100 focus-visible:bg-surface2 data-[state=open]:bg-surface2',
        onExpiryChange ? 'cursor-pointer hover:bg-surface2' : 'cursor-default',
      )}
    >
      {expiryLabel(expiry)}
      <ChevronDown aria-hidden className="size-uni-16 text-neutral2" />
    </button>
  )

  return (
    <div data-slot="limit-footer" className={cn('min-h-uni-40 pt-uni-12', className)}>
      <div className="flex items-center justify-between gap-uni-8 px-uni-8 py-uni-4">
        <span className="flex items-center gap-uni-2 text-body3 text-neutral2">
          <span className="select-none">Expires in</span>
          {onExpiryChange ? (
            <UniMenu>
              <UniMenuTrigger asChild>{trigger}</UniMenuTrigger>
              <UniMenuContent align="start" className="min-w-[160px]">
                {LIMIT_EXPIRIES.map((option) => (
                  <UniMenuItem key={option.value} onSelect={() => onExpiryChange(option.value)}>
                    <span className="flex-1">{option.label}</span>
                    {option.value === expiry && (
                      <>
                        <Check className="text-neutral1" />
                        <span className="sr-only">(selected)</span>
                      </>
                    )}
                  </UniMenuItem>
                ))}
              </UniMenuContent>
            </UniMenu>
          ) : (
            trigger
          )}
        </span>
        <UniTooltip content={NO_GAS_TOOLTIP}>
          <span className="flex cursor-default items-center gap-uni-4 text-body3 text-neutral2 select-none">
            <Gas aria-hidden className="size-uni-16" />
            No network cost
          </span>
        </UniTooltip>
      </div>
    </div>
  )
}

export { LimitFooter }
export type { LimitFooterProps }
