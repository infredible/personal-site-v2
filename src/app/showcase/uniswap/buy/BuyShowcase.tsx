'use client'

import * as React from 'react'
import { ArrowDownUp, Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition, type ShowcaseViewport } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { BUY_PRESETS, BuyFlow, CLOSED_SHEET, getBuyPreset } from '@/components/uniswap/buy'
import type { BuyFormState, BuySheetState } from '@/components/uniswap/buy'
import { cn } from '@/lib/utils'
import { BuyCanvas } from './BuyCanvas'

const links = [
  { href: '/showcase/uniswap/swap', label: 'Swap', icon: <ArrowDownUp aria-hidden /> },
  { href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> },
]

const presets = BUY_PRESETS.map(({ id, label }) => ({ id, label }))

interface LiveState {
  key: string
  state: BuyFormState
  sheet: BuySheetState
}

/** The Component view stage's padding on Desktop (ShowcaseShell): 68px top; 32px is kept free below the device */
const DESKTOP_TOP = 68
const DESKTOP_BOTTOM = 32
const DEVICE_WIDTH = 375

/** Narrower than this, the stage is already phone-sized (a real phone, or the Mobile frame) */
const FILL_BELOW = 480

/**
 * The prototype is a phone app, so it gets a phone. On a wide stage: a 375px
 * device as tall as the stage allows (640–800px). In the Mobile frame, or on
 * an actual phone, the stage is the phone: the screen bleeds past the stage
 * padding and fills it.
 */
function PhoneScreen({ viewport, children }: { viewport: ShowcaseViewport; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [available, setAvailable] = React.useState<{ width: number; height: number } | null>(null)

  React.useLayoutEffect(() => {
    const scroller = ref.current?.closest<HTMLElement>('[data-showcase-viewport]')
    if (!scroller) return
    const measure = () => setAvailable({ width: scroller.clientWidth, height: scroller.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  const fill = viewport === 'mobile' || (available !== null && available.width < FILL_BELOW)
  const height = fill
    ? (available?.height ?? 720)
    : Math.min(800, Math.max(640, (available?.height ?? 860) - DESKTOP_TOP - DESKTOP_BOTTOM))

  return (
    <div
      ref={ref}
      className={cn(
        'shrink-0 overflow-hidden',
        fill
          ? cn('-mx-uni-8 -mb-uni-60 w-[calc(100%+16px)]', viewport === 'mobile' ? '-mt-uni-24' : '-mt-[68px]')
          : 'rounded-[36px] border border-surface3 shadow-uni-medium',
      )}
      style={{ height, width: fill ? undefined : DEVICE_WIDTH }}
    >
      {children}
    </div>
  )
}

export function BuyShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()
  // The live flow's latest state, keyed by preset + reset: the canvas anatomy
  // takes apart what you left on screen, and coming back resumes from it.
  const live = React.useRef<LiveState | null>(null)

  return (
    <ShowcaseShell
      title="Buy flow"
      eyebrow="Uniswap recreation · prototype"
      backHref="/showcase"
      links={links}
      presets={presets}
      defaultPreset="empty"
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset, resetKey, viewport }) => {
        const key = `${preset}-${resetKey}`
        const resumed = live.current?.key === key ? live.current : undefined
        const initial = getBuyPreset(preset)
        return (
          <PhoneScreen viewport={viewport}>
            {/* Remount on preset change or Reset so the flow starts from the preset */}
            <BuyFlow
              key={key}
              keyboard
              explode
              className="pt-uni-16"
              initialState={resumed?.state ?? initial.state}
              initialSheet={resumed?.sheet ?? initial.sheet ?? CLOSED_SHEET}
              onStateChange={(state, sheet) => {
                live.current = { key, state, sheet }
              }}
            />
          </PhoneScreen>
        )
      }}
      renderCanvas={({ preset }) => (
        <BuyCanvas
          controller={controller}
          anatomyState={live.current?.key.startsWith(`${preset}-`) ? live.current.state : getBuyPreset(preset).state}
        />
      )}
    />
  )
}
