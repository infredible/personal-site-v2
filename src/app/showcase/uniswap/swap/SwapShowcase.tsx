'use client'

import { Palette } from 'lucide-react'
import { ShowcaseShell } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { SwapBox } from '@/components/uniswap/swap/SwapBox'
import { SWAP_PRESETS, getPreset } from '@/components/uniswap/swap/presets'
import { SwapCanvas } from './SwapCanvas'

const links = [{ href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> }]

const presets = SWAP_PRESETS.map(({ id, label }) => ({ id, label }))

export function SwapShowcase() {
  const controller = useCanvasController()

  return (
    <ShowcaseShell
      title="Swap"
      eyebrow="Uniswap recreation"
      backHref="/"
      links={links}
      presets={presets}
      defaultPreset="empty"
      canvasControls={<CanvasZoomControls controller={controller} />}
      renderComponent={({ preset, resetKey }) => {
        const state = (preset && getPreset(preset)?.state) || SWAP_PRESETS[0].state
        // Remount on preset change or Reset so the live state starts from the preset
        return <SwapBox key={`${preset}-${resetKey}`} initialState={state} />
      }}
      renderCanvas={() => <SwapCanvas controller={controller} />}
    />
  )
}
