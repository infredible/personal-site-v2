'use client'

import { useRef } from 'react'
import { ArrowLeftRight, Palette } from 'lucide-react'
import { ShowcaseShell, useExplodedViewTransition } from '@/components/showcase'
import { CanvasZoomControls, useCanvasController } from '@/components/showcase/canvas'
import { ExploreTables, EXPLORE_PRESETS, getExplorePreset, type ExploreState } from '@/components/uniswap/explore'
import { ExploreCanvas } from './ExploreCanvas'

const links = [
  { href: '/showcase/uniswap/swap', label: 'Swap', icon: <ArrowLeftRight aria-hidden /> },
  { href: '/showcase/uniswap/system', label: 'Design system', icon: <Palette aria-hidden /> },
]

const presets = EXPLORE_PRESETS.map(({ id, label }) => ({ id, label }))

/** Simulated first-load latency for the Loading preset */
const LOADING_MS = 1800

export function ExploreShowcase() {
  const controller = useCanvasController()
  const viewTransition = useExplodedViewTransition()
  // The live tables' latest state, keyed by preset + reset. The canvas anatomy
  // renders it (so what you filtered is what gets taken apart), and returning
  // to the Component view resumes from it instead of restarting the preset.
  const live = useRef<{ key: string; state: ExploreState } | null>(null)

  return (
    <ShowcaseShell
      title="Explore tables"
      eyebrow="Uniswap recreation"
      backHref="/showcase"
      links={links}
      presets={presets}
      defaultPreset={EXPLORE_PRESETS[0].id}
      canvasControls={<CanvasZoomControls controller={controller} />}
      viewTransition={viewTransition}
      renderComponent={({ preset: presetId, resetKey }) => {
        const preset = getExplorePreset(presetId)
        const key = `${preset.id}-${resetKey}`
        const resumed = live.current?.key === key ? live.current.state : undefined
        // A status that came with the preset is held; a transient one (a refetch
        // in flight when the view changed) would stick, so it resumes as ready.
        const initialState = resumed
          ? { ...resumed, status: resumed.status === preset.state.status ? resumed.status : ('ready' as const) }
          : preset.state
        return (
          // Remount on preset change or Reset so the live state starts from the preset
          <div className="w-full min-w-0">
            <ExploreTables
              key={key}
              initialState={initialState}
              // The Loading preset finishes once; coming back from the canvas doesn't replay it
              firstLoadMs={initialState.status === 'loading' ? LOADING_MS : undefined}
              onStateChange={(state) => {
                live.current = { key, state }
              }}
            />
          </div>
        )
      }}
      renderCanvas={({ preset: presetId }) => {
        const preset = getExplorePreset(presetId)
        const anatomyState = live.current?.key.startsWith(`${preset.id}-`) ? live.current.state : preset.state
        return <ExploreCanvas controller={controller} anatomyState={anatomyState} />
      }}
    />
  )
}
