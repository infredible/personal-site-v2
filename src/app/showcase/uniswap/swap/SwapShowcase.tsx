'use client'

import { useRef } from 'react'
import { Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { SwapBox } from '@/components/uniswap/swap/SwapBox'
import { SWAP_PRESETS, getPreset } from '@/components/uniswap/swap/presets'
import type { SwapFormState } from '@/components/uniswap/swap/types'
import { SwapCanvas } from './SwapCanvas'

const links = [{ href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> }]

const presets = SWAP_PRESETS.map(({ id, label }) => ({ id, label }))

// The reset count whose load we last simulated. Loading plays on the first
// page load and after Reset, not on every preset switch.
let simulatedForReset: number | null = null

const presetState = (preset: string | undefined) => (preset && getPreset(preset)?.state) || SWAP_PRESETS[0].state

export function SwapShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()
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
          <SwapBox
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
