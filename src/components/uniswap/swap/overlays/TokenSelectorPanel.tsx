'use client'

import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { CheckIcon, CoinsIcon, SearchIcon } from 'lucide-react'
import { Command, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { TokenListSkeleton } from '../../Skeleton'
import { SearchInput } from '../../SearchInput'
import { formatTokenAmount, formatUsd } from '../format'
import { COMMON_TOKENS, TOKEN_LIST } from '../tokens'
import type { Token } from '../types'
import { TokenLogo } from './shared'

/*
 * Token selector content, ported from Uniswap's legacy web token selector
 * (packages/uniswap/src/components/TokenSelector: TokenSelector.tsx,
 * lists/*, items/tokens/TokenSelectorPill.tsx; rows from
 * components/lists/items/OptionItem.tsx + LegacyTokenOptionItem.tsx;
 * section headers from components/lists/SectionHeader.tsx).
 *
 * Presentational: renders inline, so it works inside <ModalSurface> (canvas
 * frames) or <UniModalContent title="Select a token"> (the real modal).
 * Keyboard navigation comes from cmdk: arrows move, Enter selects.
 */

export interface TokenSelectorPanelProps {
  /** Tokens to list. Defaults to the mock TOKEN_LIST. */
  tokens?: Token[]
  /** Whole-token balances keyed by symbol; tokens with a balance > 0 go in "Your tokens". */
  balances?: Record<string, number>
  /** Quick-pick chips above the list. Defaults to COMMON_TOKENS; pass [] to hide. */
  commonTokens?: Token[]
  /** Token already chosen for this field: shown with a check. */
  selectedSymbol?: string
  /** Token chosen for the opposite field: shown dimmed and not selectable. */
  otherSymbol?: string
  onSelect?: (token: Token) => void
  /** Controlled search text. Leave undefined for uncontrolled (see defaultQuery). */
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  autoFocus?: boolean
  /** List still loading: skeleton rows in place of the sections (search and chips stay usable) */
  loading?: boolean
  className?: string
  /** Sizing for the scrolling list (default max-h 400px). */
  listClassName?: string
}

type Section = { id: string; title: string; tokens: Token[] }

function matchRank(token: Token, q: string): number {
  const symbol = token.symbol.toLowerCase()
  const name = token.name.toLowerCase()
  if (symbol === q) return 0
  if (symbol.startsWith(q)) return 1
  if (name.startsWith(q)) return 2
  if (symbol.includes(q) || name.includes(q)) return 3
  return -1
}

function usdValue(token: Token, balances: Record<string, number>): number {
  return (balances[token.symbol] ?? 0) * token.priceUsd
}

export function TokenSelectorPanel({
  tokens = TOKEN_LIST,
  balances = {},
  commonTokens = COMMON_TOKENS,
  selectedSymbol,
  otherSymbol,
  onSelect,
  query: queryProp,
  defaultQuery = '',
  onQueryChange,
  autoFocus,
  loading = false,
  className,
  listClassName,
}: TokenSelectorPanelProps) {
  const [uncontrolledQuery, setUncontrolledQuery] = React.useState(defaultQuery)
  const query = queryProp ?? uncontrolledQuery
  const [active, setActive] = React.useState('')

  const setQuery = (next: string) => {
    if (queryProp === undefined) setUncontrolledQuery(next)
    onQueryChange?.(next)
    // New results: let the highlight fall back to the first row
    setActive('')
  }

  const trimmed = query.trim().toLowerCase()

  const sections = React.useMemo<Section[]>(() => {
    if (trimmed) {
      const results = tokens
        .map((token) => ({ token, rank: matchRank(token, trimmed) }))
        .filter((r) => r.rank >= 0)
        .sort((a, b) => a.rank - b.rank || usdValue(b.token, balances) - usdValue(a.token, balances))
        .map((r) => r.token)
      return results.length ? [{ id: 'search', title: 'Search results', tokens: results }] : []
    }
    const owned = tokens
      .filter((t) => (balances[t.symbol] ?? 0) > 0)
      .sort((a, b) => usdValue(b, balances) - usdValue(a, balances))
    return [
      ...(owned.length ? [{ id: 'yours', title: 'Your tokens', tokens: owned }] : []),
      { id: 'tokens', title: 'Tokens', tokens },
    ]
  }, [tokens, balances, trimmed])

  const rowValue = (section: Section, token: Token) => `${section.id}:${token.symbol}`

  // Highlight stays on a visible, selectable row; otherwise the first one
  const selectableValues = sections.flatMap((s) =>
    s.tokens.filter((t) => t.symbol !== otherSymbol).map((t) => rowValue(s, t)),
  )
  const activeValue = selectableValues.includes(active) ? active : (selectableValues[0] ?? '')

  const showChips = !trimmed && commonTokens.length > 0

  return (
    <Command
      shouldFilter={false}
      loop
      value={activeValue}
      onValueChange={setActive}
      label="Select a token"
      className={cn('gap-uni-8 overflow-visible rounded-none bg-transparent text-neutral1', className)}
    >
      <div className="py-uni-4">
        <CommandPrimitive.Input asChild value={query} onValueChange={setQuery}>
          <SearchInput placeholder="Search tokens" autoFocus={autoFocus} autoComplete="off" spellCheck={false} />
        </CommandPrimitive.Input>
      </div>

      {showChips && (
        <div
          role="group"
          aria-label="Common tokens"
          className="-mx-uni-16 flex gap-uni-8 overflow-x-auto px-uni-16 py-uni-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {commonTokens.map((token) => {
            const disabled = token.symbol === otherSymbol
            return (
              <button
                key={token.symbol}
                type="button"
                disabled={disabled}
                onClick={() => onSelect?.(token)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-uni-8 rounded-uni-full border border-surface3 bg-surface1 py-uni-4 pr-uni-12 pl-uni-4',
                  'text-buttonLabel2 text-neutral1 outline-none transition-[background-color,border-color,transform,translate,scale,rotate] duration-100',
                  'hover:border-surface3Hovered hover:bg-surface2 active:scale-[0.98]',
                  'focus-visible:border-surface3Hovered focus-visible:bg-surface2',
                  'disabled:cursor-default disabled:opacity-50 disabled:hover:border-surface3 disabled:hover:bg-surface1',
                )}
              >
                <TokenLogo token={token} size={24} />
                {token.symbol}
              </button>
            )
          })}
        </div>
      )}

      <CommandList
        className={cn(
          '-mx-uni-4 max-h-[400px] scroll-py-uni-8 overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--uni-surface3)_transparent]',
          listClassName,
        )}
      >
        {loading ? (
          // Uniswap's TOKEN_SELECTOR_LOADING_ROWS
          <TokenListSkeleton rows={7} withValue className="px-uni-4 pt-uni-8" />
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center gap-uni-8 px-uni-16 py-uni-32 text-center">
            <SearchIcon aria-hidden className="size-uni-24 text-neutral3" />
            <p className="text-body2 text-neutral2">
              No results found for <span className="text-neutral1">“{query.trim()}”</span>
            </p>
          </div>
        ) : (
          sections.map((section) => (
            <CommandPrimitive.Group
              key={section.id}
              heading={
                <span className="flex items-center gap-uni-8 px-uni-8 pt-uni-12 pb-uni-4 text-subheading2 text-neutral2">
                  <CoinsIcon aria-hidden className="size-uni-16" />
                  {section.title}
                </span>
              }
            >
              {section.tokens.map((token) => (
                <TokenRow
                  key={token.symbol}
                  value={rowValue(section, token)}
                  token={token}
                  balance={balances[token.symbol] ?? 0}
                  selected={token.symbol === selectedSymbol}
                  disabled={token.symbol === otherSymbol}
                  onSelect={() => onSelect?.(token)}
                />
              ))}
            </CommandPrimitive.Group>
          ))
        )}
      </CommandList>
    </Command>
  )
}

