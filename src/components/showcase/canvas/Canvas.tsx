"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"
import { CanvasLayoutContext, type CanvasLayoutMode } from "./context"
import { FRAME_BODY_SELECTOR } from "./engine"
import { useCanvasController, type CanvasController } from "./useCanvasController"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/** Below this width the canvas becomes a plain vertically scrolling list. */
const LIST_QUERY = "(max-width: 767.98px)"

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

// Cursor/selection rules keyed off data attributes the engine toggles directly,
// so pans never go through React.
const CANVAS_CSS = `
[data-canvas-viewport] {
  background-image: radial-gradient(circle at center, color-mix(in oklch, var(--muted-foreground) 38%, transparent) 0.9px, transparent 1.4px);
  background-size: 24px 24px;
}
[data-canvas-viewport][data-mode="canvas"] { cursor: grab; overscroll-behavior: contain; }
[data-canvas-viewport][data-mode="canvas"] ${FRAME_BODY_SELECTOR} { cursor: auto; }
[data-canvas-viewport][data-mode="canvas"] > [data-canvas-board] { transition: opacity 150ms ease-out; }
[data-canvas-viewport][data-mode="canvas"] > [data-canvas-board]:not([data-ready]) { opacity: 0; }
[data-canvas-viewport][data-space],
[data-canvas-viewport][data-space] * { cursor: grab !important; }
[data-canvas-viewport][data-panning],
[data-canvas-viewport][data-panning] * { cursor: grabbing !important; user-select: none !important; -webkit-user-select: none !important; }
`

export interface CanvasProps {
  /** From useCanvasController(). Optional: a private controller is created if omitted. */
  controller?: CanvasController
  children: ReactNode
  /** Applied to the viewport. The viewport fills its parent's height (`h-full` by default via your class). */
  className?: string
  style?: CSSProperties
  /** Rows of frames wrap beyond this width (board px). Default 1440. */
  maxRowWidth?: number
  /** Padding around content when fitting (screen px). Default 64. */
  fitPadding?: number
  "aria-label"?: string
}

export function Canvas({
  controller,
  children,
  className,
  style,
  maxRowWidth = 1440,
  fitPadding = 64,
  "aria-label": ariaLabel = "Design canvas",
}: CanvasProps) {
  const fallback = useCanvasController()
  const engine = (controller ?? fallback)._engine
  const mode: CanvasLayoutMode = useMediaQuery(LIST_QUERY) ? "list" : "canvas"
  const viewportRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    engine.fitPadding = fitPadding
  }, [engine, fitPadding])

  useIsomorphicLayoutEffect(() => {
    engine.attach(viewportRef.current!, boardRef.current!)
    return () => engine.detach()
  }, [engine])

  useIsomorphicLayoutEffect(() => {
    engine.setMode(mode)
  }, [engine, mode])

  const isCanvas = mode === "canvas"

  return (
    <CanvasLayoutContext.Provider value={mode}>
      <style href="showcase-canvas" precedence="default">
        {CANVAS_CSS}
      </style>
      <div
        ref={viewportRef}
        data-canvas-viewport=""
        data-mode={mode}
        role="region"
        aria-roledescription="canvas"
        aria-label={
          isCanvas
            ? `${ariaLabel}. Drag the background or scroll to pan, Ctrl or Cmd plus scroll to zoom, plus and minus keys to zoom, 0 for 100%, 1 to fit.`
            : ariaLabel
        }
        tabIndex={isCanvas ? 0 : undefined}
        className={cn(
          "relative isolate bg-muted outline-none",
          isCanvas
            ? "touch-none overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
            : "overflow-x-hidden overflow-y-auto",
          className,
        )}
        style={style}
      >
        <div
          ref={boardRef}
          data-canvas-board=""
          className={
            isCanvas
              ? "absolute left-0 top-0 flex w-max origin-top-left flex-col gap-28"
              : "flex flex-col gap-14 px-4 pb-16 pt-8"
          }
          style={{ "--canvas-row-max": `${maxRowWidth}px` } as CSSProperties}
        >
          {children}
        </div>
      </div>
    </CanvasLayoutContext.Provider>
  )
}
