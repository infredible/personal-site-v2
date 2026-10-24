'use client'

import { ArrowLeftRight, Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import {
  LIQUIDITY_RANGE_PRESETS,
  LiquidityRangeSelector,
  getLiquidityRangePreset,
} from '@/components/uniswap/liquidity'
import { LiquidityRangeCanvas } from './LiquidityRangeCanvas'

const links = [
  { href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> },
  { href: '/showcase/uniswap/swap', label: 'Swap', icon: <ArrowLeftRight aria-hidden /> },
]

const presets = LIQUIDITY_RANGE_PRESETS.map(({ id, label }) => ({ id, label }))

export function LiquidityRangeShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()

  return (
    <ShowcaseShell
      title="Liquidity range"
      eyebrow="Uniswap recreation"
      backHref="/showcase"
      links={links}
      presets={presets}
      defaultPreset={LIQUIDITY_RANGE_PRESETS[0].id}
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset, resetKey }) => (
        <div className="w-full max-w-[1040px]">
          <LiquidityRangeSelector
            key={`${preset}-${resetKey}`}
            defaultState={getLiquidityRangePreset(preset).state}
            explode
          />
        </div>
      )}
      renderCanvas={({ preset }) => (
        <LiquidityRangeCanvas controller={controller} state={getLiquidityRangePreset(preset).state} />
      )}
    />
  )
}
