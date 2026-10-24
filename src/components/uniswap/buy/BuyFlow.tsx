'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { TOKENS } from '../swap/tokens'
import type { Token } from '../swap/types'
import { amountUsd, maxUsd, pressKey, sameAsset, typedFromUsd, type KeypadKey } from './buy'
import { BuyFormView } from './BuyFormView'
import { NETWORK_COST_LATENCY_MS, NETWORK_COST_USD } from './data'
import { CLOSED_SHEET } from './presets'
import { BuySheet } from './sheet/BuySheet'
import { BuyWithPanel } from './sheet/BuyWithPanel'
import type { BuyFormState, BuySheetState, BuySide, FiatMethodId, PaySource, Provider } from './types'

/*
 * The buy prototype, live: owns the form and the sheet, and runs the mocks
 * (a 600ms network cost fetch after every edit). Fills its box; the caller
 * gives it a phone-sized one.
 *
 * Interaction rules, from the prototype:
 * - The keypad types in dollars or in the token being bought; the arrows by
 *   the number convert the amount between the two.
 * - Quick amounts are dollars in either unit. Max is the pay token's balance,
 *   or the most the provider takes (its limit, net of its markup).
 * - Tapping a card opens the sheet for that side. The pay side opens on the
 *   chip it was last picked from; picking a row sets the side and closes it.
 * - Picking the other side's token for a side swaps the two, as flipping does.
 *   A card payment can't be received, so flipping is off while one pays.
 * - Changing the token bought keeps the dollar value when typing in tokens.
 */

interface BuyFlowProps {
  initialState: BuyFormState
  initialSheet?: BuySheetState
  /** Reports every change (the showcase keeps it, to resume and to take it apart on the canvas) */
  onStateChange?: (state: BuyFormState, sheet: BuySheetState) => void
  /** Type on the keyboard: digits, "." and Backspace. One live instance should have it. */
  keyboard?: boolean
  /** Marks the screen's parts for the exploded-view transition */
  explode?: boolean
  className?: string
}

/** The token the other side falls back to when a pick would leave both sides the same */
const fallbackFor = (token: Token) => (token.symbol === TOKENS.USDC.symbol ? TOKENS.ETH : TOKENS.USDC)

