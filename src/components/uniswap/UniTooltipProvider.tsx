'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

const HasProvider = React.createContext(false)

/**
 * One tooltip provider per Uniswap scope, so Radix's skip-delay works across
 * tooltips: after one opens, moving to the next opens it instantly (and
 * UniTooltip skips its animation for those "instant-open" tooltips).
 */
export function UniTooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={100} skipDelayDuration={300}>
      <HasProvider.Provider value>{children}</HasProvider.Provider>
    </TooltipPrimitive.Provider>
  )
}

/** Whether a UniTooltipProvider is above; UniTooltip adds its own when used outside a scope. */
export function useHasUniTooltipProvider() {
  return React.useContext(HasProvider)
}
