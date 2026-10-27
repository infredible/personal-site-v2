'use client'

import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Search } from '../../icons'
import type { Chain } from '../types'
import type { TokenSelectorChain } from './tokenSelectorFilters'

/*
 * The token selector's network filter: a trigger in the search header and a
 * small combobox under it (Raycast's search-bar dropdown): a filter field on
 * top takes focus while it's open and handles its own keys. Open state and the
 * highlight are controlled; rendered inline (no portal), so it works in canvas
 * frames and inside the modal alike.
 */

/*
 * The source PNGs aren't normalized: some are full-bleed discs, others a small
 * mark on a white or transparent square. Each sits on a white disc, scaled so
 * the marks fill it about equally (factors measured from the assets).
 */
const LOGO_SCALE: Partial<Record<Chain['id'], number>> = { base: 1.45, polygon: 1.4, ethereum: 1.1 }

/**
 * Chain logos are squircles (token logos stay round). Where the browser has
 * corner-shape it draws a true superellipse; elsewhere a ~30% radius stands in.
 */
const squircleClassName =
  'rounded-[30%] supports-[corner-shape:squircle]:rounded-full supports-[corner-shape:squircle]:[corner-shape:squircle]'

/** Dark text on light brand colors (relative luminance above ~0.5). */
function monogramInk(hex = '#7D7D7D') {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? '#131313' : '#FFFFFF'
}

/** Chain logo on a squircle. `className` goes on the disc (position it, add a ring). */
export function ChainLogo({ chain, size = 16, className }: { chain: Chain; size?: number; className?: string }) {
  if (!chain.logo) {
    // No asset: the network's initial on its brand color
    return (
      <span
        aria-hidden
        className={cn('inline-flex shrink-0 items-center justify-center font-uni font-[535]', squircleClassName, className)}
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.5),
          lineHeight: 1,
          backgroundColor: chain.color ?? '#7D7D7D',
          color: monogramInk(chain.color),
        }}
      >
        {chain.name[0]}
      </span>
    )
  }
  const scale = LOGO_SCALE[chain.id] ?? 1
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 overflow-hidden bg-white', squircleClassName, className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={chain.logo}
        alt=""
        width={size}
        height={size}
        unoptimized
        draggable={false}
        className="block select-none"
        style={{ width: size, height: size, transform: scale === 1 ? undefined : `scale(${scale})` }}
      />
    </span>
  )
}

/** "All networks": a neutral 2×2 grid glyph, like Uniswap's network filter. */
export function AllNetworksIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={cn('shrink-0 text-neutral2', className)}
      style={{ width: size, height: size }}
    >
      <rect x="2" y="2" width="7" height="7" rx="2.5" fill="currentColor" />
      <rect x="11" y="2" width="7" height="7" rx="2.5" fill="currentColor" />
      <rect x="2" y="11" width="7" height="7" rx="2.5" fill="currentColor" />
      <rect x="11" y="11" width="7" height="7" rx="2.5" fill="currentColor" />
    </svg>
  )
}

export interface NetworkMenuProps {
  chains: Chain[]
  value: TokenSelectorChain
  onChange: (chain: TokenSelectorChain) => void
  open: boolean
  /** `via` tells whether to animate: pointer opens fade in, keyboard opens are instant. */
  onOpenChange: (open: boolean, via?: 'pointer' | 'keyboard') => void
  /** Keyboard highlight inside the open menu. */
  highlighted: TokenSelectorChain
  onHighlight: (chain: TokenSelectorChain) => void
  /** Tokens listed per network, shown on the right of each option. */
  counts: Record<TokenSelectorChain, number>
  animate?: boolean
  menuId: string
  /** Called when the menu closes from its own keys (↵, esc, tab), to hand focus back. */
  onDismiss?: () => void
  /** Restyles the trigger (merged with cn), e.g. the Explore filter bar's 40px control. */
  triggerClassName?: string
}

type Option = { id: TokenSelectorChain; label: string; icon: React.ReactNode }

/** Name prefix first, then word starts ("chain" → BNB Chain), then substrings. */
function rankOption(label: string, q: string) {
  const name = label.toLowerCase()
  if (name.startsWith(q)) return 0
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return 1
  return name.includes(q) ? 2 : -1
}

