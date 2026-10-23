'use client'

import { useRef } from 'react'
import { ArrowLeftRight, Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { TOKEN_SELECTOR_PRESETS, presetState, type TokenSelectorDemoState } from './presets'
import { TokenSelectorCanvas } from './TokenSelectorCanvas'
import { TokenSelectorDemo } from './TokenSelectorDemo'

const links = [
  { href: '/showcase/uniswap/swap', label: 'Swap', icon: <ArrowLeftRight aria-hidden /> },
  { href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> },
]

const presets = TOKEN_SELECTOR_PRESETS.map(({ id, label }) => ({ id, label }))

export function TokenSelectorShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()
  // The live palette's latest state, keyed by preset + reset. The canvas anatomy
  // renders it (so what you searched is what gets taken apart), and returning to
  // the Component view resumes from it instead of restarting the preset.
  const live = useRef<{ key: string; state: TokenSelectorDemoState } | null>(null)

  return (
    <ShowcaseShell
      title="Token selector"
      eyebrow="Uniswap recreation"
      backHref="/"
      links={links}
      presets={presets}
      defaultPreset="default"
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset, resetKey }) => {
        const key = `${preset}-${resetKey}`
        const resumed = live.current?.key === key ? live.current.state : undefined
        // Remount on preset change or Reset so the live state starts from the preset
        return (
          <TokenSelectorDemo
            key={key}
            initialState={resumed ?? presetState(preset)}
            onStateChange={(state) => {
              live.current = { key, state }
            }}
          />
        )
      }}
      renderCanvas={({ preset }) => (
        <TokenSelectorCanvas
          controller={controller}
          anatomyState={live.current?.key.startsWith(`${preset}-`) ? live.current.state : presetState(preset)}
        />
      )}
    />
  )
}
