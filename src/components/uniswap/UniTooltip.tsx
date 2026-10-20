'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'
import { uniswapScopeClassName } from './UniswapScope'
import { UniTooltipProvider, useHasUniTooltipProvider } from './UniTooltipProvider'

/**
 * Uniswap's tooltip: a small surface1 card, no arrow. Scales in from its
 * trigger side (Radix's transform origin), 125ms in / 100ms out; tooltips
 * opened via skip-delay ("instant-open") don't animate at all.
 */
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
  const hasProvider = useHasUniTooltipProvider()
  const tooltip = (
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
            'origin-(--radix-tooltip-content-transform-origin) ease-[cubic-bezier(0.23,1,0.32,1)]',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-[0.97] data-[state=delayed-open]:duration-[125ms]',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100',
            'motion-reduce:data-[state=delayed-open]:zoom-in-100',
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
  return hasProvider ? tooltip : <UniTooltipProvider>{tooltip}</UniTooltipProvider>
}

export { UniTooltip }
