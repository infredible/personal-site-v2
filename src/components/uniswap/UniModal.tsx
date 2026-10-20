'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { uniswapScopeClassName } from './UniswapScope'

/*
 * Uniswap's modal. Composes the stock shadcn dialog parts (portal, overlay)
 * with its own content surface, which carries the token scope since it
 * renders in a portal outside any <UniswapScope>.
 */

function UniModalContent({
  className,
  children,
  title,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Rendered as the dialog's accessible title in the header row. */
  title: React.ReactNode
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay className="bg-scrim" />
      <DialogPrimitive.Content
        data-slot="uni-modal-content"
        aria-describedby={undefined}
        className={cn(
          uniswapScopeClassName,
          'fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col gap-uni-16',
          'rounded-uni-24 border border-surface3 bg-surface1 p-uni-16 shadow-uni-medium outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] duration-200',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-uni-12">
          <DialogPrimitive.Title className="text-subheading1 text-neutral1">{title}</DialogPrimitive.Title>
          {showCloseButton && (
            <DialogClose className="flex size-uni-28 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 transition-colors hover:bg-surface2 hover:text-neutral1">
              <XIcon className="size-uni-20" />
              <span className="sr-only">Close</span>
            </DialogClose>
          )}
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export { Dialog as UniModal, DialogTrigger as UniModalTrigger, DialogClose as UniModalClose, UniModalContent }
