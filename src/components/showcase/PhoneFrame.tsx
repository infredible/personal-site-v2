'use client'

import * as React from 'react'
import { useAnimate, useReducedMotion, type DOMKeyframesDefinition } from 'framer-motion'
import { cn } from '@/lib/utils'
import { HAPTIC_PATTERNS, HAPTIC_TAP_MS, type HapticPattern } from './haptics'

/*
 * PhoneFrame: an iPhone 15 Pro / 16 shell (393 × 852 pt screen) for showing
 * a mobile app at its real point size. Site chrome: it draws the hardware
 * only; the screen content brings its own scope, theme and status bar
 * (`PhoneStatusBar`, `PhoneHomeIndicator`, in currentColor). Rendered at 1:1 and scaled as a
 * whole, so what's inside always lays out at phone size.
 *
 * `haptic` draws a haptic: the device buzzes in the pattern's taps and short
 * marks flash at its sides (marks only, with reduced motion). It plays each
 * time the id changes; pair it with `playHaptic` for the real thing.
 */

export const IPHONE = { width: 393, height: 852, radius: 55, bezel: 11 } as const

const OUTER = { width: IPHONE.width + IPHONE.bezel * 2, height: IPHONE.height + IPHONE.bezel * 2 }

export interface PhoneFrameProps {
  /** Uniform scale of the whole device. The box it takes up scales with it. */
  scale?: number
  className?: string
  /** Screen background, behind the content. */
  screenClassName?: string
  /** Buzz the device in this pattern; plays again whenever `id` changes. */
  haptic?: { pattern: HapticPattern; id: number }
  children: React.ReactNode
}

export function PhoneFrame({ scale = 1, className, screenClassName, haptic, children }: PhoneFrameProps) {
  const scope = useHapticBuzz(haptic)
  return (
    <div ref={scope} className={cn('relative shrink-0', className)} style={{ width: OUTER.width * scale, height: OUTER.height * scale }}>
      {(['left', 'right'] as const).map((side) => (
        <HapticMarks key={side} side={side} />
      ))}
      {/* The buzz moves this box; the device inside keeps its own scale */}
      <div data-haptic-device="" className="absolute inset-0">
        <div
          className="absolute top-0 left-0 origin-top-left rounded-[66px] bg-[#0b0b0c] shadow-[0_0_0_1.5px_#3a3a3c,0_24px_60px_-12px_rgba(0,0,0,0.35)]"
          style={{ width: OUTER.width, height: OUTER.height, padding: IPHONE.bezel, transform: scale === 1 ? undefined : `scale(${scale})` }}
        >
          <div
            className={cn('relative h-full w-full overflow-hidden', screenClassName)}
            style={{ borderRadius: IPHONE.radius, isolation: 'isolate' }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Amplitude of the strongest tap: screen px of sideways travel, and degrees of twist. */
const BUZZ = { x: 3, rotate: 0.6 }

function useHapticBuzz(haptic: PhoneFrameProps['haptic']) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduce = useReducedMotion() ?? false
  const id = haptic?.id
  const pattern = haptic?.pattern

  React.useEffect(() => {
    if (id === undefined || !pattern || !scope.current) return
    const taps = HAPTIC_PATTERNS[pattern]
    const total = taps[taps.length - 1].at + HAPTIC_TAP_MS
    // Per tap: out, back past centre, a smaller rebound, rest. Held at 0 between taps.
    const shape = [0, -1, 1, -0.5, 0]
    const times: number[] = []
    const x: number[] = []
    const rotate: number[] = []
    const marks: number[] = []
    taps.forEach((tap) => {
      shape.forEach((k, i) => {
        times.push((tap.at + (i / (shape.length - 1)) * HAPTIC_TAP_MS) / total)
        x.push(k * BUZZ.x * tap.strength)
        rotate.push(-k * BUZZ.rotate * tap.strength)
        marks.push(i === 0 || i === shape.length - 1 ? 0 : tap.strength)
      })
    })
    const timing = { duration: total / 1000, times, ease: 'linear' } as const
    const controls = [animate('[data-haptic-mark]', { opacity: marks } satisfies DOMKeyframesDefinition, timing)]
    if (!reduce) controls.push(animate('[data-haptic-device]', { x, rotate }, timing))
    return () => controls.forEach((c) => c.stop())
  }, [id, pattern, reduce, animate, scope])

  return scope
}

/** Two short arcs beside the device, lit while it buzzes. */
function HapticMarks({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden
      data-haptic-mark=""
      width="14"
      height="40"
      viewBox="0 0 14 40"
      fill="none"
      className={cn(
        'pointer-events-none absolute top-[38%] text-neutral-400 opacity-0',
        side === 'left' ? '-left-[22px]' : '-right-[22px] -scale-x-100',
      )}
    >
      <path d="M11 6c-3 4-3 24 0 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12c-2 3-2 13 0 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** The largest scale (≤ 1) at which the phone fits the given box. */
export function phoneScaleToFit(width: number, height: number, min = 0.4) {
  return Math.max(min, Math.min(1, width / OUTER.width, height / OUTER.height))
}

/**
 * iOS status bar: time in the left ear, signal / Wi-Fi / battery in the right,
 * either side of the Dynamic Island. Draws in currentColor. `condensed` is
 * what iOS does while the island is widened: only the battery stays.
 */
export function PhoneStatusBar({
  time = '9:41',
  condensed = false,
  className,
}: {
  time?: string
  condensed?: boolean
  className?: string
}) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-x-0 top-0 flex h-[54px] items-center', className)}>
      <span className="flex flex-1 justify-center pt-[2px] text-[17px] leading-none font-semibold tracking-[-0.02em]">
        {time}
      </span>
      <span className="w-[126px] shrink-0" />
      <span className="flex flex-1 items-center justify-center gap-[6px] pt-[2px] pr-[12px]">
        <span className={cn('flex items-center gap-[6px] transition-opacity duration-200', condensed && 'hidden')}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .9 10.2 10.2 0 0 0 .8 3.8L2 5c1.6-1.5 3.7-2.4 6-2.4Z" />
          <path d="M8 6c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.9 6.9 0 0 0 8 4.3a6.9 6.9 0 0 0-4.8 1.9l1.2 1.2C5.4 6.5 6.6 6 8 6Z" />
          <path d="M10.4 8.6A3.4 3.4 0 0 0 8 7.7c-.9 0-1.8.3-2.4.9L8 11l2.4-2.4Z" />
        </svg>
        </span>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="currentColor" strokeOpacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  )
}

/** The home indicator bar, in currentColor. */
export function PhoneHomeIndicator({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-current',
        className,
      )}
    />
  )
}
