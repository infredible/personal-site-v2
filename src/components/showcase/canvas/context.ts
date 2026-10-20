"use client"

import { createContext, useContext } from "react"

export type CanvasLayoutMode = "canvas" | "list"

export const CanvasLayoutContext = createContext<CanvasLayoutMode>("canvas")

export const useCanvasLayout = () => useContext(CanvasLayoutContext)
