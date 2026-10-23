'use client'

import { useRef } from 'react'
import { ArrowDownUp, Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { REVIEW_PRESETS, getReviewPreset, type ReviewFlowState, type ReviewScenario } from '@/components/uniswap/swap/review'
import { LiveReview, ProductionReview } from './LiveReview'
import { ReviewCanvas } from './ReviewCanvas'

const links = [
  { href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> },
  { href: '/showcase/uniswap/swap', label: 'Swap', icon: <ArrowDownUp aria-hidden /> },
]

const PRODUCTION = 'production'

const presets = [
  ...REVIEW_PRESETS.map(({ id, label }) => ({ id, label })),
  { id: PRODUCTION, label: 'Production today' },
]

const scenarioFor = (preset: string | undefined): ReviewScenario => getReviewPreset(preset ?? '') ?? REVIEW_PRESETS[0]

export function ReviewShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()
  // The live flow's latest state, keyed by preset + reset: the canvas anatomy
  // takes apart the state you left it in, and coming back resumes from it.
  const live = useRef<{ key: string; state: ReviewFlowState } | null>(null)

  return (
    <ShowcaseShell
      title="Swap review"
      eyebrow="Uniswap recreation · redesign"
      backHref="/"
      links={links}
      presets={presets}
      defaultPreset="review"
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset, resetKey }) => {
        if (preset === PRODUCTION) return <ProductionReview key={resetKey} />
        const key = `${preset}-${resetKey}`
        const resumed = live.current?.key === key ? live.current.state : undefined
        return (
          <LiveReview
            key={key}
            preset={getReviewPreset(preset ?? '') ?? REVIEW_PRESETS[0]}
            resumeState={resumed}
            onStateChange={(state) => {
              live.current = { key, state }
            }}
          />
        )
      }}
      renderCanvas={({ preset }) => {
        const scenario = scenarioFor(preset)
        const state = live.current?.key.startsWith(`${preset}-`) ? live.current.state : scenario.state
        return <ReviewCanvas controller={controller} anatomy={{ trade: scenario.trade, state }} />
      }}
    />
  )
}
