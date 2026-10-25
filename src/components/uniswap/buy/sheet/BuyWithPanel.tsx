'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SearchInput } from '../../SearchInput'
import { TOKEN_LIST } from '../../swap/tokens'
import type { Token } from '../../swap/types'
import { PAYMENT_METHODS, POPULAR_TOKENS, RECENT_TOKENS, SUGGESTED_TOKENS, YOUR_TOKENS, providersFor } from '../data'
import { relativeMarkup } from '../buy'
import { Clock, Coin, HandHoldingDollar, Star } from '../icons'
import type { BuySide, FiatMethodId, PaymentMethodId, PaySource, Provider } from '../types'
import { MethodChip, ProviderRow, SectionHeading, TokenRow, TokenTile } from './rows'

/*
 * The sheet's content, from props. Paying: "Buy with", a row of payment
 * method chips, then either your tokens (search, Your tokens, Recent
 * searches, Popular) or the onramps for that method, cheapest first, each
 * with its limit, or what you'd pay once there's an amount. Receiving: the
 * same token list under five suggested tiles, without chips.
 *
 * Chips only change what's in view. The pay source changes when a row is
 * picked, so opening the sheet again lands on the chip it was picked from.
 */

export interface BuyWithPanelProps {
  side: BuySide
  method: PaymentMethodId
  query: string
  onMethodChange?: (method: PaymentMethodId) => void
  onQueryChange?: (query: string) => void
  pay: PaySource
  receive: Token
  /** The amount in USD; providers quote against it */
  usd: number
  balances: Record<string, number>
  onSelectToken?: (token: Token) => void
  onSelectProvider?: (method: FiatMethodId, provider: Provider) => void
  /** Id for the title, so the sheet can be labelled by it */
  titleId?: string
  className?: string
}

export function BuyWithPanel(props: BuyWithPanelProps) {
  const { side, method, query, onMethodChange, onQueryChange, titleId, className } = props
  const paying = side === 'pay'
  const view: PaymentMethodId = paying ? method : 'tokens'
  const search = React.useRef<HTMLInputElement>(null)
  const idBase = React.useId()

  // Typing anywhere in the token view types into the search
  const onKeyDown = (event: React.KeyboardEvent) => {
    const input = search.current
    if (view !== 'tokens' || !input || !onQueryChange || event.key.length !== 1 || event.key === ' ') return
    if (event.metaKey || event.ctrlKey || event.altKey || event.target === input) return
    event.preventDefault()
    const next = query + event.key
    onQueryChange(next)
    input.focus({ preventScroll: true })
    requestAnimationFrame(() => input.setSelectionRange(next.length, next.length))
  }

  return (
    <div
      data-slot="buy-with"
      data-sheet-focus=""
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn('flex h-full min-h-0 flex-col bg-surface1 outline-none', className)}
    >
      <h2 id={titleId} className="px-uni-16 pt-uni-8 text-buttonLabel2 text-neutral1">
        {paying ? 'Buy with' : 'Receive'}
      </h2>
      {paying && <MethodChips value={method} onChange={onMethodChange} idBase={idBase} />}
      {/* Keyed by view: switching chips starts the list at the top */}
      <div
        key={view}
        id={`${idBase}-panel`}
        role={paying ? 'tabpanel' : undefined}
        aria-labelledby={paying ? `${idBase}-tab-${method}` : undefined}
        className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain pb-uni-16', !paying && 'mt-uni-12')}
      >
        {view === 'tokens' ? <TokenView {...props} searchRef={search} /> : <ProviderView {...props} method={view} />}
      </div>
    </div>
  )
}

/** Horizontally scrolling tabs; ←/→ move between them (and select, as tabs do) */
function MethodChips({ value, onChange, idBase }: { value: PaymentMethodId; onChange?: (method: PaymentMethodId) => void; idBase: string }) {
  const ref = React.useRef<HTMLDivElement>(null)

  // Keep the selected chip in view, e.g. reopening on Revolut, past the edge. Scrolls
  // the row only: scrollIntoView would also scroll every ancestor (the canvas included).
  React.useEffect(() => {
    const row = ref.current
    const chip = row?.querySelector<HTMLElement>(`[data-method="${value}"]`)
    if (!row || !chip) return
    const pad = 12
    if (chip.offsetLeft - pad < row.scrollLeft) row.scrollLeft = chip.offsetLeft - pad
    else if (chip.offsetLeft + chip.offsetWidth + pad > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = chip.offsetLeft + chip.offsetWidth + pad - row.clientWidth
    }
  }, [value])

  const move = (event: React.KeyboardEvent, step: number | 'first' | 'last') => {
    const index = PAYMENT_METHODS.findIndex((m) => m.id === value)
    const target = step === 'first' ? 0 : step === 'last' ? PAYMENT_METHODS.length - 1 : index + step + PAYMENT_METHODS.length
    const next = PAYMENT_METHODS[target % PAYMENT_METHODS.length]
    event.preventDefault()
    onChange?.(next.id)
    ref.current?.querySelector<HTMLElement>(`[data-method="${next.id}"]`)?.focus({ preventScroll: true })
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Payment method"
      className="relative mt-uni-8 mb-uni-8 flex h-[44px] shrink-0 items-center gap-uni-8 overflow-x-auto px-uni-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {PAYMENT_METHODS.map((m) => (
        <MethodChip
          key={m.id}
          method={m}
          selected={m.id === value}
          id={`${idBase}-tab-${m.id}`}
          controls={`${idBase}-panel`}
          tabIndex={m.id === value ? 0 : -1}
          onClick={onChange && (() => onChange(m.id))}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') move(e, 1)
            else if (e.key === 'ArrowLeft') move(e, -1)
            else if (e.key === 'Home') move(e, 'first')
            else if (e.key === 'End') move(e, 'last')
          }}
        />
      ))}
    </div>
  )
}

