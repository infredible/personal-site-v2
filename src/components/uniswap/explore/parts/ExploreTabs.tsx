'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ExploreTab } from '../types'

/*
 * The Explore tab row. Production's tabs are <h3> elements with click handlers
 * (HeaderTab): heading3 at 24/28.8, neutral2 inactive and neutral1 active,
 * color alone marks the active tab, hover opacity 0.8, press 0.6, 24px apart
 * (16 at md), 20px type at md and 16px at sm.
 *
 * Same look, as a real tablist: buttons with role="tab", aria-selected, a
 * roving tabindex, ←/→ (and Home/End) to move between tabs, which activates
 * them (switching is instant here). Only Tokens and Pools are recreated.
 * Sizes follow the nearest container (ExploreTables is one).
 */

export const EXPLORE_TABS: { id: ExploreTab; label: string }[] = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'pools', label: 'Pools' },
]

export interface ExploreTabsProps {
  value: ExploreTab
  onValueChange: (tab: ExploreTab) => void
  tabs?: { id: ExploreTab; label: string }[]
  /** Prefix for tab ids (`${idBase}-tab-${id}`) */
  idBase?: string
  /** The tabpanel's id, for aria-controls */
  panelId?: string
  className?: string
}

export function exploreTabId(idBase: string, tab: ExploreTab) {
  return `${idBase}-tab-${tab}`
}

export function ExploreTabs({ value, onValueChange, tabs = EXPLORE_TABS, idBase, panelId, className }: ExploreTabsProps) {
  const fallbackId = React.useId()
  const base = idBase ?? fallbackId
  const listRef = React.useRef<HTMLDivElement>(null)

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === value)
    let next: number | undefined
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next === undefined) return
    e.preventDefault()
    const tab = tabs[next]
    onValueChange(tab.id)
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(exploreTabId(base, tab.id))}`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Explore"
      onKeyDown={onKeyDown}
      className={cn('flex flex-wrap items-center gap-uni-24 @max-[640px]:gap-uni-16', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={exploreTabId(base, tab.id)}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(tab.id)}
            className={cn(
              'cursor-pointer rounded-uni-4 text-[24px] leading-[28.8px] [font-weight:485] whitespace-nowrap outline-none select-none',
              '@max-[640px]:text-[20px] @max-[640px]:leading-[24px] @max-[450px]:text-[16px] @max-[450px]:leading-[20px]',
              'transition-[opacity,color] duration-100 ease-out active:opacity-60',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1',
              selected ? 'text-neutral1' : 'text-neutral2 hover:opacity-80',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
