'use client'

import * as React from 'react'
import type { ReviewFlowState, ReviewPhase } from '../review'
import type { FaceIdStatus } from './FaceIdGlyph'
import { ISLAND_TIMINGS, type IslandKind } from './geometry'

/*
 * What the island shows, given where the review flow is:
 *
 *   review ─────────────▶ idle            (the sheet is the surface)
 *   approve / sign ─────▶ Face ID          one scan signs both
 *   rejected ───────────▶ Face ID ✕ shake ──▶ idle
 *   pending ────────────▶ Face ID ✓ ──▶ compact ⇄ expanded (tap)
 *   success ────────────▶ alert ──▶ compact ✓ ──▶ idle (activity ends)
 *
 * Timers belong to the current presentation, so pausing holds it and any
 * change (a phase, a tap) restarts the wait from there.
 */

export interface IslandPresentation {
  kind: IslandKind
  faceId?: FaceIdStatus
}

const IDLE: IslandPresentation = { kind: 'idle' }
const COMPACT: IslandPresentation = { kind: 'compact' }
const EXPANDED: IslandPresentation = { kind: 'expanded' }
const ALERT: IslandPresentation = { kind: 'alert' }
const SCANNING: IslandPresentation = { kind: 'faceid', faceId: 'scanning' }
const SIGNED: IslandPresentation = { kind: 'faceid', faceId: 'success' }
const DECLINED: IslandPresentation = { kind: 'faceid', faceId: 'failed' }

export const ISLAND_PRESENTATIONS = { IDLE, COMPACT, EXPANDED, ALERT, SCANNING, SIGNED, DECLINED }

/** Where the island settles for a phase, entered cold (a preset, a static frame). */
export function restingPresentation(phase: ReviewPhase): IslandPresentation {
  switch (phase) {
    case 'approve':
    case 'sign':
      return SCANNING
    case 'pending':
      return COMPACT
    case 'success':
      return ALERT
    default:
      return IDLE
  }
}

/** The presentation a phase change lands on, given where the flow came from. */
function enter(from: ReviewPhase, to: ReviewPhase): IslandPresentation {
  if (to === 'pending' && from === 'sign') return SIGNED
  if (to === 'rejected') return DECLINED
  return restingPresentation(to)
}

export interface UseIslandPresentationOptions {
  paused?: boolean
  /** Start somewhere other than the phase's resting presentation (presets). */
  initial?: IslandPresentation
  timings?: typeof ISLAND_TIMINGS
}

export function useIslandPresentation(state: ReviewFlowState, options: UseIslandPresentationOptions = {}) {
  const { paused = false, initial, timings = ISLAND_TIMINGS } = options
  const [presentation, setPresentation] = React.useState(() => initial ?? restingPresentation(state.phase))

  // Follow the flow during render, so a phase never paints with the last one's island
  const [phase, setPhase] = React.useState(state.phase)
  if (state.phase !== phase) {
    setPhase(state.phase)
    setPresentation(enter(phase, state.phase))
  }

  React.useEffect(() => {
    if (paused) return
    const after = (ms: number, next: IslandPresentation) => {
      const id = window.setTimeout(() => setPresentation(next), ms)
      return () => window.clearTimeout(id)
    }
    if (presentation === DECLINED) return after(timings.faceIdFailed, IDLE)
    if (presentation === SIGNED) return after(timings.faceIdSuccess, COMPACT)
    if (phase === 'success' && presentation === ALERT) return after(timings.alert, COMPACT)
    if (phase === 'success' && presentation === COMPACT) return after(timings.linger, IDLE)
  }, [presentation, phase, paused, timings])

  /** A tap on the island: open the activity, or fold it back. */
  const toggle = React.useCallback(() => {
    setPresentation((current) => {
      if (phase === 'pending') return current === COMPACT ? EXPANDED : current === EXPANDED ? COMPACT : current
      if (phase === 'success') return current === COMPACT ? ALERT : current === ALERT ? COMPACT : current
      return current
    })
  }, [phase])

  const interactive = presentation === COMPACT || presentation === EXPANDED || presentation === ALERT
  return { presentation, toggle: interactive ? toggle : undefined }
}
