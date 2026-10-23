'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition, type ShowcaseViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { TokenPriceSparkline } from '@/components/uniswap/chart'
import { SwapBox, type SwapBoxProps } from '@/components/uniswap/swap/SwapBox'
import { SWAP_PRESETS, getPreset } from '@/components/uniswap/swap/presets'
import { TOKENS } from '@/components/uniswap/swap/tokens'
import type { SwapFormState, Token } from '@/components/uniswap/swap/types'
import { SwapCanvas } from './SwapCanvas'

const links = [{ href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> }]

const presets = SWAP_PRESETS.map(({ id, label }) => ({ id, label }))

// The reset count whose load we last simulated. Loading plays on the first
// page load and after Reset, not on every preset switch.
let simulatedForReset: number | null = null

const presetState = (preset: string | undefined) => (preset && getPreset(preset)?.state) || SWAP_PRESETS[0].state

/* Price chart beside the swap -------------------------------------------- */

interface ChartState {
  token: Token
  loading: boolean
}

/** The chart follows the output token, else the input token, else ETH; it loads with the page */
const chartStateOf = (state: SwapFormState, loading = Boolean(state.wallet.balancesLoading)): ChartState => ({
  token: state.output.token ?? state.input.token ?? TOKENS.ETH,
  loading,
})

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const chartCard = () => document.querySelector<HTMLElement>('[data-showcase-view="component"] [data-swap-chart]')
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The exploded-view transition, plus the chart card: it isn't a swap part, so
 * it fades out quickly before the parts fly to the canvas, and fades back in
 * as they reassemble.
 */
function useSwapViewTransition(): ShowcaseViewTransition {
  const exploded = useExplodedViewTransition()
  return useMemo(
    () => ({
      before: async (from, to) => {
        const card = chartCard()
        if (to === 'canvas' && card?.offsetParent && !reducedMotion()) {
          await card
            .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE_OUT, fill: 'forwards' })
            .finished.catch(() => {})
        }
        return exploded.before?.(from, to)
      },
      after: (from, to) => {
        exploded.after?.(from, to)
        const card = chartCard()
        if (to === 'component' && card && !reducedMotion()) {
          card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 240, easing: EASE_OUT, fill: 'backwards' })
        }
      },
    }),
    [exploded],
  )
}

/** Top of `el` within `root` (which must be positioned), ignoring transforms */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let top = 0
  for (let node: HTMLElement | null = el; node && node !== root; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop
  }
  return top
}

/**
 * SwapBox with Uniswap's price chart card to its left on wide stages (as on
 * app.uniswap.org with the chart toggled on). The pair is centered as a group,
 * top-aligned; like Uniswap's WidthAnimator the card lines up with, and takes
 * the height of, the Sell + Buy panels. Hidden below ~1000px of stage width
 * (container query on the viewport frame), so the Mobile viewport never shows it.
 */
function SwapWithChart({ onStateChange, ...boxProps }: SwapBoxProps) {
  const [chart, setChart] = useState<ChartState>(() => chartStateOf(boxProps.initialState, boxProps.simulateLoading))
  const [panels, setPanels] = useState<{ top: number; height: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const handleStateChange = useCallback((state: SwapFormState) => {
    onStateChangeRef.current?.(state)
    // Only a new token or the end of loading re-renders the card; typing doesn't
    const next = chartStateOf(state)
    setChart((prev) => (prev.token === next.token && prev.loading === next.loading ? prev : next))
  }, [])

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const sell = box.querySelector<HTMLElement>('[data-explode="sell"]')
      const buy = box.querySelector<HTMLElement>('[data-explode="buy"]')
      if (!sell || !buy) return
      // Layout offsets, not client rects: the exploded-view transition moves the
      // parts with transforms while this measures
      const top = offsetWithin(sell, box)
      const height = offsetWithin(buy, box) + buy.offsetHeight - top
      setPanels((prev) => (prev?.top === top && prev.height === height ? prev : { top, height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex w-full items-start justify-center gap-uni-24">
      <div data-swap-chart="" className="hidden w-[480px] min-w-0 shrink @min-[1000px]/viewport:block" style={{ marginTop: panels?.top ?? 40 }}>
        <TokenPriceSparkline token={chart.token} loading={chart.loading} height={panels?.height ?? 288} />
      </div>
      <div ref={boxRef} className="relative w-full min-w-0 max-w-[480px]">
        <SwapBox {...boxProps} onStateChange={handleStateChange} />
      </div>
    </div>
  )
}

/* Page -------------------------------------------------------------------- */

export function SwapShowcase() {
  const controller = useCanvasController()
  const viewTransition = useSwapViewTransition()
  // The live swap's latest state, keyed by preset + reset. The canvas anatomy
  // renders it (so what you typed is what gets taken apart), and returning to
  // the Component view resumes from it instead of restarting the preset.
  const live = useRef<{ key: string; state: SwapFormState } | null>(null)

  return (
    <ShowcaseShell
      title="Swap"
      eyebrow="Uniswap recreation"
      backHref="/"
      links={links}
      presets={presets}
      defaultPreset="empty"
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset, resetKey }) => {
        const key = `${preset}-${resetKey}`
        const resumed = live.current?.key === key ? live.current.state : undefined
        // Remount on preset change or Reset so the live state starts from the preset
        return (
          <SwapWithChart
            key={key}
            initialState={resumed ?? presetState(preset)}
            simulateLoading={!resumed && simulatedForReset !== resetKey}
            onLoaded={() => {
              simulatedForReset = resetKey
            }}
            onStateChange={(state) => {
              live.current = { key, state }
            }}
          />
        )
      }}
      renderCanvas={({ preset }) => (
        <SwapCanvas
          controller={controller}
          anatomyState={live.current?.key.startsWith(`${preset}-`) ? live.current.state : presetState(preset)}
        />
      )}
    />
  )
}
