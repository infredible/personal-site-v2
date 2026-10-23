'use client'

import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { cn } from '@/lib/utils'
import { ArrowsLeftRight, CheckCircleFilled, Coins, Search, X } from '../../icons'
import { BlockSkeleton, Shimmer, TextSkeleton } from '../../Skeleton'
import { formatTokenAmount, formatUsd } from '../format'
import { CHAINS, COMMON_TOKENS, TOKEN_LIST } from '../tokens'
import type { Chain, Token } from '../types'
import { ChainLogo, NetworkMenu } from './NetworkMenu'
import { TokenLogo } from './shared'
import {
  CATEGORY_FILTERS,
  buildSections,
  emptyStateTitle,
  filterTokens,
  isOwned,
  searchTokens,
  type Section,
  type TokenSelectorCategory,
  type TokenSelectorChain,
} from './tokenSelectorFilters'

/*
 * Token selector as a command palette (Raycast / Linear ⌘K), in Uniswap's
 * visual language. Rows, sections and the quick-pick chips follow Uniswap's
 * token selector (packages/uniswap/src/components/TokenSelector); the layout
 * is a palette: search as the header, category chips, results, and a footer
 * of keyboard hints.
 *
 * Keyboard (focus stays in the search field the whole time):
 *   type        search symbol and name (exact symbol first)
 *   ↑ ↓         move the highlight (instant, no animation); ⌘↑/⌘↓ jump to ends
 *   ↵           select the highlighted token
 *   ⇥ / ⇧⇥      next / previous category
 *   ⌘K / Ctrl+K open the network menu (↑↓ ↵ inside it, esc closes it)
 *   esc         clear the search; when empty, close (calls onClose)
 *
 * Presentational and inline: place it in <PaletteSurface> (canvas frames) or
 * <UniPaletteContent> (the real dialog). It fills its container's height.
 */

export interface TokenSelectorPanelProps {
  /** Tokens to list. Defaults to the mock TOKEN_LIST. */
  tokens?: Token[]
  /** Whole-token balances keyed by symbol; tokens with a balance > 0 go in "Your tokens". */
  balances?: Record<string, number>
  /** Quick-pick chips above the list (no search, "All" category). Defaults to COMMON_TOKENS; pass [] to hide. */
  commonTokens?: Token[]
  /** Networks for the network filter. Defaults to CHAINS. */
  chains?: Chain[]
  /** Token already chosen for this field: a check next to its name. */
  selectedSymbol?: string
  /** Token chosen for the opposite field. See `otherAction`. */
  otherSymbol?: string
  /**
   * What the opposite field's token does: "disable" (default) dims it and makes
   * it unselectable; "switch" keeps it selectable with a "Switch" tag, for
   * consumers that flip the pair when it's picked (as Uniswap does).
   */
  otherAction?: 'disable' | 'switch'
  onSelect?: (token: Token) => void
  /** Called on esc with an empty search. Without it, esc only clears the search. */
  onClose?: () => void
  /** Controlled search text. Leave undefined for uncontrolled (see defaultQuery). */
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  /** Controlled category filter (default "all"). */
  category?: TokenSelectorCategory
  defaultCategory?: TokenSelectorCategory
  onCategoryChange?: (category: TokenSelectorCategory) => void
  /** Controlled network filter (default "all"). */
  chain?: TokenSelectorChain
  defaultChain?: TokenSelectorChain
  onChainChange?: (chain: TokenSelectorChain) => void
  autoFocus?: boolean
  /** List still loading: skeleton rows in place of the sections (search and filters stay usable). */
  loading?: boolean
  /** Accessible name for the palette. */
  label?: string
  className?: string
  /** Opens with the network menu showing (canvas frames). */
  defaultNetworkMenuOpen?: boolean
  /**
   * Render only these regions (default: all), for showcase anatomy frames. The
   * others stay mounted but hidden, so state and keyboard handling don't change.
   */
  parts?: TokenSelectorPartId[]
  /**
   * Marks each shown region for the showcase's exploded-view transition: "part"
   * adds `data-explode="<id>"` (the assembled palette), "target" adds
   * `data-explode-target="<id>"` (its anatomy frames). Off by default.
   */
  explode?: 'part' | 'target'
}

/** The palette's top-level regions, top to bottom. */
export type TokenSelectorPartId = 'search' | 'filters' | 'quick-picks' | 'list' | 'footer'

