'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface UniswapScopeProps {
  fontClassName: string
  children: React.ReactNode
}

/**
 * Applies the `.uniswap` token scope to the showcase.
 *
 * The wrapper div covers server-rendered content. Radix portals (popovers,
 * tooltips, dialogs) render into document.body, outside the wrapper, so the
 * scope is also added to <body> while a showcase page is mounted.
 */
export function UniswapScope({ fontClassName, children }: UniswapScopeProps) {
  useEffect(() => {
    const classes = ['uniswap', fontClassName]
    document.body.classList.add(...classes)
    return () => document.body.classList.remove(...classes)
  }, [fontClassName])

  return (
    <div className={cn('uniswap min-h-dvh', fontClassName)}>
      {children}
    </div>
  )
}
