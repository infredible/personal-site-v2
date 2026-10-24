'use client'

import * as React from 'react'
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion'

/*
 * A bottom sheet inside its phone screen (not a portal: the screen is a frame
 * on the page, and the sheet belongs to it). The prototype uses vaul; this
 * keeps its feel without the dependency: it slides up on the iOS drawer curve
 * over a 40% scrim, and drags down to dismiss from the handle and title area
 * (the list below scrolls instead). A fast flick or a pull past a third of
 * its height closes it; otherwise it springs back.
 *
 * As a dialog: focus moves into it on open, Tab stays inside, Esc and the
 * scrim close it, and focus returns to `returnFocusId` after. The screen
 * behind is made inert by the owner.
 */

const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

interface BuySheetProps {
  open: boolean
  onClose: () => void
  labelledBy: string
  /** Element to focus once the sheet has closed (the card that opened it) */
  returnFocusId?: string
  children: React.ReactNode
}

export function BuySheet({ open, onClose, labelledBy, returnFocusId, children }: BuySheetProps) {
  const reduceMotion = useReducedMotion()
  const drag = useDragControls()
  const panel = React.useRef<HTMLDivElement>(null)

  // Focus lands on the content's [data-sheet-focus] if it has one, so its own key handlers see the keys
  React.useEffect(() => {
    if (!open) return
    const target = panel.current?.querySelector<HTMLElement>('[data-sheet-focus]') ?? panel.current
    target?.focus({ preventScroll: true })
  }, [open])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const height = panel.current?.offsetHeight ?? 600
    if (info.velocity.y > 500 || info.offset.y > height / 3) onClose()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    } else if (event.key === 'Tab') {
      trapTab(event, panel.current)
    }
  }

  return (
    <AnimatePresence
      onExitComplete={() => returnFocusId && document.getElementById(returnFocusId)?.focus({ preventScroll: true })}
    >
      {open && (
        <div key="sheet" className="absolute inset-0 z-30">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_DRAWER }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className="absolute inset-x-0 bottom-0 flex h-[85%] flex-col overflow-hidden rounded-t-uni-20 bg-surface1 outline-none"
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%', transition: { duration: 0.28, ease: EASE_DRAWER } }}
            transition={{ duration: 0.45, ease: EASE_DRAWER }}
            drag={reduceMotion ? false : 'y'}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
            onDragEnd={onDragEnd}
          >
            {/* Grab area: the handle and the title under it */}
            <div
              className="absolute inset-x-0 top-0 z-20 h-uni-48 cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={(e) => drag.start(e)}
            />
            <div aria-hidden className="mx-auto mt-uni-8 mb-uni-8 h-uni-4 w-uni-48 shrink-0 rounded-uni-full bg-neutral3" />
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), [tabindex="0"]'

/** Keeps Tab inside `root`, wrapping at either end */
function trapTab(event: React.KeyboardEvent, root: HTMLElement | null) {
  if (!root) return
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
  if (items.length === 0) return
  // Also wraps from a container holding focus (not in the list), which the browser would let escape
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (event.shiftKey && index <= 0) {
    event.preventDefault()
    items[items.length - 1].focus()
  } else if (!event.shiftKey && (index === -1 || index === items.length - 1)) {
    event.preventDefault()
    items[0].focus()
  }
}