export const TOKEN_SELECTOR_PARTS: { id: TokenSelectorPartId; label: string }[] = [
  { id: 'search', label: 'Search header' },
  { id: 'filters', label: 'Category filters' },
  { id: 'quick-picks', label: 'Quick picks' },
  { id: 'list', label: 'Token list' },
  { id: 'footer', label: 'Footer' },
]

export type { TokenSelectorCategory, TokenSelectorChain }

/** Controlled-or-uncontrolled state, the usual Radix pattern. */
function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const current = value === undefined ? uncontrolled : value
  const set = React.useCallback(
    (next: T) => {
      if (value === undefined) setUncontrolled(next)
      onChange?.(next)
    },
    [value, onChange],
  )
  return [current, set] as const
}

const subscribeNoop = () => () => {}
/** ⌘ on Apple platforms, Ctrl elsewhere. Server render assumes ⌘; corrected right after hydration. */
function useIsMac() {
  return React.useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => true,
  )
}

/** Horizontal chip rows: no scrollbar, and a short fade at the right edge where chips run off it. */
const fadeRightClassName =
  '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)]'

/** Prices: 2 decimals from $1, 4 significant digits below (PEPE is $0.00001842). */
function formatPrice(value: number) {
  if (value >= 1) return formatUsd(value)
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 4 })
}

