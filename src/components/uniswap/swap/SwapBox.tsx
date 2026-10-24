'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {
  UniModal,
  UniPaletteContent,
  modalContentClassName,
  modalOverlayClassName,
  modalSurfaceClassName,
  popoverSurfaceClassName,
  uniswapScopeClassName,
} from '@/components/uniswap'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { parseAmount } from './format'
import { CONFIRM_IN_WALLET, ORDER_PLACED } from './getSwapAction'
import { requoteLimit, withInvertedPrice, withLimitPreset, withLimitPrice } from './limit'
import { mockQuote } from './presets'
import { formatDerivedAmount, toAmountString } from './parts'
import { SwapFormView } from './SwapFormView'
import { SwapReviewPanel, SwapSettingsPanel, TokenSelectorPanel, type SwapReviewStatus } from './overlays'
import { TOKEN_LIST } from './tokens'
import type { SwapField, SwapFormState, Token } from './types'

/*
 * The live swap: owns SwapFormState and drives the display parts with a fake
 * quote engine (deterministic prices, short simulated latency), the token
 * selector, settings popover, and the review → wallet → success flow.
 *
 * On the Limit tab the derived side follows the limit price instead, with no
 * quote to wait for. Placing an order skips the review modal: the form already
 * says everything the review would, so the button waits on the wallet
 * signature, reads "Order placed" for a moment, and the form clears.
 */

const QUOTE_LATENCY_MS = 450
const BALANCES_LATENCY_MS = 900
const TOKEN_LIST_LATENCY_MS = 600
const SIGN_LATENCY_MS = 1400
const PLACED_MS = 1600

/** Fake price impact: grows with trade size so large swaps show warnings. */
function priceImpactFor(usdValue: number) {
  return Math.min(0.3, 0.0005 + usdValue / 1_500_000)
}

function requote(state: SwapFormState): SwapFormState {
  const { input, output, exactField } = state
  const exact = exactField === 'input' ? input : output
  const amount = parseAmount(exact.amount)
  if (!input.token || !output.token || !Number.isFinite(amount) || amount === 0) {
    const cleared = exactField === 'input' ? { output: { ...output, amount: '' } } : { input: { ...input, amount: '' } }
    return { ...state, ...cleared, quote: { status: 'idle' } }
  }
  const usd = amount * exact.token!.priceUsd
  const { quote } = mockQuote(input.token, output.token, 1, { priceImpact: priceImpactFor(usd) })
  const rate = quote.rate ?? 0
  if (exactField === 'input') {
    return { ...state, output: { ...output, amount: formatDerivedAmount(amount * rate, output.token.decimals) }, quote }
  }
  return { ...state, input: { ...input, amount: formatDerivedAmount(amount / rate, input.token.decimals) }, quote }
}

interface ReviewSnapshot {
  status: SwapReviewStatus
  stage: 'wallet' | 'submitted'
  input: { token: Token; amount: string }
  output: { token: Token; amount: string }
  quote: SwapFormState['quote']
  slippage: SwapFormState['slippage']
}

export interface SwapBoxProps {
  initialState: SwapFormState
  /** Simulate a page load: wallet balances start loading and resolve after a short delay. */
  simulateLoading?: boolean
  /** Called once simulated loading finishes. */
  onLoaded?: () => void
  /** Reports every state change, e.g. so a showcase can render the same state elsewhere. */
  onStateChange?: (state: SwapFormState) => void
  /** Shows a chart toggle in the header (for a page that renders a chart beside the box) */
  onChartToggle?: () => void
  chartVisible?: boolean
  className?: string
}

