'use client'

import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check, ChevronDown } from '../../icons'
import type { Chain } from '../types'
import type { TokenSelectorChain } from './tokenSelectorFilters'

/*
 * The token selector's network filter: a trigger in the search header and a
 * small menu under it (Raycast's search-bar dropdown). Fully controlled and
 * rendered inline (no portal), so it works in canvas frames and inside the
 * modal alike; the palette routes keys to it (focus stays in the search field).
 */

/*
 * The source PNGs aren't normalized: some are full-bleed discs, others a small
 * mark on a white or transparent square. Each sits on a white disc, scaled so
 * the marks fill it about equally (factors measured from the assets).
 */
const LOGO_SCALE: Partial<Record<Chain['id'], number>> = { base: 1.45, polygon: 1.4, ethereum: 1.1 }

/** Round chain logo. `className` goes on the disc (position it, add a ring). */
export function ChainLogo({ chain, size = 16, className }: { chain: Chain; size?: number; className?: string }) {
  const scale = LOGO_SCALE[chain.id] ?? 1
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 overflow-hidden rounded-uni-full bg-white', className)}
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
}: NetworkMenuProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const current = chains.find((c) => c.id === value)

  // Click outside closes
  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, onOpenChange])

  const options: { id: TokenSelectorChain; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All networks', icon: <AllNetworksIcon size={20} /> },
    ...chains.map((chain) => ({ id: chain.id, label: chain.name, icon: <ChainLogo chain={chain} size={20} /> })),
  ]

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Network: ${current?.name ?? 'All networks'}`}
        onClick={() => onOpenChange(!open, 'pointer')}
        className={cn(
          'flex h-uni-32 cursor-pointer items-center gap-uni-6 rounded-uni-full border border-surface3 py-uni-4 pr-uni-8 pl-uni-6',
          'text-buttonLabel3 text-neutral1 outline-none select-none hover:bg-surface2 active:scale-[0.98]',
          'transition-[scale] duration-100 ease-out',
          open && 'bg-surface2',
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
          role="listbox"
          aria-label="Network"
          className={cn(
            'absolute top-[calc(100%+6px)] right-0 z-30 flex w-[232px] flex-col rounded-uni-16 border border-surface3 bg-surface1 p-uni-4 shadow-uni-medium',
            animate &&
              'origin-top-right animate-in fade-in-0 zoom-in-[0.98] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:zoom-in-100',
          )}
        >
          {options.map((option, i) => {
            const selected = option.id === value
            return (
              <React.Fragment key={option.id}>
                {i === 1 && <span aria-hidden className="mx-uni-8 my-uni-4 h-px bg-surface3" />}
                <div
                  role="option"
                  aria-selected={selected}
                  data-highlighted={option.id === highlighted || undefined}
                  onPointerMove={() => onHighlight(option.id)}
                  onClick={() => {
                    onChange(option.id)
                    onOpenChange(false)
                  }}
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
      )}
    </div>
  )
}
