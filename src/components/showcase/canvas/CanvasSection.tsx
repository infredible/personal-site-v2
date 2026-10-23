"use client"

import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useCanvasLayout } from "./context"

export interface CanvasSectionProps {
  /** DOM id, for deep links (`#id`) and controller.reveal(id). */
  id?: string
  title: ReactNode
  description?: ReactNode
  /** Wrap frames onto new rows past the canvas' maxRowWidth (default), or keep one row. */
  wrap?: boolean
  /** Lay frames out in a row (default) or stack them in a column, e.g. an exploded view. */
  direction?: "row" | "column"
  className?: string
  children: ReactNode
}

export function CanvasSection({
  id,
  title,
  description,
  wrap = true,
  direction = "row",
  className,
  children,
}: CanvasSectionProps) {
  const mode = useCanvasLayout()
  const autoId = useId()
  const headingId = `${id ?? autoId}-title`

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-canvas-section=""
      // A column on the canvas shrinks to its stack, so revealing it zooms to the frames, not the board's width
      className={cn("flex flex-col gap-8", mode === "canvas" && direction === "column" && "w-fit", className)}
    >
      <header className="flex max-w-2xl select-none flex-col gap-1.5">
        <h2 id={headingId} className="text-2xl leading-tight font-medium tracking-tight text-foreground">
          {title}
        </h2>
        {description ? <p className="text-sm text-pretty text-muted-foreground">{description}</p> : null}
      </header>
      <div
        className={
          mode !== "canvas"
            ? "flex flex-col gap-10"
            : direction === "column"
              ? "flex flex-col items-start gap-8"
              : cn("flex items-start gap-x-16 gap-y-14", wrap ? "max-w-[var(--canvas-row-max)] flex-wrap" : "flex-nowrap")
        }
      >
        {children}
      </div>
    </section>
  )
}
