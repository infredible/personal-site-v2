'use client'

import * as React from 'react'
import { PaletteSurface } from '@/components/uniswap'
import { ChevronRight } from '@/components/uniswap/icons'
import { TokenSelectorPanel } from '@/components/uniswap/swap/overlays/TokenSelectorPanel'
import { TokenSelectButton } from '@/components/uniswap/swap/parts'
import { MOCK_WALLET, TOKEN_LIST } from '@/components/uniswap/swap/tokens'
import type { Token } from '@/components/uniswap/swap/types'
import { cn } from '@/lib/utils'
import { otherSide, type PairSide, type TokenSelectorDemoState } from './presets'

/*
 * The Component view: the palette open and live, as the swap shows it, over
 * a small Sell → Buy pair it picks for. Picking a token fills the active
 * side; picking the other side's token flips the pair when the preset allows
 * it (otherAction "switch", as Uniswap does). Esc on an empty search, or the
 * close button, dismisses the palette; either side's pill opens it again.
 */

/**
 * While the exploded-view transition runs (html[data-view-transition]), parts
 * fly in from outside the palette. Lift its clipping so they're visible on the
 * way, and let the token list clip itself instead of the results scroller, so
 * the long list doesn't spill out below the card.
 */
const transitionClassName = cn(
  '[html[data-view-transition]_&]:overflow-visible',
  '[html[data-view-transition]_&_[data-slot=token-selector-results]]:flex',
  '[html[data-view-transition]_&_[data-slot=token-selector-results]]:flex-col',
  '[html[data-view-transition]_&_[data-slot=token-selector-results]]:overflow-visible',
  '[html[data-view-transition]_&_[data-explode=quick-picks]]:shrink-0',
  '[html[data-view-transition]_&_[data-explode=list]]:min-h-0',
  '[html[data-view-transition]_&_[data-explode=list]]:flex-1',
  '[html[data-view-transition]_&_[data-explode=list]]:overflow-hidden',
  // The footer's square background would show past the card's corners
  '[html[data-view-transition]_&_[data-explode=footer]]:rounded-b-uni-20',
)

const SIDE_LABEL: Record<PairSide, string> = { input: 'Sell', output: 'Buy' }

export function TokenSelectorDemo({
  initialState,
  onStateChange,
}: {
  initialState: TokenSelectorDemoState
  onStateChange?: (state: TokenSelectorDemoState) => void
}) {
  const [state, setState] = React.useState(initialState)
  const [open, setOpen] = React.useState(true)
  const [status, setStatus] = React.useState<string | null>(null)

  const update = (next: Partial<TokenSelectorDemoState>) => {
    const merged = { ...state, ...next }
    setState(merged)
    onStateChange?.(merged)
  }

  const other = otherSide(state.side)

  const select = (token: Token) => {
    if (state[other]?.symbol === token.symbol) {
      // Only reachable with otherAction "switch": "disable" makes the row unselectable
      update({ input: state.output, output: state.input })
      setStatus(`Switched: ${token.symbol} is now the ${SIDE_LABEL[state.side].toLowerCase()} token`)
      return
    }
    update({ [state.side]: token })
    setStatus(`Picked ${token.symbol} to ${SIDE_LABEL[state.side].toLowerCase()}`)
  }

  const choose = (side: PairSide) => {
    update({ side })
    setOpen(true)
  }

  const pair = `${state.input?.symbol ?? '—'} → ${state.output?.symbol ?? '—'}`

  return (
    <div className="flex w-full max-w-[680px] flex-col items-center gap-uni-12">
      <div className="flex flex-wrap items-center justify-center gap-uni-8">
        <SideSlot side="input" token={state.input} active={open && state.side === 'input'} onClick={() => choose('input')} />
        <ChevronRight aria-hidden className="size-uni-20 text-neutral3 @max-[440px]/viewport:hidden" />
        <SideSlot side="output" token={state.output} active={open && state.side === 'output'} onClick={() => choose('output')} />
      </div>
      <p className="flex flex-col items-center text-center text-body3 text-neutral2" aria-live="polite">
        <span>
          Selected: <span className="text-neutral1 tabular-nums">{pair}</span>
        </span>
        <span className="text-body4 text-neutral3">
          {status ?? (open ? `Choosing the ${SIDE_LABEL[state.side]} token` : 'Palette closed')}
        </span>
      </p>

      {open ? (
        <PaletteSurface title="Select a token" className={cn('mt-uni-4', transitionClassName)}>
          <TokenSelectorPanel
            explode="part"
            autoFocus
            tokens={TOKEN_LIST}
            balances={MOCK_WALLET.balances}
            selectedSymbol={state[state.side]?.symbol}
            otherSymbol={state[other]?.symbol}
            otherAction={state.otherAction}
            onSelect={select}
            onClose={() => {
              setOpen(false)
              setStatus(null)
            }}
            query={state.query}
            onQueryChange={(query) => update({ query })}
            category={state.category}
            onCategoryChange={(category) => update({ category })}
            chain={state.chain}
            onChainChange={(chain) => update({ chain })}
            loading={state.loading}
          />
        </PaletteSurface>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'mt-uni-24 flex h-uni-40 cursor-pointer items-center rounded-uni-full bg-accent2 px-uni-16 text-buttonLabel2 text-accent1',
            'outline-none select-none hover:bg-accent2Hovered focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent1',
            'transition-[scale] duration-100 ease-out active:scale-[0.98]',
          )}
        >
          Open token selector
        </button>
      )}
    </div>
  )
}

/** One side of the pair: its label and token pill. The active side is the one the palette picks for. */
function SideSlot({
  side,
  token,
  active,
  onClick,
}: {
  side: PairSide
  token?: Token
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      data-active={active || undefined}
      className={cn(
        'flex items-center gap-uni-8 rounded-uni-full border py-uni-4 pr-uni-4 pl-uni-16 transition-colors duration-150',
        active ? 'border-accent1/50 bg-accent2' : 'border-surface3 bg-surface2',
      )}
    >
      <span className="text-body3 text-neutral2">{SIDE_LABEL[side]}</span>
      <TokenSelectButton token={token} onClick={onClick} />
    </div>
  )
}
