'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition, type ShowcaseViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { TokenPriceSparkline, type SparklinePriceLine } from '@/components/uniswap/chart'
import { formatPercent } from '@/components/uniswap/swap/format'
import { formatPriceInput, getLimitPrice, LIMIT_PRESETS, presetPrice, type LimitPrice } from '@/components/uniswap/swap/limit'
import { SwapBox, type SwapBoxApi, type SwapBoxProps } from '@/components/uniswap/swap/SwapBox'
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
  input?: Token
  output?: Token
  /** Side the chart starts on: the output token, or on the Limit tab the side the price is quoted in */
  preferred: 'input' | 'output'
  /** Limit tab with a price set: drawn on the chart as a draggable line */
  limit?: LimitPrice
  loading: boolean
}

const samePrice = (a?: LimitPrice, b?: LimitPrice) =>
  a === b || (!!a && !!b && a.base === b.base && a.quote === b.quote && a.price === b.price && a.status === b.status)



/** The swap's tokens; the chart loads with the page */
const chartStateOf = (state: SwapFormState, loading = Boolean(state.wallet.balancesLoading)): ChartState => ({
  input: state.input.token ?? undefined,
  output: state.output.token ?? undefined,
  // "1 ETH = 3,412 USDC" charts ETH, whichever side of the order it's on
  preferred: state.mode === 'limit' && !state.limit.inverted ? 'input' : 'output',
  limit: state.mode === 'limit' ? limitOf(state) : undefined,
  loading,
})

function limitOf(state: SwapFormState) {
  const price = getLimitPrice(state)
  return price?.status ? price : undefined
}

/**
 * The limit price as a line on the chart. The chart plots `token` in USD, so the
 * price (quote per base) converts through the other token's USD price; either
 * side of the pair can be charted. The pill reads the line's distance from the
 * chart's latest price, which is market. A drag sets the price back on the box,
 * or the preset it snapped to.
 */
function limitPriceLine(limit: LimitPrice, token: Token, api: React.RefObject<SwapBoxApi | null>): SparklinePriceLine | undefined {
  const charted = token.symbol === limit.base.symbol ? 'base' : token.symbol === limit.quote.symbol ? 'quote' : undefined
  if (!charted) return undefined
  const toUsd = (price: number) => (charted === 'base' ? price * limit.quote.priceUsd : limit.base.priceUsd / price)
  const fromUsd = (usd: number) => (charted === 'base' ? usd / limit.quote.priceUsd : limit.base.priceUsd / usd)
  const value = toUsd(limit.price)
  const delta = value / token.priceUsd - 1
  return {
    value,
    label: limit.status === 'market' ? 'Market' : `${delta > 0 ? '+' : '−'}${formatPercent(Math.abs(delta))}`,
    tone: limit.status === 'below-market' ? 'critical' : limit.status === 'far' ? 'warning' : 'accent',
    snaps: LIMIT_PRESETS.map((preset) => toUsd(presetPrice(limit.market, preset, limit.inverted))),
    name: `Limit price, ${limit.quote.symbol} per ${limit.base.symbol}`,
    onChange: (usd, snap) => {
      if (snap !== undefined) return api.current?.setLimitPreset(LIMIT_PRESETS[snap])
      if (usd > 0) api.current?.setLimitPrice(formatPriceInput(fromUsd(usd)))
    },
  }
}

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
// Strong ease-out for the chart entering/leaving; ease-in-out for the box moving on screen
const CHART_EASE_OUT = [0.23, 1, 0.32, 1] as const
const CHART_EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