export function BuyFlow({ initialState, initialSheet = CLOSED_SHEET, onStateChange, keyboard = false, explode, className }: BuyFlowProps) {
  const [state, setState] = React.useState(initialState)
  const [sheet, setSheet] = React.useState(initialSheet)
  const id = React.useId()
  const ids = { pay: `${id}-pay`, receive: `${id}-receive`, title: `${id}-sheet-title` }

  React.useEffect(() => {
    onStateChange?.(state, sheet)
  }, [state, sheet, onStateChange])

  // Network cost: every edit refetches; the last value stays up (pulsing) meanwhile
  const costTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(costTimer.current), [])
  const refetchCost = (amount: string) => {
    clearTimeout(costTimer.current)
    if (amount === '0') return { status: 'idle' as const }
    costTimer.current = setTimeout(() => {
      setState((s) => ({ ...s, networkCost: { status: 'ready', usd: NETWORK_COST_USD } }))
    }, NETWORK_COST_LATENCY_MS)
    return { status: 'loading' as const, usd: state.networkCost.usd }
  }

  const setAmount = (amount: string) => {
    if (amount === state.amount) return
    const networkCost = refetchCost(amount)
    setState((s) => ({ ...s, amount, networkCost }))
  }

  const onKey = (key: KeypadKey) => setAmount(pressKey(state.amount, key, state.denomination))

  const onToggleDenomination = () => {
    const denomination = state.denomination === 'usd' ? 'token' : 'usd'
    setState((s) => ({ ...s, denomination, amount: typedFromUsd(amountUsd(s), denomination, s.receive) }))
  }

  /** New pay / receive; in token units the amount is re-typed so its dollar value holds */
  const setSides = (pay: PaySource, receive: Token, flipped = state.flipped) =>
    setState((s) => ({
      ...s,
      pay,
      receive,
      flipped,
      amount: s.denomination === 'token' ? typedFromUsd(amountUsd(s), 'token', receive) : s.amount,
    }))

  const onFlip = () => {
    if (state.pay.kind !== 'token') return
    setSides({ kind: 'token', token: state.receive }, state.pay.token, !state.flipped)
  }

  const openSheet = (side: BuySide) =>
    setSheet({
      open: true,
      side,
      method: side === 'pay' && state.pay.kind === 'fiat' ? state.pay.method : 'tokens',
      query: '',
    })
  const closeSheet = () => setSheet((s) => ({ ...s, open: false }))

  const onSelectToken = (token: Token) => {
    const { pay, receive } = state
    if (sheet.side === 'pay') {
      if (token.symbol === receive.symbol) {
        // The receive token, picked to pay with: swap the two (or fall back if a card was paying)
        if (pay.kind === 'token') setSides({ kind: 'token', token }, pay.token, !state.flipped)
        else setSides({ kind: 'token', token }, fallbackFor(token))
      } else {
        setSides({ kind: 'token', token }, receive)
      }
    } else if (sameAsset(pay, token)) {
      setSides({ kind: 'token', token: receive }, token, !state.flipped)
    } else {
      setSides(pay, token)
    }
    closeSheet()
  }

  const onSelectProvider = (method: FiatMethodId, provider: Provider) => {
    setState((s) => ({ ...s, pay: { kind: 'fiat', method, provider } }))
    closeSheet()
  }

  const onQuickAmount = (usd: number) => setAmount(typedFromUsd(usd, state.denomination, state.receive))
  const onMax = () => setAmount(typedFromUsd(maxUsd(state.pay, state.balances), state.denomination, state.receive, 'down'))

  // Keyboard typing for the live instance, unless something else has the keys
  const keyHandler = React.useRef(onKey)
  React.useLayoutEffect(() => {
    keyHandler.current = onKey
  })
  React.useEffect(() => {
    if (!keyboard || sheet.open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="menu"]')) return
      const key: KeypadKey | undefined = /^[0-9]$/.test(event.key)
        ? (event.key as KeypadKey)
        : event.key === '.' || event.key === ','
          ? '.'
          : event.key === 'Backspace' || event.key === 'Delete'
            ? 'backspace'
            : undefined
      if (!key) return
      event.preventDefault()
      keyHandler.current(key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keyboard, sheet.open])

  return (
    <div data-slot="buy-flow" className={cn('relative flex h-full w-full flex-col overflow-hidden bg-surface1', className)}>
      <div inert={sheet.open} className="flex min-h-0 flex-1 flex-col">
        <BuyFormView
          state={state}
          explode={explode}
          onKey={onKey}
          onToggleDenomination={onToggleDenomination}
          onPayClick={() => openSheet('pay')}
          onReceiveClick={() => openSheet('receive')}
          onFlip={onFlip}
          onQuickAmount={onQuickAmount}
          onMax={onMax}
          // Review is where the prototype ends
          onReview={() => {}}
          sheetOpen={sheet.open}
          payCardId={ids.pay}
          receiveCardId={ids.receive}
        />
      </div>
      <BuySheet open={sheet.open} onClose={closeSheet} labelledBy={ids.title} returnFocusId={ids[sheet.side]}>
        <BuyWithPanel
          titleId={ids.title}
          side={sheet.side}
          method={sheet.method}
          query={sheet.query}
          onMethodChange={(method) => setSheet((s) => ({ ...s, method, query: '' }))}
          onQueryChange={(query) => setSheet((s) => ({ ...s, query }))}
          pay={state.pay}
          receive={state.receive}
          usd={amountUsd(state)}
          balances={state.balances}
          onSelectToken={onSelectToken}
          onSelectProvider={onSelectProvider}
        />
      </BuySheet>
    </div>
  )
}