export function SwapBox({ initialState, simulateLoading = false, onLoaded, onStateChange, onChartToggle, chartVisible, className }: SwapBoxProps) {
  const [state, setState] = React.useState<SwapFormState>(() =>
    simulateLoading && initialState.wallet.connected
      ? { ...initialState, wallet: { ...initialState.wallet, balancesLoading: true } }
      : initialState,
  )
  const [tokenListLoaded, setTokenListLoaded] = React.useState(false)
  const [selecting, setSelecting] = React.useState<SwapField | null>(null)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [deadline, setDeadline] = React.useState(30)
  const [review, setReview] = React.useState<{ status: SwapReviewStatus; stage: 'wallet' | 'submitted' } | null>(null)
  const [placing, setPlacing] = React.useState<'signing' | 'placed' | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const signTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // What the review modal shows. Kept after close so the exit animation plays on
  // the last content instead of an empty card (closing a success also clears the form).
  const lastReview = React.useRef<ReviewSnapshot | null>(null)
  if (review && state.input.token && state.output.token) {
    lastReview.current = {
      ...review,
      input: { token: state.input.token, amount: state.input.amount },
      output: { token: state.output.token, amount: state.output.amount },
      quote: state.quote,
      slippage: state.slippage,
    }
  }
  const shownReview = lastReview.current

  React.useEffect(
    () => () => {
      clearTimeout(timer.current)
      clearTimeout(signTimer.current)
    },
    [],
  )

  const onStateChangeRef = React.useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  React.useEffect(() => onStateChangeRef.current?.(state), [state])

  // Balances resolve after a delay (page load simulation, or the page-load preset)
  const balancesLoading = Boolean(state.wallet.balancesLoading)
  const onLoadedRef = React.useRef(onLoaded)
  onLoadedRef.current = onLoaded
  React.useEffect(() => {
    if (!balancesLoading) return
    const id = setTimeout(() => {
      setState((s) => ({ ...s, wallet: { ...s.wallet, balancesLoading: false } }))
      onLoadedRef.current?.()
    }, BALANCES_LATENCY_MS)
    return () => clearTimeout(id)
  }, [balancesLoading])

  // The token list loads the first time the selector opens
  React.useEffect(() => {
    if (selecting === null || tokenListLoaded) return
    const id = setTimeout(() => setTokenListLoaded(true), TOKEN_LIST_LATENCY_MS)
    return () => clearTimeout(id)
  }, [selecting, tokenListLoaded])

  /** Applies a change, then shows a loading quote and resolves it after the fake latency. */
  const update = React.useCallback((change: (s: SwapFormState) => SwapFormState) => {
    clearTimeout(timer.current)
    setState((prev) => {
      const next = change(prev)
      // Limit amounts are plain math on the price: nothing to fetch
      if (next.mode === 'limit') return requoteLimit(next)
      const resolved = requote(next)
      if (resolved.quote.status === 'idle') return resolved
      timer.current = setTimeout(() => setState((s) => requote(s)), QUOTE_LATENCY_MS)
      // Keep the previous derived amount visible (pulsing) while loading, like Uniswap's refetch state
      return { ...next, quote: { ...prev.quote, status: 'loading' } }
    })
  }, [])

  const setAmount = (field: SwapField, amount: string) =>
    update((s) => ({ ...s, exactField: field, [field]: { ...s[field], amount } }))

  const setFraction = (fraction: number) =>
    update((s) => {
      const token = s.input.token
      const balance = token ? s.wallet.balances[token.symbol] ?? 0 : 0
      return { ...s, exactField: 'input', input: { ...s.input, amount: toAmountString(balance * fraction, token?.decimals) } }
    })

  const selectToken = (token: Token) => {
    const field = selecting
    setSelecting(null)
    if (!field) return
    update((s) => {
      const other = field === 'input' ? 'output' : 'input'
      // Picking the other side's token flips the pair, as Uniswap does
      if (s[other].token?.symbol === token.symbol) {
        return { ...s, input: { ...s.output }, output: { ...s.input }, exactField: other }
      }
      return { ...s, [field]: { ...s[field], token } }
    })
  }

  const switchTokens = () =>
    update((s) => ({
      ...s,
      input: { ...s.output },
      output: { ...s.input },
      exactField: s.exactField === 'input' ? 'output' : 'input',
      focusedField: s.focusedField === 'input' ? 'output' : s.focusedField === 'output' ? 'input' : s.focusedField,
    }))

  const placeOrder = () => {
    setPlacing('signing')
    signTimer.current = setTimeout(() => {
      setPlacing('placed')
      setState((s) => ({ ...s, input: { ...s.input, amount: '' }, output: { ...s.output, amount: '' } }))
      signTimer.current = setTimeout(() => setPlacing(null), PLACED_MS)
    }, SIGN_LATENCY_MS)
  }

  const confirm = () => {
    setReview({ status: 'pending', stage: 'wallet' })
    timer.current = setTimeout(() => {
      setReview({ status: 'pending', stage: 'submitted' })
      timer.current = setTimeout(() => setReview({ status: 'success', stage: 'submitted' }), 1600)
    }, 1400)
  }

  const closeReview = () => {
    clearTimeout(timer.current)
    if (review?.status === 'success') {
      setState((s) => ({ ...s, input: { ...s.input, amount: '' }, output: { ...s.output, amount: '' }, quote: { status: 'idle' } }))
    }
    setReview(null)
  }

  return (
    <div className={cn('w-full max-w-[480px]', className)}>
      <PopoverPrimitive.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <div className="relative">
          {/* Settings opens under the gear at the form's top-right, as on Uniswap web */}
          <PopoverPrimitive.Anchor className="absolute top-[40px] right-0 size-0" />
          <SwapFormView
            state={state}
            // Through update: the derived amount switches between the quote and the limit price
            onModeChange={(mode) => update((s) => ({ ...s, mode }))}
            onSettingsClick={() => setSettingsOpen((o) => !o)}
            onChartToggle={onChartToggle}
            chartVisible={chartVisible}
            onAmountChange={setAmount}
            onFocusField={(field) => setState((s) => ({ ...s, focusedField: field }))}
            onTokenClick={setSelecting}
            onMax={() => setFraction(1)}
            onPercent={setFraction}
            onQuickSelect={(token) => update((s) => ({ ...s, output: { ...s.output, token } }))}
            onSwitch={switchTokens}
            actionOverride={placing === 'signing' ? CONFIRM_IN_WALLET : placing === 'placed' ? ORDER_PLACED : undefined}
            onLimitPriceChange={(price) => update((s) => withLimitPrice(s, price))}
            onLimitPreset={(preset) => update((s) => withLimitPreset(s, preset))}
            onLimitInvert={() => update(withInvertedPrice)}
            onLimitExpiryChange={(expiry) => setState((s) => ({ ...s, limit: { ...s.limit, expiry } }))}
            onAction={(action) => {
              if (action.kind === 'review') setReview({ status: 'review', stage: 'wallet' })
              if (action.kind === 'place-order') placeOrder()
              if (action.kind === 'select-token') setSelecting(state.input.token ? 'output' : 'input')
              if (action.kind === 'connect-wallet') setState((s) => ({ ...s, wallet: { ...s.wallet, connected: true } }))
            }}
          />
        </div>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            side="bottom"
            sideOffset={4}
            // Don't focus the first info icon on open: it would pop its tooltip
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              uniswapScopeClassName,
              popoverSurfaceClassName,
              // Grows from the gear (Radix's computed origin), 150ms in / 100ms out
              'z-50 origin-(--radix-popover-content-transform-origin) ease-[cubic-bezier(0.23,1,0.32,1)]',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-150',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97] data-[state=closed]:duration-100',
              'motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100',
            )}
          >
            <SwapSettingsPanel
              slippage={state.slippage}
              onSlippageChange={(slippage) => setState((s) => ({ ...s, slippage }))}
              deadlineMinutes={deadline}
              onDeadlineChange={setDeadline}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <UniModal open={selecting !== null} onOpenChange={(open) => !open && setSelecting(null)}>
        <UniPaletteContent title="Select a token">
          {selecting && (
            <TokenSelectorPanel
              tokens={TOKEN_LIST}
              balances={state.wallet.balances}
              selectedSymbol={state[selecting].token?.symbol}
              // Picking the other side's token flips the pair (selectToken), so it stays selectable
              otherSymbol={state[selecting === 'input' ? 'output' : 'input'].token?.symbol}
              otherAction="switch"
              onSelect={selectToken}
              onClose={() => setSelecting(null)}
              loading={!tokenListLoaded || balancesLoading}
              autoFocus
            />
          )}
        </UniPaletteContent>
      </UniModal>

      {/* Review draws its own header, so it uses the bare dialog parts rather than UniModalContent */}
      <DialogPrimitive.Root open={review !== null} onOpenChange={(open) => !open && closeReview()}>
        <DialogPortal>
          <DialogOverlay className={modalOverlayClassName} />
          {/* The surface classes live on Content itself: the scope class gives its element a
              surface1 background, so a separate inner card left square corners behind it. */}
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(uniswapScopeClassName, modalSurfaceClassName, modalContentClassName)}
          >
            <DialogPrimitive.Title className="sr-only">Review swap</DialogPrimitive.Title>
            {shownReview && (
              <SwapReviewPanel
                input={shownReview.input}
                output={shownReview.output}
                quote={shownReview.quote}
                slippage={shownReview.slippage}
                status={shownReview.status}
                pendingStage={shownReview.stage}
                onConfirm={confirm}
                onClose={closeReview}
              />
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>
    </div>
  )
}
