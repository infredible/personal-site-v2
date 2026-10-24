'use client'

import { ArrowLeftRight, Palette } from 'lucide-react'
import { ShowcaseShell } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { ISLAND_PRESETS, getIslandPreset } from '@/components/uniswap/swap/island'
import { IslandCanvas } from './IslandCanvas'
import { LiveIsland } from './LiveIsland'

const links = [
  { href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> },
  { href: '/showcase/uniswap/review', label: 'Swap review (web)', icon: <ArrowLeftRight aria-hidden /> },
]

const presets = ISLAND_PRESETS.map(({ id, label }) => ({ id, label }))

export function IslandShowcase() {
  const controller = useCanvasController()
  return (
    <ShowcaseShell
      title="Swap review · Dynamic Island"
      eyebrow="Uniswap recreation · iOS translation"
      backHref="/showcase"
      links={links}
      presets={presets}
      defaultPreset="review"
      canvasControls={<CanvasZoomControls controller={controller} />}
      renderComponent={({ preset, resetKey }) => (
        <LiveIsland key={`${preset}-${resetKey}`} preset={getIslandPreset(preset ?? '') ?? ISLAND_PRESETS[0]} />
      )}
      renderCanvas={() => <IslandCanvas controller={controller} />}
    />
  )
}