export function TokenSelectorPanel({
  tokens = TOKEN_LIST,
  balances = {},
  commonTokens = COMMON_TOKENS,
  chains = CHAINS,
  selectedSymbol,
  otherSymbol,
  otherAction = 'disable',
  onSelect,
  onClose,
  query: queryProp,
  defaultQuery = '',
  onQueryChange,
  category: categoryProp,
  defaultCategory = 'all',
  onCategoryChange,
  chain: chainProp,
  defaultChain = 'all',
  onChainChange,
  autoFocus,
  loading = false,
  label = 'Select a token',
  className,
  defaultNetworkMenuOpen = false,
  parts,
  explode,
}: TokenSelectorPanelProps) {
  const show = (id: TokenSelectorPartId) => !parts || parts.includes(id)
  /** Props for a top-level region: hidden when left out of `parts`, else its exploded-view marker. */
  const region = (id: TokenSelectorPartId) =>
    !show(id)
      ? { hidden: true }
      : explode === 'part'
        ? { 'data-explode': id }
        : explode === 'target'
          ? { 'data-explode-target': id }
          : {}
  const [query, setQueryState] = useControllable(queryProp, defaultQuery, onQueryChange)
  const [category, setCategoryState] = useControllable(categoryProp, defaultCategory, onCategoryChange)
  const [chain, setChainState] = useControllable(chainProp, defaultChain, onChainChange)
  const [active, setActive] = React.useState('')
  const [menu, setMenu] = React.useState<{ open: boolean; animate: boolean; highlighted: TokenSelectorChain }>({
    open: defaultNetworkMenuOpen,
    animate: false,
    highlighted: chainProp ?? defaultChain,
  })
  const isMac = useIsMac()
  const menuId = React.useId()

  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const chipsRef = React.useRef<HTMLDivElement>(null)
  const pointerType = React.useRef<string>('mouse')

  /*
   * cmdk keeps the highlighted row visible with element.scrollIntoView(), which
   * also scrolls every ancestor: the page, the dialog, or (in a canvas frame)
   * the board, which turns that scroll into a pan. Rows get a scrollIntoView
   * that only scrolls the results list, clear of the 32px sticky heading.
   * The first row scrolls to the very top, so quick picks come back into view.
   */
  const keepRowInList = React.useCallback((row: HTMLDivElement | null) => {
    if (!row) return
    row.scrollIntoView = () => {
      const list = scrollRef.current
      if (!list) return
      const firstRow = list.querySelector('[cmdk-item]:not([aria-disabled="true"])')
      if (row === firstRow) {
        list.scrollTop = 0
        return
      }
      const box = list.getBoundingClientRect()
      const r = row.getBoundingClientRect()
      const top = box.top + 32
      const bottom = box.bottom - 8
      if (r.top < top) list.scrollTop -= top - r.top
      else if (r.bottom > bottom) list.scrollTop += r.bottom - bottom
    }
  }, [])

  // Any change to what's listed: highlight falls back to the first row, list back to the top
  const resetList = () => {
    setActive('')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }
  const setQuery = (next: string) => {
    setQueryState(next)
    resetList()
  }
  const setCategory = (next: TokenSelectorCategory) => {
    setCategoryState(next)
    resetList()
  }
  const setChain = (next: TokenSelectorChain) => {
    setChainState(next)
    resetList()
  }

  const trimmed = query.trim().toLowerCase()
  const currentChain = chains.find((c) => c.id === chain)

  const filtered = React.useMemo(
    () => filterTokens(tokens, { category, chain, balances }),
    [tokens, category, chain, balances],
  )
  const sections = React.useMemo(
    () => buildSections(filtered, trimmed, category, balances),
    [filtered, trimmed, category, balances],
  )
  const chainCounts = React.useMemo(() => {
    const pool = filterTokens(tokens, { category, chain: 'all', balances })
    const counts = { all: pool.length } as Record<TokenSelectorChain, number>
    for (const c of chains) counts[c.id] = filterTokens(pool, { category: 'all', chain: c.id, balances }).length
    return counts
  }, [tokens, category, chains, balances])

  const isUnavailable = (token: Token) => otherAction === 'disable' && token.symbol === otherSymbol
  const rowValue = (section: Section, token: Token) => `${section.id}:${token.symbol}`

  // Highlight stays on a visible, selectable row; otherwise the first one
  const selectable = sections.flatMap((s) =>
    s.tokens.filter((t) => !isUnavailable(t)).map((t) => ({ value: rowValue(s, t), token: t })),
  )
  const activeEntry = selectable.find((r) => r.value === active) ?? selectable[0]
  const activeValue = activeEntry?.value ?? ''

  const filtersActive = category !== 'all' || chain !== 'all'
  const showQuickPicks = !trimmed && category === 'all' && commonTokens.length > 0
  const quickPicks = showQuickPicks ? filterTokens(commonTokens, { category: 'all', chain, balances }) : []
  const empty = !loading && sections.length === 0

  // Empty state: what's missing, whether loosening the filters would help, and the way out
  const matchesElsewhere = empty && trimmed && filtersActive ? searchTokens(tokens, trimmed, balances).length : 0
  const emptyAction = !empty
    ? undefined
    : filtersActive
      ? {
          label: 'Clear filters',
          run: () => {
            setCategory('all')
            setChain('all')
          },
        }
      : trimmed
        ? { label: 'Clear search', run: () => setQuery('') }
        : undefined

  const cycleCategory = (step: 1 | -1) => {
    const ids = CATEGORY_FILTERS.map((c) => c.id)
    const next = ids[(ids.indexOf(category) + step + ids.length) % ids.length]
    setCategory(next)
    // Keep the chip in view in the horizontally scrolling row (no scrollIntoView: it would scroll the page too)
    requestAnimationFrame(() => {
      const row = chipsRef.current
      const chip = row?.querySelector<HTMLElement>(`[data-category="${next}"]`)
      if (!row || !chip) return
      const left = chip.offsetLeft - row.offsetLeft
      if (left < row.scrollLeft + 16) row.scrollLeft = left - 16
      else if (left + chip.offsetWidth > row.scrollLeft + row.clientWidth - 16)
        row.scrollLeft = left + chip.offsetWidth - row.clientWidth + 16
    })
  }

  const setMenuOpen = React.useCallback(
    (open: boolean, via: 'pointer' | 'keyboard' = 'pointer') =>
      setMenu((m) => ({ open, animate: via === 'pointer', highlighted: open ? chain : m.highlighted })),
    [chain],
  )

  const menuOptions: TokenSelectorChain[] = ['all', ...chains.map((c) => c.id)]

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    const mod = e.metaKey || e.ctrlKey

    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      setMenuOpen(!menu.open, 'keyboard')
      return
    }

    if (menu.open) {
      const i = menuOptions.indexOf(menu.highlighted)
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          e.preventDefault()
          const step = e.key === 'ArrowDown' ? 1 : -1
          const next = menuOptions[(i + step + menuOptions.length) % menuOptions.length]
          setMenu((m) => ({ ...m, highlighted: next }))
          return
        }
        case 'Enter':
          e.preventDefault()
          setChain(menu.highlighted)
          setMenuOpen(false)
          return
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          setMenuOpen(false)
          return
        case 'Tab':
          e.preventDefault()
          setMenuOpen(false)
          return
        default:
          // Typing goes back to the search
          setMenuOpen(false)
      }
    }

    if (e.key === 'Tab' && !mod && !e.altKey) {
      e.preventDefault()
      cycleCategory(e.shiftKey ? -1 : 1)
      return
    }

    if (e.key === 'Escape') {
      if (query) {
        e.preventDefault()
        e.stopPropagation()
        setQuery('')
      } else if (onClose) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
      return
    }

    if (e.key === 'Enter' && empty && emptyAction) {
      e.preventDefault()
      emptyAction.run()
    }
  }

  // Raycast-style: clicks on chips, rows and chrome never take focus from the search field
  // (mouse only: on touch, tapping away should still dismiss the keyboard).
  const keepSearchFocus = (e: React.MouseEvent) => {
    if (pointerType.current !== 'mouse') return
    const target = e.target as HTMLElement
    if (target === inputRef.current) return
    const scroller = scrollRef.current
    // Let the list's own scrollbar be dragged
    if (scroller && target === scroller && e.nativeEvent.offsetX >= scroller.clientWidth) return
    e.preventDefault()
    if (document.activeElement !== inputRef.current) inputRef.current?.focus()
  }

  const shortcut = isMac ? '⌘K' : 'Ctrl K'
  const escLabel = query ? 'Clear' : onClose ? 'Close' : null

  return (
    <CommandPrimitive
      shouldFilter={false}
      loop
      vimBindings={false}
      value={activeValue}
      onValueChange={setActive}
      label={label}
      data-slot="token-selector"
      // Tells <UniPaletteContent> that this content owns Escape (clear first, then onClose)
      data-palette-escape={onClose ? '' : undefined}
      onKeyDown={onKeyDown}
      onPointerDownCapture={(e) => (pointerType.current = e.pointerType)}
      onMouseDown={keepSearchFocus}
      className={cn('@container relative flex h-full min-h-0 w-full flex-col text-neutral1 outline-none', className)}
    >
      {/* Header: the search field is the palette's title bar */}
      <div {...region('search')} className="flex h-[60px] shrink-0 items-center gap-uni-12 border-b border-surface3 pr-uni-12 pl-uni-20">
        <Search className="size-uni-20 shrink-0 text-neutral2" />
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder="Search tokens"
          autoFocus={autoFocus}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-body1 text-neutral1 caret-accent1 outline-none placeholder:text-neutral3',
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
        />
        <NetworkMenu
          chains={chains}
          value={chain}
          onChange={setChain}
          open={menu.open}
          onOpenChange={setMenuOpen}
          highlighted={menu.highlighted}
          onHighlight={(highlighted) => setMenu((m) => ({ ...m, highlighted }))}
          counts={chainCounts}
          animate={menu.animate}
          menuId={menuId}
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-uni-32 shrink-0 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 outline-none hover:bg-surface2 hover:text-neutral1"
          >
            <X className="size-uni-20" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>

      {/* Category filters */}
      <div
        {...region('filters')}
        ref={chipsRef}
        role="toolbar"
        aria-label="Filter by category"
        className={cn(
          'flex shrink-0 gap-uni-4 overflow-x-auto px-uni-16 pt-uni-12 pb-uni-4',
          fadeRightClassName,
        )}
      >
        {CATEGORY_FILTERS.map((c) => {
          const on = c.id === category
          return (
            <button
              key={c.id}
              type="button"
              data-category={c.id}
              aria-pressed={on}
              onClick={() => setCategory(c.id)}
              className={cn(
                'flex h-uni-28 shrink-0 cursor-pointer items-center rounded-uni-full px-uni-12 text-buttonLabel3 whitespace-nowrap outline-none select-none',
                on ? 'bg-surface3 text-neutral1' : 'text-neutral2 hover:bg-surface2 hover:text-neutral1',
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Results */}
      <div
        hidden={!show('quick-picks') && !show('list')}
        data-slot="token-selector-results"
        ref={scrollRef}
        className={cn(
          // Keyboard scrolling is handled per row (keepRowInList), clear of the sticky headings
          'relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-uni-8 pb-uni-8',
          '[scrollbar-width:thin] [scrollbar-color:var(--uni-surface3)_transparent]',
        )}
      >
        {quickPicks.length > 0 && (
          <div
            {...region('quick-picks')}
            role="group"
            aria-label="Common tokens"
            className={cn('-mx-uni-8 flex gap-uni-6 overflow-x-auto px-uni-16 pt-uni-8 pb-uni-4', fadeRightClassName)}
          >
            {quickPicks.map((token) => {
              const unavailable = isUnavailable(token)
              const selected = token.symbol === selectedSymbol
              return (
                <button
                  key={token.symbol}
                  type="button"
                  disabled={unavailable}
                  aria-current={selected || undefined}
                  onClick={() => onSelect?.(token)}
                  className={cn(
                    'flex h-uni-32 shrink-0 cursor-pointer items-center gap-uni-6 rounded-uni-full border border-surface3 py-uni-4 pr-uni-12 pl-uni-4',
                    'text-buttonLabel3 text-neutral1 outline-none select-none hover:bg-surface2 active:scale-[0.98]',
                    'transition-[scale] duration-100 ease-out',
                    'disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:active:scale-100',
                    selected && 'border-accent1/40 bg-accent2 hover:bg-accent2Hovered',
                  )}
                >
                  <TokenLogo token={token} size={24} />
                  {token.symbol}
                </button>
              )
            })}
          </div>
        )}

        <CommandPrimitive.List {...region('list')} label="Tokens" className="outline-none">
          {loading ? (
            <PaletteListSkeleton />
          ) : empty ? (
            <EmptyState
              title={emptyStateTitle({ category, chain: currentChain, query: query.trim() })}
              hint={
                matchesElsewhere > 0
                  ? `${matchesElsewhere} ${matchesElsewhere === 1 ? 'match' : 'matches'} outside these filters`
                  : chain !== 'all' && !trimmed
                    ? 'Try another network'
                    : undefined
              }
              action={emptyAction}
            />
          ) : (
            sections.map((section) => (
              // The heading is a plain child, not cmdk's `heading`: cmdk scrolls a group's
              // heading into view itself, which would also scroll (pan) a canvas around it.
              <CommandPrimitive.Group key={section.id}>
                <SectionHeading
                  title={section.title}
                  aside={
                    section.id === 'results'
                      ? `${section.tokens.length} ${section.tokens.length === 1 ? 'token' : 'tokens'}`
                      : section.id === 'yours'
                        ? 'Balance'
                        : 'Price · 24h'
                  }
                />
                {section.tokens.map((token) => (
                  <TokenRow
                    key={token.symbol}
                    value={rowValue(section, token)}
                    token={token}
                    balance={balances[token.symbol] ?? 0}
                    owned={isOwned(token, balances)}
                    chain={currentChain}
                    selected={token.symbol === selectedSymbol}
                    unavailable={isUnavailable(token)}
                    switches={otherAction === 'switch' && token.symbol === otherSymbol}
                    onSelect={() => onSelect?.(token)}
                    rowRef={keepRowInList}
                  />
                ))}
              </CommandPrimitive.Group>
            ))
          )}
        </CommandPrimitive.List>
      </div>

      {/* Footer: keyboard hints, for pointer devices with room for them */}
      <div
        {...region('footer')}
        aria-hidden
        className={cn(
          'flex h-uni-40 shrink-0 items-center justify-between gap-uni-16 border-t border-surface3 bg-surface2 px-uni-16',
          'text-body4 text-neutral2 select-none @max-[560px]:hidden pointer-coarse:hidden',
        )}
      >
        <div className="flex items-center gap-uni-16">
          <Hint keys={['↑', '↓']}>Navigate</Hint>
          <Hint keys={['⇥']}>Category</Hint>
          <Hint keys={[shortcut]}>Network</Hint>
          {escLabel && <Hint keys={['esc']}>{escLabel}</Hint>}
        </div>
        {menu.open ? (
          <Hint keys={['↵']} trailing>
            Choose network
          </Hint>
        ) : activeEntry && !loading ? (
          <Hint keys={['↵']} trailing>
            {otherAction === 'switch' && activeEntry.token.symbol === otherSymbol ? 'Switch to' : 'Select'}{' '}
            <span className="text-neutral1">{activeEntry.token.symbol}</span>
          </Hint>
        ) : emptyAction ? (
          <Hint keys={['↵']} trailing>
            {emptyAction.label}
          </Hint>
        ) : null}
      </div>
    </CommandPrimitive>
  )
}

const keepInPlace = (row: HTMLDivElement | null) => {
  if (row) row.scrollIntoView = () => {}
}

/**
 * One token row on its own, for showcase frames of row states. `active` is
 * the keyboard highlight; hovering the row shows it too.
 */
export function TokenSelectorRowPreview({
  token,
  balance = 0,
  chain,
  active = false,
  selected = false,
  unavailable = false,
  switches = false,
  className,
}: {
  token: Token
  /** Whole-token balance: above 0 shows value and balance instead of price and 24h change. */
  balance?: number
  /** Network filter in effect: its badge on the logo. */
  chain?: Chain
  active?: boolean
  selected?: boolean
  unavailable?: boolean
  switches?: boolean
  className?: string
}) {
  // Highlight from props and hover only: cmdk's own picks (it selects the first row on mount) are ignored
  const [hovered, setHovered] = React.useState(false)
  const highlighted = (active || hovered) && !unavailable
  return (
    <CommandPrimitive
      shouldFilter={false}
      value={highlighted ? token.symbol : ''}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      label={`${token.name} row`}
      className={cn('w-full text-neutral1', className)}
    >
      <CommandPrimitive.List>
        <TokenRow
          value={token.symbol}
          token={token}
          balance={balance}
          owned={balance > 0}
          chain={chain}
          selected={selected}
          unavailable={unavailable}
          switches={switches}
          onSelect={() => {}}
          // A lone row never needs scrolling into view; cmdk's would pan a canvas around it
          rowRef={keepInPlace}
        />
      </CommandPrimitive.List>
    </CommandPrimitive>
  )
}

/* ------------------------------------------------------------------------- */

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-uni-20 min-w-uni-20 items-center justify-center rounded-uni-6 border border-surface3 bg-surface1 px-uni-4',
        'font-uni text-buttonLabel4 text-neutral2 shadow-[0_1px_0_var(--uni-surface3)]',
      )}
    >
      {children}
    </kbd>
  )
}