function ProviderView({
  method,
  pay,
  usd,
  onSelectProvider,
}: BuyWithPanelProps & { method: FiatMethodId }) {
  const providers = providersFor(method)
  const selectedId = pay.kind === 'fiat' && pay.method === method ? pay.provider.id : undefined
  return (
    <div className="flex flex-col px-uni-8">
      <div className="sticky top-0 z-10 mb-uni-8 bg-surface1">
        <SectionHeading icon={<HandHoldingDollar />}>Providers</SectionHeading>
      </div>
      <div className="flex flex-col gap-uni-4">
        {providers.map((p) => (
          <ProviderRow
            key={p.id}
            provider={p}
            worse={relativeMarkup(p, providers)}
            usd={usd}
            selected={p.id === selectedId}
            onClick={onSelectProvider && (() => onSelectProvider(method, p))}
          />
        ))}
      </div>
    </div>
  )
}

/** Exact symbol, then symbol prefix, name prefix, a word in the name, then anywhere */
function searchTokens(query: string): Token[] {
  const q = query.trim().toLowerCase()
  const rank = (t: Token) => {
    const symbol = t.symbol.toLowerCase()
    const name = t.name.toLowerCase()
    if (symbol === q) return 0
    if (symbol.startsWith(q)) return 1
    if (name.startsWith(q)) return 2
    if (name.split(/\s+/).some((word) => word.startsWith(q))) return 3
    if (symbol.includes(q) || name.includes(q)) return 4
    return -1
  }
  return TOKEN_LIST.map((t) => ({ t, r: rank(t) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r)
    .map(({ t }) => t)
}

function TokenView({
  side,
  query,
  onQueryChange,
  pay,
  receive,
  balances,
  onSelectToken,
  searchRef,
}: BuyWithPanelProps & { searchRef: React.Ref<HTMLInputElement> }) {
  const current = side === 'pay' ? (pay.kind === 'token' ? pay.token.symbol : undefined) : receive.symbol
  const results = query.trim() ? searchTokens(query) : null
  const pick = (token: Token) => onSelectToken && (() => onSelectToken(token))
  const row = (token: Token, withBalance: boolean) => (
    <TokenRow
      key={token.symbol}
      token={token}
      balance={withBalance && balances[token.symbol] ? balances[token.symbol] : undefined}
      selected={token.symbol === current}
      onClick={pick(token)}
    />
  )

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-surface1 px-uni-8 pb-uni-8">
        <SearchInput
          ref={searchRef}
          aria-label="Search tokens"
          placeholder="Search tokens"
          autoComplete="off"
          spellCheck={false}
          value={query}
          readOnly={!onQueryChange}
          tabIndex={onQueryChange ? undefined : -1}
          onChange={(e) => onQueryChange?.(e.target.value)}
          onKeyDown={(e) => {
            // Esc clears a search before it closes the sheet
            if (e.key === 'Escape' && query) {
              e.stopPropagation()
              onQueryChange?.('')
            }
          }}
          className="h-uni-48 rounded-uni-24 border-transparent placeholder:text-neutral2"
        />
      </div>

      <p role="status" className="sr-only">
        {results ? (results.length > 0 ? `${results.length} ${results.length === 1 ? 'token' : 'tokens'}` : `No tokens match “${query.trim()}”`) : ''}
      </p>

      {results ? (
        <div className="flex flex-col gap-uni-4 px-uni-8">
          {results.length > 0 ? (
            results.map((t) => row(t, true))
          ) : (
            <p className="px-uni-8 py-uni-32 text-center text-body2 text-neutral2">No tokens match “{query.trim()}”</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col px-uni-8">
          {side === 'receive' && (
            <div className="grid grid-cols-5 gap-uni-4 px-uni-8 pt-uni-8 pb-uni-4">
              {SUGGESTED_TOKENS.map((t) => (
                <TokenTile key={t.symbol} token={t} selected={t.symbol === current} onClick={pick(t)} />
              ))}
            </div>
          )}
          <section className="flex flex-col">
            <SectionHeading icon={<Coin />}>Your tokens</SectionHeading>
            <div className="flex flex-col gap-uni-4">{YOUR_TOKENS.map((t) => row(t, true))}</div>
          </section>
          <section className="flex flex-col">
            <SectionHeading icon={<Clock />}>Recent searches</SectionHeading>
            <div className="flex flex-col gap-uni-4">{RECENT_TOKENS.map((t) => row(t, false))}</div>
          </section>
          <section className="flex flex-col">
            <SectionHeading icon={<Star />}>Popular</SectionHeading>
            <div className="flex flex-col gap-uni-4">{POPULAR_TOKENS.map((t) => row(t, false))}</div>
          </section>
        </div>
      )}
    </div>
  )
}
