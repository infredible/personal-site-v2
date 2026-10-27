'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatTokenAmount, formatUsd } from '../swap/format'
import { TokenLogo } from '../swap/parts/TokenLogo'
import type { Token } from '../swap/types'
import { amountUsd, amountValue, getBuyAction, receiveAmount, type BuyAction, type KeypadKey } from './buy'
import { QUICK_AMOUNTS_USD, paymentMethod } from './data'
import { AmountDisplay } from './parts/AmountDisplay'
import { BuyActions, BuyHeader } from './parts/BuyActions'
import { BuyCards, type AssetCardContent } from './parts/BuyCards'
import { MethodLogo } from './parts/logos'
import { NetworkCostRow } from './parts/NetworkCostRow'
import { NumberPad } from './parts/NumberPad'
import type { BuyDenomination, BuyFormState, BuySide, PaySource } from './types'

/*
 * The buy screen, composed from the parts, top to bottom as in the prototype:
 *
 *   header (Swap · ⋯)
 *   amount, centered in the space left over
 *   [pay card] [flip] [receive card]
 *   keypad
 *   network cost
 *   quick amounts ↔ Review
 *
 * Purely presentational: renders from a BuyFormState and reports events.
 * With no callbacks it's a static snapshot.
 */

export interface BuyFormViewProps {
  state: BuyFormState
  onKey?: (key: KeypadKey) => void
  onToggleDenomination?: () => void
  onPayClick?: () => void
  onReceiveClick?: () => void
  onFlip?: () => void
  onQuickAmount?: (usd: number) => void
  onMax?: () => void
  onReview?: () => void
  /** The side whose sheet is open, for that card's aria-expanded */
  openSheetSide?: BuySide
  /** Ids on the cards, so the sheet can hand focus back */
  payCardId?: string
  receiveCardId?: string
  /** Mark parts for the exploded-view transition (the Component view's live screen) */
  explode?: boolean
  className?: string
}

export type BuyPartId = 'header' | 'amount' | 'cards' | 'keypad' | 'cost' | 'actions'

export interface BuyFormPart {
  id: BuyPartId
  label: string
  node: React.ReactNode
}

export const BUY_PARTS: { id: BuyPartId; label: string }[] = [
  { id: 'header', label: 'Header' },
  { id: 'amount', label: 'Amount' },
  { id: 'cards', label: 'Pay · receive' },
  { id: 'keypad', label: 'Keypad' },
  { id: 'cost', label: 'Network cost' },
  { id: 'actions', label: 'Actions' },
]

const balanceText = (token: Token, balance: number, denomination: BuyDenomination) =>
  denomination === 'usd' ? formatUsd(balance * token.priceUsd) : `${formatTokenAmount(balance)} ${token.symbol}`

function tokenCard(role: string, token: Token, balance: number, denomination: BuyDenomination): AssetCardContent {
  return {
    role,
    logo: <TokenLogo token={token} size={36} />,
    title: token.name,
    subtitle: token.symbol,
    value: balanceText(token, balance, denomination),
    valueLabel: 'Balance',
  }
}

function payCard(pay: PaySource, balances: Record<string, number>, denomination: BuyDenomination): AssetCardContent {
  if (pay.kind === 'token') return tokenCard('Pay with', pay.token, balances[pay.token.symbol] ?? 0, denomination)
  return {
    role: 'Pay with',
    logo: <MethodLogo method={pay.method} size={36} />,
    title: paymentMethod(pay.method).label,
    subtitle: `with ${pay.provider.name}`,
    value: `$${pay.provider.limitUsd.toLocaleString('en-US')}`,
    valueLabel: 'Limit',
  }
}

/**
 * The screen's parts, each rendered with the same derived props BuyFormView
 * uses. The canvas anatomy lays them out one per frame, and the exploded-view
 * transition flies between the two, matching parts by id.
 */
export function getBuyFormParts({
  state,
  onKey,
  onToggleDenomination,
  onPayClick,
  onReceiveClick,
  onFlip,
  onQuickAmount,
  onMax,
  onReview,
  openSheetSide,
  payCardId,
  receiveCardId,
}: BuyFormViewProps): BuyFormPart[] {
  const { amount, denomination, pay, receive, balances, networkCost } = state
  const action: BuyAction = getBuyAction(state)
  const hasAmount = amountValue(amount) > 0

  return [
    { id: 'header', label: 'Header', node: <BuyHeader /> },
    {
      id: 'amount',
      label: 'Amount',
      node: (
        <AmountDisplay
          amount={amount}
          denomination={denomination}
          token={receive}
          usd={amountUsd(state)}
          tokenAmount={receiveAmount(state)}
          onToggleDenomination={onToggleDenomination}
        />
      ),
    },
    {
      id: 'cards',
      label: 'Pay · receive',
      node: (
        <BuyCards
          pay={payCard(pay, balances, denomination)}
          receive={tokenCard('Receive', receive, balances[receive.symbol] ?? 0, denomination)}
          flipped={state.flipped}
          onPayClick={onPayClick}
          onReceiveClick={onReceiveClick}
          onFlip={onFlip}
          flipDisabled={pay.kind === 'fiat'}
          payId={payCardId}
          receiveId={receiveCardId}
          expanded={openSheetSide}
        />
      ),
    },
    { id: 'keypad', label: 'Keypad', node: <NumberPad onKey={onKey} /> },
    {
      id: 'cost',
      label: 'Network cost',
      node: <NetworkCostRow status={networkCost.status} usd={networkCost.usd} hasAmount={hasAmount} />,
    },
    {
      id: 'actions',
      label: 'Actions',
      node: (
        <BuyActions action={action} quickAmounts={QUICK_AMOUNTS_USD} onQuickAmount={onQuickAmount} onMax={onMax} onReview={onReview} />
      ),
    },
  ]
}

export function BuyFormView({ explode = false, className, ...props }: BuyFormViewProps) {
  const parts = getBuyFormParts(props)
  // The marked element hugs the part (the amount's slot is taller than the number), so it lands where its target does
  const part = (id: BuyPartId, className?: string) => (
    <div className={className}>
      <div data-explode={explode ? id : undefined} className="w-full">
        {parts.find((p) => p.id === id)?.node}
      </div>
    </div>
  )

  return (
    <div data-slot="buy-form" className={cn('flex h-full w-full flex-col px-uni-16', className)}>
      {part('header', 'shrink-0')}
      {part('amount', 'flex min-h-[104px] flex-1 items-center justify-center py-uni-12')}
      {part('cards', 'mb-uni-12 shrink-0')}
      {part('keypad', 'shrink-0')}
      {part('cost', 'shrink-0')}
      {part('actions', 'mb-uni-24 shrink-0')}
    </div>
  )
}
