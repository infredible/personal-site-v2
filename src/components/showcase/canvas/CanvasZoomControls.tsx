"use client"

import { Minus, Plus } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { useCanvasState, type CanvasController } from "./useCanvasController"

export interface CanvasZoomControlsProps {
  controller: CanvasController
  className?: string
}

function ControlButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md text-muted-foreground outline-none select-none",
        "transition-colors duration-150 hover:bg-accent hover:text-accent-foreground active:bg-accent/70",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Zoom out · 100% (click: reset) · zoom in · Fit. Re-renders on zoom changes
 * without re-rendering the page. Hidden below 768px, where the canvas falls
 * back to a stacked list.
 */
export function CanvasZoomControls({ controller, className }: CanvasZoomControlsProps) {
  const { zoom, mode } = useCanvasState(controller)
  const disabled = mode !== "canvas"
  const pct = Math.round(zoom * 100)

  return (
    <div role="group" aria-label="Canvas zoom" className={cn("inline-flex items-center gap-0.5 max-md:hidden", className)}>
      <ControlButton
        className="w-8"
        aria-label="Zoom out"
        title="Zoom out (−)"
        disabled={disabled || zoom <= controller.minZoom + 1e-6}
        onClick={() => controller.zoomOut()}
      >
        <Minus className="size-4" aria-hidden />
      </ControlButton>
      <ControlButton
        className="min-w-[3.25rem] px-1.5 text-xs font-medium tabular-nums text-foreground"
        aria-label={`Zoom ${pct}%. Reset to 100%`}
        title="Reset to 100% (0)"
        disabled={disabled}
        onClick={() => controller.reset()}
      >
        {pct}%
      </ControlButton>
      <ControlButton
        className="w-8"
        aria-label="Zoom in"
        title="Zoom in (+)"
        disabled={disabled || zoom >= controller.maxZoom - 1e-6}
        onClick={() => controller.zoomIn()}
      >
        <Plus className="size-4" aria-hidden />
      </ControlButton>
      <ControlButton
        className="px-2.5 text-xs font-medium"
        aria-label="Zoom to fit"
        title="Zoom to fit (1)"
        disabled={disabled}
        onClick={() => controller.fit()}
      >
        Fit
      </ControlButton>
    </div>
  )
}
