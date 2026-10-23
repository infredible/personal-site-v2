'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { TokenPriceSparkline, type ChartPeriod } from '@/components/uniswap/chart'
import { SparklineCanvas } from './SparklineCanvas'
import { SPARKLINE_PRESETS, getSparklinePreset, type SparklinePreset } from './presets'

const links = [
  { href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> },
  { href: '/showcase/uniswap/swap', label: 'Swap', icon: <ArrowLeftRight aria-hidden /> },
]

const presets = SPARKLINE_PRESETS.map(({ id, label }) => ({ id, label }))

/** Simulated price-history latency for the Loading preset */
const LOADING_MS = 1800

/** The live card. Loading preset: skeleton first, then the line morphs in (Reset replays it). */
function LiveSparkline({
  preset,
  period,
  onPeriodChange,
  onLoaded,
}: {
  preset: SparklinePreset
  period: ChartPeriod
  onPeriodChange: (period: ChartPeriod) => void
  onLoaded: () => void
}) {
  const [loading, setLoading] = useState(Boolean(preset.loading))
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded
  useEffect(() => {
    if (!loading) return
    const id = setTimeout(() => {
      setLoading(false)
      onLoadedRef.current()
    }, LOADING_MS)
    return () => clearTimeout(id)
  }, [loading])

  return (
    <div className="w-full max-w-[480px]">
      <TokenPriceSparkline token={preset.token} defaultPeriod={period} onPeriodChange={onPeriodChange} loading={loading} explode />
    </div>
  )
}

export function SparklineShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()
  // The live card's period, keyed by preset + reset: the canvas anatomy shows
  // it, and returning to the Component view resumes from it.
  const live = useRef<{ key: string; period: ChartPeriod } | null>(null)

  return (
    <ShowcaseShell
      title="Price sparkline"
      eyebrow="Uniswap recreation"
      backHref="/"
      links={links}
      presets={presets}
      defaultPreset={SPARKLINE_PRESETS[0].id}
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset: presetId, resetKey }) => {
        const preset = getSparklinePreset(presetId)
        const key = `${preset.id}-${resetKey}`
        const resumed = live.current?.key === key ? live.current.period : undefined
        return (
          <LiveSparkline
            key={key}
            preset={resumed ? { ...preset, loading: false } : preset}
            period={resumed ?? preset.period}
            onPeriodChange={(period) => {
              live.current = { key, period }
            }}
            // Loaded once: coming back from the canvas doesn't replay the skeleton
            onLoaded={() => {
              if (live.current?.key !== key) live.current = { key, period: preset.period }
            }}
          />
        )
      }}
      renderCanvas={({ preset: presetId }) => {
        const preset = getSparklinePreset(presetId)
        const period = live.current?.key.startsWith(`${preset.id}-`) ? live.current.period : preset.period
        return <SparklineCanvas controller={controller} anatomy={{ token: preset.token, period }} />
      }}
    />
  )
}