function SwapWithChart({ onStateChange, ...boxProps }: SwapBoxProps) {
  const [chart, setChart] = useState<ChartState>(() => chartStateOf(boxProps.initialState, boxProps.simulateLoading))
  const [panels, setPanels] = useState<{ top: number; height: number } | null>(null)
  const [chartVisible, setChartVisible] = useState(true)
  // Which side of the pair the chart shows: the preferred side by default, else
  // whichever is set, else ETH. With both set, the header offers the other one.
  // A pick lasts until the preferred side changes (a tab switch, a flipped pair).
  const [picked, setPicked] = useState({ for: chart.preferred, side: chart.preferred })
  const side = picked.for === chart.preferred ? picked.side : chart.preferred
  const setSide = (next: 'input' | 'output') => setPicked({ for: chart.preferred, side: next })
  const other = side === 'output' ? 'input' : 'output'
  const chartToken = chart[side] ?? chart[other] ?? TOKENS.ETH
  const pairToken = chart[side] && chart[other] ? chart[other] : undefined
  const reduceMotion = useReducedMotion()
  const boxRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SwapBoxApi>(null)
  const priceLine = useMemo(() => (chart.limit ? limitPriceLine(chart.limit, chartToken, apiRef) : undefined), [chart.limit, chartToken])

  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const handleStateChange = useCallback((state: SwapFormState) => {
    onStateChangeRef.current?.(state)
    // Only a new token or the end of loading re-renders the card; typing doesn't
    const next = chartStateOf(state)
    setChart((prev) =>
      prev.input === next.input &&
      prev.output === next.output &&
      prev.preferred === next.preferred &&
      prev.loading === next.loading &&
      samePrice(prev.limit, next.limit)
        ? prev
        : next,
    )
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
    // The chart toggle only shows where the chart fits
    <div className="relative flex w-full items-start justify-center gap-uni-24 [&_[data-slot=swap-chart-toggle]]:hidden @min-[1000px]/viewport:[&_[data-slot=swap-chart-toggle]]:flex">
      {/* popLayout lifts the leaving chart out of the flow at once, so the box
          glides to center while the chart is still sliding out, not after */}
      <AnimatePresence initial={false} mode="popLayout">
        {chartVisible && (
          <motion.div
            key="chart"
            data-swap-chart=""
            className="hidden w-[480px] min-w-0 shrink @min-[1000px]/viewport:block"
            // Padding, not margin: popLayout pins the leaving chart at its offsetTop,
            // which already includes a margin, so a margin would drop it on exit
            style={{ paddingTop: panels?.top ?? 40 }}
            // Emerges from the box's side, sliding right to left, and retreats the same
            // way; reduced motion keeps only the fade
            initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'translateX(24px)' }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            exit={{
              opacity: 0,
              transform: reduceMotion ? 'none' : 'translateX(24px)',
              // Exit is quicker than enter: the system is responding, not presenting
              transition: { duration: 0.18, ease: CHART_EASE_OUT },
            }}
            // Enter waits for the box to start sliding over (its ease-in-out starts slow),
            // so the room opens up first and the card follows into it
            transition={{ duration: 0.24, ease: CHART_EASE_OUT, delay: reduceMotion ? 0 : 0.12 }}
            // Keeps this animation on Motion's JS driver instead of WAAPI. Beside the
            // box's layout animation, the WAAPI path cancels a frame before it commits
            // the end values, flashing the card back to opacity 0 as it lands.
            onUpdate={() => {}}
          >
            <TokenPriceSparkline
              token={chartToken}
              loading={chart.loading}
              height={panels?.height ?? 288}
              pairToken={pairToken}
              onPairTokenSelect={() => setSide(other)}
              priceLine={priceLine}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        ref={boxRef}
        // Only the chart toggle moves the box; other re-renders never animate it
        layout={reduceMotion ? false : 'position'}
        layoutDependency={chartVisible}
        transition={{ layout: { duration: 0.26, ease: CHART_EASE_IN_OUT } }}
        className="relative w-full min-w-0 max-w-[480px]"
      >
        <SwapBox
          {...boxProps}
          apiRef={apiRef}
          onStateChange={handleStateChange}
          chartVisible={chartVisible}
          onChartToggle={() => setChartVisible((v) => !v)}
        />
      </motion.div>
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
      backHref="/showcase"
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
