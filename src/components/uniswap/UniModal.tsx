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

/**
 * Positioning + motion for modal content in a portal. Top-aligned (not centered)
 * so the modal lands over the top of the swap box rather than mid-screen, and
 * scales from that top edge. Enter 200ms, exit faster (150ms), strong ease-out.
 */
const modalContentClassName = cn(
  'fixed left-1/2 top-[clamp(16px,10vh,96px)] z-50 w-[calc(100%-32px)] -translate-x-1/2',
  'max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain origin-top',
  'ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=open]:duration-200 data-[state=closed]:duration-150',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-top-2',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97]',
  'motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=open]:slide-in-from-top-0 motion-reduce:data-[state=closed]:zoom-out-100',
)

/** Scrim behind modals: fades with the content, exit a touch faster. */
const modalOverlayClassName = 'bg-scrim data-[state=open]:duration-200 data-[state=closed]:duration-150'

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
      <DialogOverlay className={modalOverlayClassName} />
      <DialogPrimitive.Content
        data-slot="uni-modal-content"
        aria-describedby={undefined}
        className={cn(uniswapScopeClassName, modalSurfaceClassName, modalContentClassName, className)}
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

/* ---------------------------------------------------------------------------
 * Palette: a wide, command-palette variant of the modal (the token selector).
 * No padding or title row: the content draws its own search header, body and
 * footer. Fixed height, so filtering doesn't make the card jump.
 * ------------------------------------------------------------------------- */

/** Palette card styling shared by the dialog content and the inline surface. */
const paletteSurfaceClassName =
  'flex h-[560px] w-full max-w-[680px] flex-col overflow-hidden rounded-uni-20 border border-surface3 bg-surface1 shadow-uni-medium outline-none'

/**
 * Positioning + motion for palette content in a portal. Sits in the upper
 * third like Raycast / Linear's ⌘K and fits short viewports. Motion is nearly
 * none, since a palette opens many times a day: 150ms fade + 0.98 scale in,
 * 100ms fade out, no scale under reduced motion.
 */
const paletteContentClassName = cn(
  'fixed left-1/2 top-[clamp(16px,12vh,120px)] z-50 w-[calc(100%-32px)] -translate-x-1/2 origin-top',
  'h-[min(560px,calc(100dvh-clamp(16px,12vh,120px)-16px))]',
  'ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=open]:duration-150 data-[state=closed]:duration-100',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
  'motion-reduce:data-[state=open]:zoom-in-100',
)

const paletteOverlayClassName = 'bg-scrim data-[state=open]:duration-150 data-[state=closed]:duration-100'

/**
 * Palette dialog. `title` is the accessible name only (the content's search
 * field is the visible header). Content that owns Escape (clear the search
 * first, then close itself) marks its root `data-palette-escape`; Escape
 * pressed inside it is left to the content instead of closing the dialog.
 */
function UniPaletteContent({
  className,
  children,
  title,
  onEscapeKeyDown,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: React.ReactNode }) {
  return (
    <DialogPortal>
      <DialogOverlay className={paletteOverlayClassName} />
      <DialogPrimitive.Content
        data-slot="uni-palette-content"
        aria-describedby={undefined}
        className={cn(uniswapScopeClassName, paletteSurfaceClassName, paletteContentClassName, className)}
        onEscapeKeyDown={(e) => {
          onEscapeKeyDown?.(e)
          if (e.target instanceof Element && e.target.closest('[data-palette-escape]')) e.preventDefault()
        }}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/** The palette card, inline (no portal, overlay, or positioning), for canvas frames and previews. */
function PaletteSurface({
  title,
  scoped = false,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & { title?: string; scoped?: boolean }) {
  return (
    <div
      data-slot="uni-palette-surface"
      role="dialog"
      aria-label={title}
      className={cn(scoped && uniswapScopeClassName, paletteSurfaceClassName, className)}
      {...props}
    />
  )
}

export {
  UniPaletteContent,
  PaletteSurface,
  paletteSurfaceClassName,
  paletteContentClassName,
  paletteOverlayClassName,
}

export {
  Dialog as UniModal,
  DialogTrigger as UniModalTrigger,
  DialogClose as UniModalClose,
  UniModalContent,
  ModalSurface,
  PopoverSurface,
  modalSurfaceClassName,
  modalContentClassName,
  modalOverlayClassName,
  popoverSurfaceClassName,
}
export type { ModalSurfaceProps }
