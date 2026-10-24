'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { TokenPriceSparkline, type ChartPeriod, type ChartType } from '@/components/uniswap/chart'
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
  chartType,
  onPeriodChange,
  onChartTypeChange,
  onLoaded,
}: {
  preset: SparklinePreset
  period: ChartPeriod
  chartType: ChartType
  onPeriodChange: (period: ChartPeriod) => void
  onChartTypeChange: (type: ChartType) => void
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
      <TokenPriceSparkline
        token={preset.token}
        defaultPeriod={period}
        onPeriodChange={onPeriodChange}
        defaultChartType={chartType}
        onChartTypeChange={onChartTypeChange}
        loading={loading}
        explode
      />
    </div>
  )
}

export function SparklineShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()
  // The live card's period and chart type, keyed by preset + reset: the canvas
  // anatomy shows them, and returning to the Component view resumes from them.
  const live = useRef<{ key: string; period: ChartPeriod; chartType: ChartType } | null>(null)

  return (
    <ShowcaseShell
      title="Price sparkline"
      eyebrow="Uniswap recreation"
      backHref="/showcase"
      links={links}
      presets={presets}
      defaultPreset={SPARKLINE_PRESETS[0].id}
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset: presetId, resetKey }) => {
        const preset = getSparklinePreset(presetId)
        const key = `${preset.id}-${resetKey}`
        const resumed = live.current?.key === key ? live.current : undefined
        const initial = { key, period: preset.period, chartType: preset.chartType ?? 'line' }
        return (
          <LiveSparkline
            key={key}
            preset={resumed ? { ...preset, loading: false } : preset}
            period={resumed?.period ?? initial.period}
            chartType={resumed?.chartType ?? initial.chartType}
            onPeriodChange={(period) => {
              live.current = { ...(live.current?.key === key ? live.current : initial), period }
            }}
            onChartTypeChange={(chartType) => {
              live.current = { ...(live.current?.key === key ? live.current : initial), chartType }
            }}
            // Loaded once: coming back from the canvas doesn't replay the skeleton
            onLoaded={() => {
              if (live.current?.key !== key) live.current = initial
            }}
          />
        )
      }}
      renderCanvas={({ preset: presetId }) => {
        const preset = getSparklinePreset(presetId)
        const resumed = live.current?.key.startsWith(`${preset.id}-`) ? live.current : undefined
        return (
          <SparklineCanvas
            controller={controller}
            anatomy={{
              token: preset.token,
              period: resumed?.period ?? preset.period,
              chartType: resumed?.chartType ?? preset.chartType ?? 'line',
            }}
          />
        )
      }}
    />
  )
}
