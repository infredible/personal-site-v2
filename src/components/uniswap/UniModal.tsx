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
 *
 * The visual surface is shared with <ModalSurface>, an inline (non-portal)
 * version of the same card for static previews and canvas frames, so the two
 * can't drift: both use `modalSurfaceClassName` and <SurfaceHeader>.
 */

/** Card styling shared by the dialog content and the inline surface. */
const modalSurfaceClassName =
  'flex w-full max-w-[420px] flex-col gap-uni-16 rounded-uni-24 border border-surface3 bg-surface1 p-uni-16 shadow-uni-medium outline-none'

/** Uniswap's popover card (swap settings under the gear): smaller, no title row. */
const popoverSurfaceClassName =
  'flex w-[320px] max-w-full flex-col rounded-uni-24 border border-surface3 bg-surface1 px-uni-12 py-uni-4 shadow-uni-short outline-none'

const closeButtonClassName =
  'flex size-uni-28 shrink-0 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 outline-none transition-colors hover:bg-surface2 hover:text-neutral1 focus-visible:bg-surface2 focus-visible:text-neutral1'

/** Title + close row. `title` and `close` are pre-built so dialog and inline variants can pass their own elements. */
function SurfaceHeader({ title, close }: { title: React.ReactNode; close?: React.ReactNode }) {
  return (
    <div data-slot="uni-modal-header" className="flex items-center justify-between gap-uni-12">
      {title}
      {close}
    </div>
  )
}

const titleClassName = 'text-subheading1 text-neutral1'

function CloseGlyph() {
  return (
    <>
      <XIcon className="size-uni-20" />
      <span className="sr-only">Close</span>
    </>
  )
}

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
          modalSurfaceClassName,
          'fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] duration-200',
          className,
        )}
        {...props}
      >
        <SurfaceHeader
          title={<DialogPrimitive.Title className={titleClassName}>{title}</DialogPrimitive.Title>}
          close={
            showCloseButton && (
              <DialogClose className={closeButtonClassName}>
                <CloseGlyph />
              </DialogClose>
            )
          }
        />
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

interface ModalSurfaceProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Header title. Omit for panels that draw their own header (e.g. swap review). */
  title?: React.ReactNode
  /** Shows the close button in the header row. */
  onClose?: () => void
  /** Adds the Uniswap token scope, for use outside a <UniswapScope>. */
  scoped?: boolean
}

/**
 * The modal's card, rendered inline (no portal, overlay, or positioning).
 * Looks exactly like <UniModalContent>; use it to place overlay panels in a
 * page or canvas frame. Width defaults to the modal's (full, max 420px).
 */
function ModalSurface({ title, onClose, scoped = false, className, children, ...props }: ModalSurfaceProps) {
  const hasHeader = title !== undefined || onClose !== undefined
  return (
    <div
      data-slot="uni-modal-surface"
      role="dialog"
      aria-label={typeof title === 'string' ? title : undefined}
      className={cn(scoped && uniswapScopeClassName, modalSurfaceClassName, className)}
      {...props}
    >
      {hasHeader && (
        <SurfaceHeader
          title={<h2 className={titleClassName}>{title}</h2>}
          close={
            onClose && (
              <button type="button" onClick={onClose} className={closeButtonClassName}>
                <CloseGlyph />
              </button>
            )
          }
        />
      )}
      {children}
    </div>
  )
}

/** Uniswap's popover card, inline. Default width 320px (the swap settings popover). */
function PopoverSurface({
  scoped = false,
  className,
  ...props
}: React.ComponentProps<'div'> & { scoped?: boolean }) {
  return (
    <div
      data-slot="uni-popover-surface"
      className={cn(scoped && uniswapScopeClassName, popoverSurfaceClassName, className)}
      {...props}
    />
  )
}

export {
  Dialog as UniModal,
  DialogTrigger as UniModalTrigger,
  DialogClose as UniModalClose,
  UniModalContent,
  ModalSurface,
  PopoverSurface,
  modalSurfaceClassName,
  popoverSurfaceClassName,
}
export type { ModalSurfaceProps }
