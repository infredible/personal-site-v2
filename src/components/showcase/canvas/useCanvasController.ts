"use client"

import { useState, useSyncExternalStore } from "react"
import { CanvasEngine, type CanvasMode, type CanvasSnapshot, type ZoomOptions } from "./engine"

export type { CanvasMode, CanvasSnapshot, ZoomOptions }

/**
 * Handle to a <Canvas>. The object is stable for the life of the component that
 * created it, so passing it around never re-renders anything. `zoom` and `mode`
 * are live getters: read them in event handlers, and use `useCanvasState()`
 * (as <CanvasZoomControls> does) to re-render when they change.
 */
export interface CanvasController {
  /** Current zoom, 1 = 100%. Live getter; subscribe via useCanvasState() to render it. */
  readonly zoom: number
  /** "canvas" | "list" (narrow-screen fallback) | "unbound" (no <Canvas> mounted yet). */
  readonly mode: CanvasMode
  readonly minZoom: number
  readonly maxZoom: number
  /** Next Figma-style step (powers of two), around the viewport center. */
  zoomIn(opts?: ZoomOptions): void
  zoomOut(opts?: ZoomOptions): void
  /** Zoom to `z` (clamped to minZoom–maxZoom) around the viewport center. */
  zoomTo(z: number, opts?: ZoomOptions): void
  /** Fit all content with padding; never above 100%. */
  fit(opts?: ZoomOptions): void
  /** Zoom to 100%. */
  reset(opts?: ZoomOptions): void
  /** Bring the section/frame with this DOM id into view. Returns false if not found. */
  reveal(id: string, opts?: ZoomOptions): boolean
  subscribe(listener: () => void): () => void
  getSnapshot(): CanvasSnapshot
  /** @internal binding used by <Canvas> */
  readonly _engine: CanvasEngine
}

function createCanvasController(): CanvasController {
  const engine = new CanvasEngine()
  return {
    get zoom() {
      return engine.zoom
    },
    get mode() {
      return engine.currentMode
    },
    minZoom: engine.minZoom,
    maxZoom: engine.maxZoom,
    zoomIn: (opts) => engine.zoomIn(opts),
    zoomOut: (opts) => engine.zoomOut(opts),
    zoomTo: (z, opts) => engine.zoomTo(z, opts),
    fit: (opts) => engine.fit(opts),
    reset: (opts) => engine.reset(opts),
    reveal: (id, opts) => engine.reveal(id, opts),
    subscribe: engine.subscribe,
    getSnapshot: engine.getSnapshot,
    _engine: engine,
  }
}

/** Create a controller for one <Canvas>. Stable across renders. */
export function useCanvasController(): CanvasController {
  const [controller] = useState(createCanvasController)
  return controller
}

const SERVER_SNAPSHOT: CanvasSnapshot = { zoom: 1, mode: "unbound" }
const getServerSnapshot = () => SERVER_SNAPSHOT

/** Subscribe to `{ zoom, mode }`; re-renders only the calling component. */
export function useCanvasState(controller: CanvasController): CanvasSnapshot {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, getServerSnapshot)
}
