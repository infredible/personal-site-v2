'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Search, X } from '../../icons'
import { UniMenu, UniMenuContent, UniMenuItem, UniMenuTrigger } from '../../UniMenu'
import { NetworkMenu } from '../../swap/overlays/NetworkMenu'
import type { Chain } from '../../swap/types'
import { EXPLORE_NETWORKS, exploreNetworkCounts } from '../filters'
import type { ExploreChain, ExploreTab, ExploreTimePeriod } from '../types'

/*
 * The Explore filter controls, right of the tabs (production:
 * VolumeTimeFrameSelector, TableNetworkFilter, SearchBar).
 *
 * - Time period (Tokens only; it changes the Volume column alone): a 40px
 *   dropdown, options "1H volume" … with an accent1 check on the selected one.
 *   Production also offers "All time" (the mock data has no all-time volume)
 *   and shortens the trigger to "1D" under 1024px; here it keeps "volume", so
 *   it says what it changes.
 * - Network: the token selector's NetworkMenu (searchable list, inline so it
 *   follows forced themes), restyled to the 40px control. "All networks" by
 *   default; the label drops under 480px.
 * - Search: production's ExpandableSearchInput. Collapsed it's a 44 × 40
 *   icon; focus expands it to 200px with an accent1 border; it stays open
 *   while it holds text and has a round clear button. Escape clears it (then
 *   blurs). Production overlays the other filters with it on phones; here it
 *   takes the remaining width instead. Filtering is instant (production
 *   debounces 300ms and refetches).
 */

export const EXPLORE_TIME_PERIODS: ExploreTimePeriod[] = ['1H', '1D', '1W', '1M', '1Y']

const control = cn(
  'flex h-uni-40 shrink-0 cursor-pointer items-center gap-uni-6 rounded-uni-12 border border-surface3 bg-surface1 px-uni-12',
  'text-buttonLabel3 text-neutral1 outline-none select-none hover:bg-surface2 data-[state=open]:bg-surface2',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1',
)

/** Theme forced by the nearest <UniswapScope theme>, so portal content (the menu) can match it. */
function useForcedTheme(ref: React.RefObject<HTMLElement | null>) {
  const [theme, setTheme] = React.useState<string | undefined>()
  const read = React.useCallback(() => {
    setTheme(ref.current?.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined)
  }, [ref])
  return [theme, read] as const
}

export function TimePeriodMenu({
  value,
  onValueChange,
  className,
}: {
  value: ExploreTimePeriod
  onValueChange: (period: ExploreTimePeriod) => void
  className?: string
}) {
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [theme, readTheme] = useForcedTheme(triggerRef)
  return (
    <UniMenu modal={false} onOpenChange={(open) => open && readTheme()}>
      <UniMenuTrigger asChild>
        <button ref={triggerRef} type="button" aria-label={`Volume period: ${value}`} className={cn(control, className)}>
          {value} volume
          <ChevronDown className="size-uni-16 text-neutral2" />
        </button>
      </UniMenuTrigger>
      <UniMenuContent data-theme={theme} align="end" className="max-w-[min(320px,calc(100vw-32px))]">
        {EXPLORE_TIME_PERIODS.map((period) => (
          <UniMenuItem
            key={period}
            role="menuitemradio"
            aria-checked={period === value}
            onSelect={() => onValueChange(period)}
          >
            <span className="flex-1">{period} volume</span>
            {period === value && <Check className="size-uni-16 text-accent1" />}
          </UniMenuItem>
        ))}
      </UniMenuContent>
    </UniMenu>
  )
}

export interface ExploreSearchProps {
  value: string
  onValueChange: (query: string) => void
  placeholder: string
  inputRef?: React.Ref<HTMLInputElement>
  className?: string
}

