'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { TextSkeleton } from '../../Skeleton'
import { ArrowDown, X } from '../../icons'
import { ChainLogo } from '../../swap/overlays/NetworkMenu'
import type { Chain } from '../../swap/types'
import type { ExploreStatus, SortDirection } from '../types'

/*
 * The row between the filters and the table, shown only while something
 * differs from the tab's default (no production equivalent: production keeps
 * its filters in the controls alone). Left: the result count and a removable
 * chip per filter (network, search). Right: a view chip when the sort or the
 * period isn't the default, and Reset, which restores all of it.
 *
 * Chips are 30px pills (surface2, surface3 border, buttonLabel4) with a ✕;
 * each removes one thing. The row grows in and out (height + opacity, 150ms)
 * and chips fade; reduced motion skips both. When a focused chip goes, focus
 * moves to the next one, or to `onEmpty` (the search input) when the row
 * goes. At narrow widths the chips wrap within the row.
 *
 * The count follows the skeleton rule: a text skeleton on first load, the old
 * number pulsing during a refetch. It isn't live; ExploreTables announces it.
 */

/** The sort/period chip: what the table is ordered by, when that isn't the default. */
export interface ExploreViewChip {
  /** e.g. "Sorted by FDV", "1W volume" */
  label: string
  /** Arrow after the label (sorted views) */
  direction?: SortDirection
  /** After the arrow, e.g. " · 1W volume" when the period isn't the sort's */
  suffix?: string
  /** Screen-reader name, e.g. "Sorted by FDV, ascending" */
  description: string
}

export interface ExploreActiveFiltersProps {
  noun: 'tokens' | 'pools'
  /** Rows after filtering */
  count: number
  status: ExploreStatus
  /** One network selected */
  chain?: Chain
  /** Search text (trimmed empty: no chip) */
  query?: string
  view?: ExploreViewChip
  onRemoveChain?: () => void
  onRemoveQuery?: () => void
  onResetView?: () => void
  onReset?: () => void
  /** Focus moves here when the row goes while focus is in it */
  onEmpty?: () => void
  className?: string
}

type ChipKey = 'chain' | 'query' | 'view' | 'reset'

const chipClassName = cn(
  'inline-flex h-[30px] max-w-full min-w-0 cursor-pointer items-center gap-uni-6 rounded-uni-full border border-surface3 bg-surface2 pr-uni-8 pl-uni-12',
  'text-buttonLabel4 whitespace-nowrap text-neutral1 outline-none select-none',
  'transition-colors duration-100 ease-in-out hover:bg-surface3',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1',
)

export function ExploreActiveFilters({
  noun,
  count,
  status,
  chain,
  query = '',
  view,
  onRemoveChain,
  onRemoveQuery,
  onResetView,
  onReset,
  onEmpty,
  className,
}: ExploreActiveFiltersProps) {
  const reduceMotion = useReducedMotion() ?? false
  const rowRef = React.useRef<HTMLDivElement>(null)
  const pendingFocus = React.useRef<ChipKey[] | null>(null)
  const trimmed = query.trim()

  const keys: ChipKey[] = []
  if (chain) keys.push('chain')
  if (trimmed) keys.push('query')
  if (view) keys.push('view')
  const open = keys.length > 0
  if (open) keys.push('reset')

  // After a removal: the next chip still here, else the previous, else hand focus back
  React.useLayoutEffect(() => {
    const candidates = pendingFocus.current
    if (!candidates) return
    pendingFocus.current = null
    const next = candidates.find((key) => keys.includes(key))
    const el = next && rowRef.current?.querySelector<HTMLElement>(`[data-chip="${next}"]`)
    if (el) el.focus({ preventScroll: true })
    else onEmpty?.()
  })

  const remove = (key: ChipKey, action?: () => void) => () => {
    if (rowRef.current?.contains(document.activeElement)) {
      const index = keys.indexOf(key)
      pendingFocus.current = [...keys.slice(index + 1), ...keys.slice(0, index).reverse()].filter((k) => k !== key)
    }
    action?.()
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.15, ease: [0.23, 1, 0.32, 1] as const }
  const chipMotion = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition,
  }
  const singular = noun === 'tokens' ? 'token' : 'pool'

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="row"
          ref={rowRef}
          role="group"
          aria-label="Active filters"
          data-slot="explore-active-filters"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
          className={cn('overflow-hidden', className)}
        >
          <div className="flex flex-wrap items-center gap-uni-8 px-uni-2 pt-uni-4 pb-uni-8">
            <span
              className={cn(
                'mr-uni-4 text-body3 whitespace-nowrap text-neutral2 tabular-nums',
                status === 'refetching' && 'animate-uni-refetch-pulse motion-reduce:animate-none motion-reduce:opacity-60',
              )}
            >
              {status === 'loading' || status === 'error' ? (
                <TextSkeleton placeholder={`00 ${noun}`} shimmer={status === 'loading'} className="text-body3" />
              ) : (
                `${count} ${count === 1 ? singular : noun}`
              )}
            </span>
            <AnimatePresence initial={false} mode="popLayout">
              {chain && (
                <motion.button
                  key={`chain-${chain.id}`}
                  type="button"
                  data-chip="chain"
                  aria-label={`Remove network filter: ${chain.name}`}
                  onClick={remove('chain', onRemoveChain)}
                  className={cn(chipClassName, 'pl-uni-8')}
                  {...chipMotion}
                >
                  <ChainLogo chain={chain} size={16} />
                  <span className="truncate">{chain.name}</span>
                  <X aria-hidden className="size-uni-12 shrink-0 text-neutral2" />
                </motion.button>
              )}
              {trimmed && (
                <motion.button
                  key="query"
                  type="button"
                  data-chip="query"
                  aria-label={`Remove search: ${trimmed}`}
                  onClick={remove('query', onRemoveQuery)}
                  className={cn(chipClassName, 'max-w-[200px]')}
                  {...chipMotion}
                >
                  <span className="truncate">“{trimmed}”</span>
                  <X aria-hidden className="size-uni-12 shrink-0 text-neutral2" />
                </motion.button>
              )}
            </AnimatePresence>
            <span className="ml-auto flex items-center gap-uni-8">
              <AnimatePresence initial={false} mode="popLayout">
                {view && (
                  <motion.button
                    key="view"
                    type="button"
                    data-chip="view"
                    aria-label={`Reset order: ${view.description}`}
                    onClick={remove('view', onResetView)}
                    className={chipClassName}
                    {...chipMotion}
                  >
                    <span className="truncate">{view.label}</span>
                    {view.direction && (
                      <ArrowDown
                        aria-hidden
                        className={cn('-mx-uni-2 size-uni-12 shrink-0 text-neutral2', view.direction === 'asc' && 'rotate-180')}
                      />
                    )}
                    {view.suffix && <span className="truncate">{view.suffix}</span>}
                    <X aria-hidden className="size-uni-12 shrink-0 text-neutral2" />
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                type="button"
                data-chip="reset"
                onClick={remove('reset', onReset)}
                className={cn(
                  'h-[30px] cursor-pointer rounded-uni-8 px-uni-6 text-buttonLabel4 whitespace-nowrap text-accent1 outline-none',
                  'transition-opacity duration-100 ease-in-out hover:opacity-70',
                  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent1',
                )}
              >
                Reset
              </button>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