function Hint({ keys, trailing = false, children }: { keys: string[]; trailing?: boolean; children: React.ReactNode }) {
  const chips = (
    <span className="flex items-center gap-uni-2">
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </span>
  )
  return (
    <span className="flex items-center gap-uni-6 whitespace-nowrap">
      {!trailing && chips}
      <span>{children}</span>
      {trailing && chips}
    </span>
  )
}

/** Compact section header, sticky at the top of the results while its section is in view. */
function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 flex h-uni-32 items-center justify-between gap-uni-8 bg-surface1 px-uni-12 text-body4 text-neutral2"
    >
      <span className="flex items-center gap-uni-6">
        <Coins className="size-uni-16" />
        {title}
      </span>
      {aside && <span className="text-neutral3">{aside}</span>}
    </div>
  )
}

/** 24h change: Uniswap's delta arrow (a small filled triangle) and the absolute percentage. */
function PriceChange({ change }: { change: number }) {
  const flat = Math.abs(change) < 0.00005
  const up = change > 0
  return (
    <span
      className={cn(
        'flex items-center gap-uni-2 text-body3 tabular-nums',
        flat ? 'text-neutral2' : up ? 'text-statusSuccess' : 'text-statusCritical',
      )}
    >
      {!flat && (
        <svg viewBox="0 0 10 10" aria-hidden className={cn('size-[10px] shrink-0', !up && 'rotate-180')}>
          <path d="M5 1.5 9 8H1z" fill="currentColor" />
        </svg>
      )}
      <span className="sr-only">{flat ? '' : up ? 'Up ' : 'Down '}</span>
      {(Math.abs(change) * 100).toFixed(2)}%
    </span>
  )
}