export function NetworkMenu({
  chains,
  value,
  onChange,
  open,
  onOpenChange,
  highlighted,
  onHighlight,
  counts,
  animate = false,
  menuId,
  onDismiss,
  triggerClassName,
}: NetworkMenuProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const [query, setQuery] = React.useState('')
  const current = chains.find((c) => c.id === value)

  // Each open starts unfiltered. Focus moves to the filter only on opens after mount,
  // so a canvas frame rendered open doesn't grab focus (and pan the canvas to it).
  const mounted = React.useRef(false)
  React.useEffect(() => {
    if (!open) setQuery('')
    else if (mounted.current) inputRef.current?.focus({ preventScroll: true })
    mounted.current = true
  }, [open])

  // Click outside closes
  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, onOpenChange])

  const allOptions: Option[] = [
    { id: 'all', label: 'All networks', icon: <AllNetworksIcon size={20} /> },
    ...chains.map((chain) => ({ id: chain.id, label: chain.name, icon: <ChainLogo chain={chain} size={20} /> })),
  ]
  const q = query.trim().toLowerCase()
  const options = q
    ? allOptions
        .map((option) => ({ option, rank: rankOption(option.label, q) }))
        .filter((r) => r.rank >= 0)
        .sort((a, b) => a.rank - b.rank)
        .map((r) => r.option)
    : allOptions
  // The highlight stays on a visible option; otherwise the first match
  const active = options.some((o) => o.id === highlighted) ? highlighted : options[0]?.id
  const optionId = (id: TokenSelectorChain) => `${menuId}-${id}`

  // Keep the keyboard highlight in view (the list scrolls; scrollIntoView would also pan a canvas)
  React.useEffect(() => {
    const list = listRef.current
    const row = active && list?.querySelector<HTMLElement>(`[data-option="${active}"]`)
    if (!list || !row) return
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 4
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight + 4
  }, [active])

  const choose = (id: TokenSelectorChain) => {
    onChange(id)
    onOpenChange(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    // ⌘K bubbles up to the palette, which toggles the menu
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return
    // Everything else stays here: the palette's list mustn't move underneath
    e.stopPropagation()
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault()
        if (!options.length) return
        const i = options.findIndex((o) => o.id === active)
        const step = e.key === 'ArrowDown' ? 1 : -1
        onHighlight(options[(i + step + options.length) % options.length].id)
        return
      }
      case 'Enter':
        e.preventDefault()
        if (active) {
          choose(active)
          onDismiss?.()
        }
        return
      case 'Escape':
        e.preventDefault()
        // First esc clears the filter, the next closes
        if (query) setQuery('')
        else {
          onOpenChange(false)
          onDismiss?.()
        }
        return
      case 'Tab':
        e.preventDefault()
        onOpenChange(false)
        onDismiss?.()
        return
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Network: ${current?.name ?? 'All networks'}`}
        onClick={() => onOpenChange(!open, 'pointer')}
        className={cn(
          'flex h-uni-32 cursor-pointer items-center gap-uni-6 rounded-uni-full border border-surface3 py-uni-4 pr-uni-8 pl-uni-6',
          'text-buttonLabel3 text-neutral1 outline-none select-none hover:bg-surface2 active:scale-[0.98]',
          'transition-[scale] duration-100 ease-out',
          open && 'bg-surface2',
          triggerClassName,
        )}
      >
        {current ? <ChainLogo chain={current} size={20} /> : <AllNetworksIcon size={20} />}
        {/* Label drops at narrow widths: the icon alone identifies the network */}
        <span className="@max-[480px]:hidden">{current?.name ?? 'All networks'}</span>
        <ChevronDown className="size-uni-16 text-neutral2" />
      </button>

      {open && (
        <div
          id={menuId}
          role="dialog"
          aria-label="Network"
          className={cn(
            'absolute top-[calc(100%+6px)] right-0 z-30 flex w-[248px] flex-col overflow-hidden rounded-uni-16 border border-surface3 bg-surface1 shadow-uni-medium',
            animate &&
              'origin-top-right animate-in fade-in-0 zoom-in-[0.98] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:zoom-in-100',
          )}
        >
          <label
            data-network-search
            className="flex h-uni-40 shrink-0 items-center gap-uni-8 border-b border-surface3 px-uni-12 text-neutral2"
          >
            <Search className="size-uni-16 shrink-0" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={`${menuId}-list`}
              aria-activedescendant={active ? optionId(active) : undefined}
              aria-autocomplete="list"
              aria-label="Search networks"
              placeholder="Search networks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent text-body3 text-neutral1 caret-accent1 outline-none placeholder:text-neutral3"
            />
          </label>
          <div
            ref={listRef}
            id={`${menuId}-list`}
            role="listbox"
            aria-label="Networks"
            className={cn(
              'relative max-h-[296px] overflow-y-auto overscroll-contain p-uni-4',
              '[scrollbar-width:thin] [scrollbar-color:var(--uni-surface3)_transparent]',
            )}
          >
            {options.length === 0 && (
              <div className="px-uni-8 py-uni-12 text-center text-body3 text-neutral2">
                No networks match “{query.trim()}”
              </div>
            )}
            {options.map((option, i) => {
              const selected = option.id === value
              return (
                <React.Fragment key={option.id}>
                  {!q && i === 1 && <span aria-hidden className="mx-uni-8 my-uni-4 block h-px bg-surface3" />}
                  <div
                    id={optionId(option.id)}
                    role="option"
                    aria-selected={selected}
                    data-option={option.id}
                    data-highlighted={option.id === active || undefined}
                    onPointerMove={() => onHighlight(option.id)}
                    onClick={() => choose(option.id)}
                    className={cn(
                      'flex h-uni-36 cursor-pointer items-center gap-uni-8 rounded-uni-12 px-uni-8 text-body3 text-neutral1 select-none',
                      'data-[highlighted]:bg-surface2Hovered',
                    )}
                  >
                    {option.icon}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {selected ? (
                      <Check className="size-uni-16 shrink-0 text-accent1" />
                    ) : (
                      <span className="text-body4 text-neutral3 tabular-nums">{counts[option.id] ?? 0}</span>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