function TokenRow({
  value,
  token,
  balance,
  selected,
  disabled,
  onSelect,
}: {
  value: string
  token: Token
  balance: number
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <CommandPrimitive.Item
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      aria-current={selected || undefined}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-uni-8 rounded-uni-16 p-uni-8 outline-none select-none',
        'transition-[background-color,transform,translate,scale,rotate] duration-100 active:scale-[0.99]',
        'data-[selected=true]:bg-surface2',
        'data-[disabled=true]:cursor-default data-[disabled=true]:opacity-50 data-[disabled=true]:active:scale-100',
      )}
    >
      <span className="flex min-w-0 items-center gap-uni-12">
        <TokenLogo token={token} size={40} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body1 text-neutral1">{token.name}</span>
          <span className="truncate text-body3 text-neutral2">{token.symbol}</span>
        </span>
      </span>
      {selected ? (
        <CheckIcon aria-label="Selected" className="size-uni-20 shrink-0 text-accent1" strokeWidth={2.5} />
      ) : balance > 0 ? (
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-body1 text-neutral1">{formatUsd(balance * token.priceUsd)}</span>
          <span className="text-body3 text-neutral2">{formatTokenAmount(balance)}</span>
        </span>
      ) : null}
    </CommandPrimitive.Item>
  )
}
