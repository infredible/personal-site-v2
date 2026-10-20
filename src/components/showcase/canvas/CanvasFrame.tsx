"use client"

import { useId, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useCanvasLayout } from "./context"

export interface CanvasFrameProps {
  /** DOM id, for deep links (`#id`) and controller.reveal(id). */
  id?: string
  title: ReactNode
  /** One-line muted annotation under the title. */
  note?: ReactNode
  /** Force the body width (px number or CSS length). Default: the content's intrinsic width. */
  width?: number | string
  className?: string
  children: ReactNode
}

/**
 * A labeled frame on the canvas. The body is rendered as-is (no background or
 * padding) and stays fully interactive; dragging inside it never pans.
 */
export function CanvasFrame({ id, title, note, width, className, children }: CanvasFrameProps) {
  const mode = useCanvasLayout()
  const autoId = useId()
  const headingId = `${id ?? autoId}-title`
  const isCanvas = mode === "canvas"

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={headingId}
      data-canvas-frame=""
      className={cn("flex flex-col gap-2.5", isCanvas ? "min-w-40 shrink-0" : "w-full min-w-0", className)}
    >
      {/* w-0 + min-w-full: the label takes the frame's width without widening it. */}
      <div className={cn("flex select-none flex-col gap-0.5", isCanvas && "w-0 min-w-full")}>
        <h3 id={headingId} className="text-[13px] leading-[18px] font-medium text-foreground/75">
          {title}
        </h3>
        {note ? <p className="text-xs leading-4 text-pretty text-muted-foreground">{note}</p> : null}
      </div>
      <div
        data-canvas-frame-body=""
        className={isCanvas ? "self-start" : "max-w-full self-start overflow-x-auto"}
        style={width !== undefined ? ({ width, maxWidth: isCanvas ? undefined : "100%" } as CSSProperties) : undefined}
      >
        {children}
      </div>
    </div>
  )
}
