'use client'

import * as React from 'react'
import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { cn } from '@/lib/utils'

/*
 * Motion language for the review surface. Every UI step stays under 300ms;
 * the success moment is the one place allowed a little more.
 *
 * - Height morphs: measured, 300ms on an iOS-drawer curve (fast start, long
 *   settle), so the card answers the press at once and lands softly.
 * - Content swaps (labels, glyphs, regions): crossfade in place with a 2-4px
 *   blur, which reads as one thing changing rather than two overlapping.
 *   Exits are faster than entries.
 * - Reduced motion: opacity only. No blur, no translate, heights jump.
 */

export const EASE_OUT = [0.23, 1, 0.32, 1] as const
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

export const DURATION = {
  height: 0.3,
  swapIn: 0.18,
  swapOut: 0.12,
  regionIn: 0.22,
  regionOut: 0.15,
  stagger: 0.05,
}

export function useReviewMotion() {
  const reduce = useReducedMotion() ?? false
  return React.useMemo(() => {
    const fadeIn = (duration: number, delay = 0): Transition => ({ duration, delay, ease: EASE_OUT })
    return {
      reduce,
      height: (reduce ? { duration: 0 } : { duration: DURATION.height, ease: EASE_DRAWER }) satisfies Transition,
      /** Crossfade for something replaced in place: a label, a glyph, a number. */
      swap: {
        initial: reduce ? { opacity: 0 } : { opacity: 0, filter: 'blur(2px)' },
        animate: { opacity: 1, filter: 'blur(0px)', transition: fadeIn(DURATION.swapIn) },
        exit: reduce
          ? { opacity: 0, transition: fadeIn(DURATION.swapOut) }
          : { opacity: 0, filter: 'blur(2px)', transition: fadeIn(DURATION.swapOut) },
      },
      /** A whole region leaving (details as you commit) or arriving. */
      region: {
        initial: reduce ? { opacity: 0 } : { opacity: 0, filter: 'blur(4px)' },
        animate: { opacity: 1, filter: 'blur(0px)', transition: fadeIn(DURATION.regionIn, 0.04) },
        exit: reduce
          ? { opacity: 0, transition: fadeIn(DURATION.regionOut) }
          : { opacity: 0, filter: 'blur(4px)', transition: fadeIn(DURATION.regionOut) },
      },
      /** Rows arriving one after another (the steps). */
      stagger: (index: number) => ({
        initial: reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)', filter: 'blur(3px)' },
        animate: {
          opacity: 1,
          transform: 'translateY(0px)',
          filter: 'blur(0px)',
          transition: fadeIn(DURATION.regionIn, reduce ? 0 : 0.06 + index * DURATION.stagger),
        },
      }),
      /** Small glyphs arriving (status icons, badges). Never from scale(0). */
      pop: {
        initial: reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.8)' },
        animate: { opacity: 1, transform: 'scale(1)', transition: fadeIn(0.2) },
        exit: reduce
          ? { opacity: 0, transition: fadeIn(0.1) }
          : { opacity: 0, transform: 'scale(0.8)', transition: fadeIn(0.1) },
      },
    }
  }, [reduce])
}

/**
 * Animates its height to its content's measured height. The content lays out
 * instantly; only this box's height moves, so everything below it (the button)
 * rides the edge smoothly and nothing above it moves at all. Retargets from
 * wherever it is when the content changes mid-morph. Clips only while moving,
 * so focus rings aren't cut off at rest.
 */
export function AutoHeight({ className, children }: { className?: string; children: React.ReactNode }) {
  const { height: transition } = useReviewMotion()
  const outer = React.useRef<HTMLDivElement>(null)
  const inner = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | 'auto'>('auto')
  const target = React.useRef<number | null>(null)

  const clip = (on: boolean) => {
    if (outer.current) outer.current.style.overflow = on ? 'hidden' : ''
  }

  React.useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = () => {
      const next = el.offsetHeight
      if (next === target.current) return
      // Observer callbacks run before paint: clip now, so the frame before the
      // morph starts doesn't show new content spilling past the old height
      if (target.current !== null) clip(true)
      target.current = next
      setHeight(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      ref={outer}
      className={className}
      initial={false}
      animate={{ height }}
      transition={transition}
      onAnimationStart={() => clip(true)}
      onAnimationComplete={() => clip(false)}
    >
      <div ref={inner} className="relative">
        {children}
      </div>
    </motion.div>
  )
}

/** Uniswap's SpinningLoader glyph (as in UniButton), sized by its container. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('animate-uni-spin', className)}>
      <path
        d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M21 12C21 7.02944 16.9706 3 12 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