export function ExploreSearch({ value, onValueChange, placeholder, inputRef, className }: ExploreSearchProps) {
  const [focused, setFocused] = React.useState(false)
  const localRef = React.useRef<HTMLInputElement>(null)
  const expanded = focused || value !== ''

  const setRefs = (el: HTMLInputElement | null) => {
    localRef.current = el
    if (typeof inputRef === 'function') inputRef(el)
    else if (inputRef) inputRef.current = el
  }

  return (
    <div
      role="search"
      className={cn(
        'relative h-uni-40 shrink-0 transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
        expanded ? 'w-[200px] @max-[640px]:w-auto @max-[640px]:min-w-[120px] @max-[640px]:flex-1' : 'w-[44px]',
        className,
      )}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-uni-12 size-uni-20 -translate-y-1/2 text-neutral1"
      />
      <input
        ref={setRefs}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          e.preventDefault()
          if (value) onValueChange('')
          else e.currentTarget.blur()
        }}
        aria-label={placeholder}
        aria-keyshortcuts="/"
        placeholder={expanded ? placeholder : ''}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'h-full w-full min-w-0 rounded-uni-12 border bg-surface1 pl-[40px] text-body2 text-neutral1 caret-accent1 outline-none',
          'placeholder:text-neutral3 [&::-webkit-search-cancel-button]:appearance-none',
          focused ? 'border-accent1' : 'cursor-pointer border-surface3 hover:border-surface3Hovered',
          value ? 'pr-[30px]' : 'pr-uni-8',
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onValueChange('')
            localRef.current?.focus()
          }}
          className={cn(
            'absolute top-1/2 right-uni-6 flex size-uni-20 -translate-y-1/2 cursor-pointer items-center justify-center rounded-uni-full',
            'bg-surface3 text-neutral1 outline-none hover:bg-surface3Hovered focus-visible:outline-2 focus-visible:outline-accent1',
          )}
        >
          <X className="size-uni-12" />
        </button>
      )}
    </div>
  )
}

export interface ExploreFilterBarProps {
  tab: ExploreTab
  period: ExploreTimePeriod
  onPeriodChange: (period: ExploreTimePeriod) => void
  chain: ExploreChain
  onChainChange: (chain: ExploreChain) => void
  query: string
  onQueryChange: (query: string) => void
  /** Networks offered; defaults to the ones with Explore data */
  chains?: Chain[]
  /** Rows per network, shown in the menu; defaults to the mock data's counts for the tab */
  counts?: Record<ExploreChain, number>
  /** The search input, e.g. for a "/" shortcut */
  searchRef?: React.Ref<HTMLInputElement>
  /** Open the network menu on mount (canvas frames) */
  defaultNetworkMenuOpen?: boolean
  className?: string
}

export function ExploreFilterBar({
  tab,
  period,
  onPeriodChange,
  chain,
  onChainChange,
  query,
  onQueryChange,
  chains = EXPLORE_NETWORKS,
  counts,
  searchRef,
  defaultNetworkMenuOpen = false,
  className,
}: ExploreFilterBarProps) {
  const menuId = React.useId()
  const [menu, setMenu] = React.useState({ open: defaultNetworkMenuOpen, animate: false, highlighted: chain })
  const networkCounts = React.useMemo(() => counts ?? exploreNetworkCounts(tab), [counts, tab])
  const rootRef = React.useRef<HTMLDivElement>(null)

  return (
    <div ref={rootRef} className={cn('flex min-w-0 items-center gap-uni-8 @max-[640px]:w-full', className)}>
      {tab === 'tokens' && <TimePeriodMenu value={period} onValueChange={onPeriodChange} />}
      <NetworkMenu
        chains={chains}
        value={chain}
        onChange={onChainChange}
        open={menu.open}
        onOpenChange={(open, via) => setMenu((m) => ({ ...m, open, animate: via === 'pointer', highlighted: chain }))}
        highlighted={menu.highlighted}
        onHighlight={(highlighted) => setMenu((m) => ({ ...m, highlighted }))}
        counts={networkCounts}
        animate={menu.animate}
        menuId={menuId}
        onDismiss={() => rootRef.current?.querySelector<HTMLElement>('[aria-haspopup="dialog"]')?.focus()}
        triggerClassName="h-uni-40 gap-uni-6 rounded-uni-12 bg-surface1 px-uni-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
      />
      <ExploreSearch
        value={query}
        onValueChange={onQueryChange}
        placeholder={tab === 'tokens' ? 'Filter tokens' : 'Filter pools'}
        inputRef={searchRef}
      />
    </div>
  )
}
