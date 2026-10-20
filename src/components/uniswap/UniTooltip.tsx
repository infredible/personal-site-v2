'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'
import { uniswapScopeClassName } from './UniswapScope'

/** Uniswap's tooltip: a small surface1 card, no arrow. */
function UniTooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: React.ReactNode
  /** The trigger; must accept a ref (rendered via asChild). */
  children: React.ReactNode
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>['side']
  className?: string
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            className={cn(
              uniswapScopeClassName,
              'z-50 max-w-[280px] rounded-uni-12 border border-surface3 bg-surface1 px-uni-12 py-uni-8',
              'text-body4 text-neutral1 shadow-uni-medium',
              'animate-in fade-in-0 zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export { UniTooltip }