function TokenRow({
  value,
  token,
  balance,
  owned,
  chain,
  selected,
  unavailable,
  switches,
  onSelect,
  rowRef,
}: {
  value: string
  token: Token
  balance: number
  owned: boolean
  chain?: Chain
  selected: boolean
  unavailable: boolean
  switches: boolean
  onSelect: () => void
  rowRef?: React.RefCallback<HTMLDivElement>
}) {
  return (
    <CommandPrimitive.Item
      ref={rowRef}
      value={value}
      disabled={unavailable}
      onSelect={onSelect}
      aria-current={selected || undefined}
      className={cn(
        // --row-bg lets the logo's chain badge cut its ring out of whatever the row sits on
        'group/row flex h-[56px] cursor-pointer items-center gap-uni-12 rounded-uni-12 px-uni-12 outline-none select-none',
        '[--row-bg:var(--uni-surface1)] data-[selected=true]:bg-surface2Hovered data-[selected=true]:[--row-bg:var(--uni-surface2Hovered)]',
        'data-[disabled=true]:cursor-default',
      )}
    >
      <span className={cn('relative shrink-0', unavailable && 'opacity-40')}>
        <TokenLogo token={token} size={36} />
        {chain && (
          <ChainLogo
            chain={chain}
            size={16}
            className="absolute -right-uni-2 -bottom-uni-2 ring-2 ring-(color:--row-bg)"
          />
        )}
      </span>

      <span className={cn('flex min-w-0 flex-1 flex-col', unavailable && 'opacity-40')}>
        <span className="flex min-w-0 items-center gap-uni-6">
          <span className="truncate text-body2 text-neutral1">{token.name}</span>
          {selected && (
            <>
              <CheckCircleFilled className="size-uni-16 shrink-0 text-accent1" />
              <span className="sr-only">(selected)</span>
            </>
          )}
          {switches && (
            <span className="flex shrink-0 items-center gap-uni-4 rounded-uni-full bg-surface3 px-uni-6 py-uni-1 text-buttonLabel4 text-neutral2">
              <ArrowsLeftRight className="size-uni-12" />
              Switch
            </span>
          )}
        </span>
        <span className="truncate text-body3 text-neutral2">{token.symbol}</span>
      </span>

      {/* Value column: always present and right-aligned, whatever the row's state */}
      <span className={cn('flex shrink-0 flex-col items-end text-right tabular-nums', unavailable && 'opacity-40')}>
        {owned ? (
          <>
            <span className="text-body2 text-neutral1">{formatUsd(balance * token.priceUsd)}</span>
            <span className="text-body3 text-neutral2">
              {formatTokenAmount(balance)} {token.symbol}
            </span>
          </>
        ) : (
          <>
            <span className="text-body2 text-neutral1">{formatPrice(token.priceUsd)}</span>
            {token.change24h !== undefined && <PriceChange change={token.change24h} />}
          </>
        )}
      </span>
    </CommandPrimitive.Item>
  )
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: { label: string; run: () => void }
}) {
  return (
    <div className="flex flex-col items-center gap-uni-12 px-uni-24 pt-uni-48 pb-uni-32 text-center">
      <span className="flex size-uni-48 items-center justify-center rounded-uni-full bg-surface2">
        <Search className="size-uni-24 text-neutral3" />
      </span>
      <span className="flex max-w-[400px] flex-col gap-uni-4">
        <span className="text-body2 text-neutral1">{title}</span>
        {hint && <span className="text-body3 text-neutral2">{hint}</span>}
      </span>
      {action && (
        <button
          type="button"
          onClick={action.run}
          className={cn(
            'mt-uni-4 flex h-uni-32 cursor-pointer items-center gap-uni-8 rounded-uni-full bg-surface3 pr-uni-6 pl-uni-12',
            'text-buttonLabel3 text-neutral1 outline-none select-none hover:bg-surface3Hovered active:scale-[0.98]',
            'transition-[scale] duration-100 ease-out',
          )}
        >
          {action.label}
          <span className="hidden pointer-fine:inline-flex">
            <Kbd>↵</Kbd>
          </span>
        </button>
      )}
    </div>
  )
}

/** Palette-shaped loader: a section heading and rows with the real row's metrics, fading down (Loader.Token). */
function PaletteListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <Shimmer role="status" aria-label="Loading tokens" className="flex flex-col">
      <span className="flex h-uni-32 items-center justify-between px-uni-12">
        <TextSkeleton placeholder="Your tokens" className="text-body4" />
        <TextSkeleton placeholder="Balance" className="text-body4" />
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex h-[56px] items-center gap-uni-12 px-uni-12"
          style={{ opacity: (rows - i) / rows }}
        >
          <BlockSkeleton className="size-uni-36 rounded-uni-full" />
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <TextSkeleton placeholder={i % 2 ? 'Token Name' : 'Token Full Name'} className="text-body2" />
            <TextSkeleton placeholder="TKN" className="text-body3" />
          </span>
          <span className="flex flex-col items-end">
            <TextSkeleton placeholder="$0,000.00" className="text-body2" />
            <TextSkeleton placeholder="0.0000" className="text-body3" />
          </span>
        </div>
      ))}
    </Shimmer>
  )
}
