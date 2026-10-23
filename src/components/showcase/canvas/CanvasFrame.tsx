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
  /** Label above the body (default) or beside it on the left (on the canvas only). */
  labelPlacement?: "top" | "side"
  className?: string
  children: ReactNode
}

/**
 * A labeled frame on the canvas. The body is rendered as-is (no background or
 * padding) and stays fully interactive; dragging inside it never pans.
 */
export function CanvasFrame({ id, title, note, width, labelPlacement = "top", className, children }: CanvasFrameProps) {
  const mode = useCanvasLayout()
  const autoId = useId()
  const headingId = `${id ?? autoId}-title`
  const isCanvas = mode === "canvas"
  const side = isCanvas && labelPlacement === "side"

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={headingId}
      data-canvas-frame=""
      className={cn(
        side ? "flex flex-row items-start gap-8" : "flex flex-col gap-2.5",
        isCanvas ? "min-w-40 shrink-0" : "w-full min-w-0",
        className,
      )}
    >
      {/*
        w-0 + min-w-full: the label takes the frame's width without widening it.
        On the canvas the label has a fixed two-line height (title + one note line,
        truncated with the full text on hover), so frame bodies in a row share a
        top edge whether or not a frame has a note.
      */}
      <div
        data-canvas-frame-label=""
        className={cn(
          "flex select-none flex-col gap-0.5",
          side ? "w-40 shrink-0 pt-3 text-right" : isCanvas && "h-9 w-0 min-w-full",
        )}
      >
        <h3
          id={headingId}
          className={cn("text-[13px] leading-[18px] font-medium text-foreground/75", isCanvas && !side && "truncate")}
        >
          {title}
        </h3>
        {note ? (
          <p
            title={isCanvas && !side && typeof note === "string" ? note : undefined}
            className={cn("text-xs leading-4 text-muted-foreground", isCanvas && !side ? "truncate" : "text-pretty")}
          >
            {note}
          </p>
        ) : null}
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
