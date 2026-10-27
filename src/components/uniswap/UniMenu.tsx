'use client'

import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { uniswapScopeClassName } from './UniswapScope'

/*
 * Uniswap's overflow menu (the "…" on token pages): the stock shadcn dropdown
 * restyled as a small surface1 card with 16px radius and 12px-radius rows.
 * Content renders in a portal, so it carries the token scope itself.
 */

const UniMenu = DropdownMenu
const UniMenuTrigger = DropdownMenuTrigger

function UniMenuContent({ className, align = 'end', sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      align={align}
      sideOffset={sideOffset}
      className={cn(
        uniswapScopeClassName,
        'min-w-[200px] rounded-uni-16 border-surface3 bg-surface1 p-uni-4 text-neutral1 shadow-uni-medium',
        // Quick, strong ease-out; scales from the trigger
        'duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=open]:zoom-in-[0.97] data-[state=closed]:zoom-out-[0.97]',
        className,
      )}
      {...props}
    />
  )
}

function UniMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      className={cn(
        'cursor-pointer gap-uni-8 rounded-uni-12 px-uni-8 py-uni-8 text-body3 text-neutral1',
        'focus:bg-surface2 focus:text-neutral1 [&_svg]:size-uni-16 [&_svg:not([class*=text-])]:text-neutral2',
        className,
      )}
      {...props}
    />
  )
}

function UniMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return <DropdownMenuSeparator className={cn('-mx-uni-4 my-uni-4 bg-surface3', className)} {...props} />
}

export { UniMenu, UniMenuTrigger, UniMenuContent, UniMenuItem, UniMenuSeparator }
