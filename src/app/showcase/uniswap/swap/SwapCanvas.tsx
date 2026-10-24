'use client'

import { useState } from 'react'
import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { ModalSurface, PaletteSurface, PopoverSurface, UniswapScope } from '@/components/uniswap'
import { CONFIRM_IN_WALLET, ORDER_PLACED, getSwapAction } from '@/components/uniswap/swap/getSwapAction'
import { getLimitPrice, withInvertedPrice, withLimitPreset, withLimitPrice } from '@/components/uniswap/swap/limit'
import { SwapReviewPanel, SwapSettingsPanel, TokenSelectorPanel } from '@/components/uniswap/swap/overlays'
import {
  CurrencyPanel,
  LimitFooter,
  LimitPricePanel,
  SwapActionButton,
  SwapDetails,
  SwapDetailsSkeleton,
  SwapHeader,
  SwapRateRow,
  SwitchButton,
  TokenSelectButton,
} from '@/components/uniswap/swap/parts'
import { getPreset, mockQuote } from '@/components/uniswap/swap/presets'
import { SwapFormView, useSwapFormParts, type SwapPartId } from '@/components/uniswap/swap/SwapFormView'
import { DEFAULT_SLIPPAGE, MOCK_WALLET, TOKEN_LIST, TOKENS } from '@/components/uniswap/swap/tokens'
import type { SwapFormState } from '@/components/uniswap/swap/types'
import { cn } from '@/lib/utils'

/*
 * Canvas view of the swap: each part, in its key states, laid out in labeled
 * frames. Parts are the same components SwapBox composes, rendered from fixed
 * props, so hover/press/focus work but data doesn't change.
 */

function preset(id: string): SwapFormState {
  const p = getPreset(id)
  if (!p) throw new Error(`Unknown swap preset: ${id}`)
  return p.state
}

/** A Uniswap-scoped surface for a frame. Follows the site theme unless forced. */
function Stage({
  theme,
  width = 480,
  card = false,
  className,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  /** Exploded-view card: its background fades in behind a part flying into it */
  card?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <UniswapScope
      theme={theme}
      data-explode-card={card ? '' : undefined}
      className={cn('rounded-uni-24 p-uni-16', className)}
      style={{ width, maxWidth: '100%' }}
    >
      {children}
    </UniswapScope>
  )
}

const filled = preset('filled')
const eth = TOKENS.ETH
const usdc = TOKENS.USDC
const filledQuote = mockQuote(eth, usdc, 1)

const actionPresets = [
  'disconnected',
  'select-output',
  'enter-amount',
  'loading-quote',
  'insufficient-balance',
  'no-route',
  'high-price-impact',
  'filled',
] as const

const PART_NOTES: Record<SwapPartId, string> = {
  header: 'Mode tabs and the settings gear',
  sell: 'Typed amount, token, balance',
  switch: 'Flips the pair',
  buy: 'Derived from the quote, or the limit price',
  price: 'Limit price: unit flips, presets beat market',
  action: 'Label and emphasis from getSwapAction',
  details: 'Rate, network cost, fees',
  footer: 'Expiry and network cost',
}

const limitActionPresets = ['limit', 'limit-below-market', 'limit-ready'] as const

const limitPricePresets = [
  { id: 'limit', title: 'At market', note: 'The price a new pair starts at' },
  { id: 'limit-ready', title: 'Above market', note: 'Selling: presets raise the price' },
  { id: 'limit-buy', title: 'Buying', note: 'Still per ETH, so better is lower: presets go negative' },
  { id: 'limit-custom', title: 'Typed, focused', note: 'Typing clears the preset' },
  { id: 'limit-below-market', title: 'Below market', note: 'Worse than a swap: critical, and the button blocks it' },
  { id: 'limit-far', title: 'Far from market', note: 'Over 2×: allowed, with a warning' },
] as const

/**
 * The live swap taken apart, one part per frame in an exploded vertical stack.
 * Rendered from the Component view's current state; the exploded-view
 * transition flies each part (data-explode-target) between here and the box.
 */
function SwapAnatomy({ state }: { state: SwapFormState }) {
  const parts = useSwapFormParts({ state })
  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live swap, taken apart. Each part is the same component the swap box composes, in the state you left it."
      direction="column"
    >
      {parts.map((part) => {
        const isSwitch = part.id === 'switch'
        return (
          <CanvasFrame key={part.id} id={`part-${part.id}`} title={part.label} note={PART_NOTES[part.id]} labelPlacement="side">
            <Stage card width={isSwitch ? 80 : 512} className={isSwitch ? 'flex justify-center p-uni-12' : undefined}>
              <div data-explode-target={part.id} className={isSwitch ? 'w-fit' : undefined}>
                {part.node}
              </div>
            </Stage>
          </CanvasFrame>
        )
      })}
    </CanvasSection>
  )
}

export function SwapCanvas({ controller, anatomyState }: { controller: CanvasController; anatomyState: SwapFormState }) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2400} initialFocus="anatomy" aria-label="Swap component canvas">
      <SwapAnatomy state={anatomyState} />

      <CanvasSection
        id="overview"
        title="Swap form"
        description="The composed form in its ready state, in both themes. Every part below is the same component."
      >
        <CanvasFrame id="form-light" title="Filled · light">
          <Stage theme="light" width={512}>
            <SwapFormView state={filled} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="form-dark" title="Filled · dark">
          <Stage theme="dark" width={512}>
            <SwapFormView state={filled} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="form-mobile" title="Mobile · 375px" note="Same form at phone width">
          <Stage width={375} className="p-uni-8">
            <SwapFormView state={preset('enter-amount')} />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="limit"
        title="Limit"
        description="Sell and Buy stay where the Swap tab has them; the price goes under Buy, with no second token picker. Expiry and cost share the footer."
      >
        <CanvasFrame id="limit-light" title="Ready · light">
          <Stage theme="light" width={512}>
            <SwapFormView state={preset('limit-ready')} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="limit-dark" title="Ready · dark">
          <Stage theme="dark" width={512}>
            <SwapFormView state={preset('limit-ready')} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="limit-mobile" title="Mobile · 375px" note="Buying ETH with USDC">
          <Stage width={375} className="p-uni-8">
            <SwapFormView state={preset('limit-buy')} />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="limit-price"
        title="Limit price"
        description="Quoted in the pricier token, so it reads like a chart either way round. Presets are always better than market for you. Each frame is live: type, pick presets, flip the unit."
      >
        {limitPricePresets.map(({ id, title, note }) => (
          <CanvasFrame key={id} id={`limit-price-${id}`} title={title} note={note}>
            <LimitPriceFrame presetId={id} />
          </CanvasFrame>
        ))}
        <CanvasFrame id="limit-price-no-pair" title="No pair" note="Nothing to price until both tokens are chosen">
          <Stage>
            <LimitPricePanel value="" preset={0} />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="limit-parts" title="Limit footer and button">
        <CanvasFrame id="limit-footer" title="Footer" note="Expiry is a menu; placing is a signature, so no gas">
          <Stage>
            <LimitFooter expiry="1w" onExpiryChange={() => {}} />
          </Stage>
        </CanvasFrame>
        {limitActionPresets.map((id) => {
          const p = getPreset(id)!
          const action = getSwapAction(p.state)
          return (
            <CanvasFrame key={id} id={`action-${id}`} title={action.label} note={p.label}>
              <Stage width={360}>
                <SwapActionButton action={action} onClick={() => {}} />
              </Stage>
            </CanvasFrame>
          )
        })}
        <CanvasFrame id="action-limit-signing" title={CONFIRM_IN_WALLET.label} note="Waiting on the signature">
          <Stage width={360}>
            <SwapActionButton action={CONFIRM_IN_WALLET} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="action-limit-placed" title={ORDER_PLACED.label} note="Signed; the form clears">
          <Stage width={360}>
            <SwapActionButton action={ORDER_PLACED} />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="header" title="Header" description="Mode tabs and the settings gear. Custom slippage shows on the gear.">
        <CanvasFrame id="header-default" title="Default">
          <Stage>
            <SwapHeader mode="swap" onModeChange={() => {}} onSettingsClick={() => {}} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="header-slippage" title="Custom slippage" note="Badge on the gear when slippage isn't Auto">
          <Stage>
            <SwapHeader mode="swap" onModeChange={() => {}} onSettingsClick={() => {}} customSlippage={0.01} />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="panels"
        title="Sell / Buy panels"
        description="The focused panel lifts to surface1 with a border; the other sits on surface2."
      >
        <CanvasFrame id="sell-empty" title="Sell · empty, focused">
          <Stage>
            <CurrencyPanel field="input" label="Sell" token={eth} amount="" balance={MOCK_WALLET.balances.ETH} focused />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="sell-filled" title="Sell · filled" note="Hover to reveal the 25% / 50% / 75% / Max presets">
          <Stage>
            <CurrencyPanel
              field="input"
              label="Sell"
              token={eth}
              amount="1"
              usdValue={eth.priceUsd}
              balance={MOCK_WALLET.balances.ETH}
              onPercent={() => {}}
              onMax={() => {}}
            />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="sell-insufficient" title="Sell · insufficient balance">
          <Stage>
            <CurrencyPanel
              field="input"
              label="Sell"
              token={eth}
              amount="5"
              usdValue={eth.priceUsd * 5}
              balance={MOCK_WALLET.balances.ETH}
              error
              focused
            />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="buy-no-token" title="Buy · no token" note="Branded Select token pill">
          <Stage>
            <CurrencyPanel field="output" label="Buy" amount="" onTokenClick={() => {}} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="buy-loading" title="Buy · loading quote" note="Derived amount pulses while the quote refreshes">
          <Stage>
            <CurrencyPanel
              field="output"
              label="Buy"
              token={usdc}
              amount={filledQuote.outputAmount}
              usdValue={eth.priceUsd}
              balance={MOCK_WALLET.balances.USDC}
              loading
            />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="controls" title="Controls">
        <CanvasFrame id="token-pill" title="Token select · with token">
          <Stage width={200} className="flex justify-center">
            <TokenSelectButton token={eth} onClick={() => {}} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="token-pill-empty" title="Token select · empty">
          <Stage width={200} className="flex justify-center">
            <TokenSelectButton onClick={() => {}} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="switch-button" title="Switch direction" note="Click: spins and flips the pair">
          <Stage width={200} className="flex justify-center bg-surface2">
            <SwitchButton onClick={() => {}} />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="action-button"
        title="Action button"
        description="Label and emphasis derived from form state by getSwapAction, in Uniswap's order of checks."
      >
        {actionPresets.map((id) => {
          const p = getPreset(id)!
          const action = getSwapAction(p.state)
          return (
            <CanvasFrame key={id} id={`action-${id}`} title={action.label} note={p.label}>
              <Stage width={360}>
                <SwapActionButton action={action} onClick={() => {}} />
              </Stage>
            </CanvasFrame>
          )
        })}
      </CanvasSection>

      <CanvasSection id="details" title="Details" description="Rate row flips on click. The details row expands to fees, slippage, and routing.">
        <CanvasFrame id="rate-row" title="Rate">
          <Stage>
            <SwapRateRow inputToken={eth} outputToken={usdc} rate={filledQuote.quote.rate!} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="details-collapsed" title="Details · collapsed">
          <Stage>
            <SwapDetails
              inputToken={eth}
              outputToken={usdc}
              quote={filledQuote.quote}
              outputAmount={filledQuote.quote.rate!}
              slippage={DEFAULT_SLIPPAGE}
            />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="details-expanded" title="Details · expanded">
          <Stage>
            <SwapDetails
              inputToken={eth}
              outputToken={usdc}
              quote={filledQuote.quote}
              outputAmount={filledQuote.quote.rate!}
              slippage={DEFAULT_SLIPPAGE}
              defaultExpanded
            />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="loading"
        title="Loading"
        description="Skeletons where data hasn't arrived yet: a surface3 pill sized to the text it replaces, under a sweeping shimmer. A refetch keeps old values on screen and pulses them instead."
      >
        <CanvasFrame id="loading-page" title="Form · page load" note="Balances loading; Max presets hidden until they land">
          <Stage>
            <SwapFormView state={preset('page-load')} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="loading-first-quote" title="Form · first quote" note="Nothing to pulse yet, so Buy and the footer are skeletons">
          <Stage>
            <SwapFormView state={preset('first-quote')} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="loading-balance" title="Sell · balance loading">
          <Stage>
            <CurrencyPanel field="input" label="Sell" token={eth} amount="" balance={MOCK_WALLET.balances.ETH} balanceLoading focused />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="loading-buy" title="Buy · first quote">
          <Stage>
            <CurrencyPanel field="output" label="Buy" token={usdc} amount="" balance={MOCK_WALLET.balances.USDC} loading />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="loading-details" title="Details · first quote">
          <Stage>
            <SwapDetailsSkeleton />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="loading-token-list" title="Token selector · loading" note="Rows fade out down the list, as Uniswap's Loader.Token">
          <Stage width={680} className="bg-transparent p-0">
            <PaletteSurface title="Select a token">
              <TokenSelectorPanel tokens={TOKEN_LIST} balances={MOCK_WALLET.balances} onClose={() => {}} loading />
            </PaletteSurface>
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="overlays"
        title="Overlays"
        description="Rendered inline here; the live swap shows the same panels in a modal or popover."
      >
        <CanvasFrame
          id="token-selector"
          title="Token selector"
          note="A command palette: type, ↑↓ ↵, ⇥ for category, ⌘K for network. ETH selected; USDC is on the other side"
        >
          <Stage width={680} className="bg-transparent p-0">
            <PaletteSurface title="Select a token">
              <TokenSelectorPanel
                tokens={TOKEN_LIST}
                balances={MOCK_WALLET.balances}
                selectedSymbol="ETH"
                otherSymbol="USDC"
                onClose={() => {}}
              />
            </PaletteSurface>
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="settings" title="Settings" note="Try a custom slippage like 25">
          <SettingsFrame />
        </CanvasFrame>
        {(['review', 'pending', 'success'] as const).map((status) => (
          <CanvasFrame key={status} id={`review-${status}`} title={`Review · ${status}`}>
            <Stage width={452} className="bg-transparent p-0">
              <ModalSurface>
                <SwapReviewPanel
                  input={{ token: eth, amount: '1' }}
                  output={{ token: usdc, amount: filledQuote.outputAmount }}
                  quote={filledQuote.quote}
                  slippage={DEFAULT_SLIPPAGE}
                  status={status}
                  onClose={() => {}}
                  onConfirm={() => {}}
                />
              </ModalSurface>
            </Stage>
          </CanvasFrame>
        ))}
      </CanvasSection>
    </Canvas>
  )
}

/** The price panel is controlled; local state through the same helpers SwapBox uses. */
function LimitPriceFrame({ presetId }: { presetId: string }) {
  const [state, setState] = useState(() => preset(presetId))
  return (
    <Stage>
      <LimitPricePanel
        price={getLimitPrice(state)}
        value={state.limit.price}
        preset={state.limit.preset}
        focused={state.focusedField === 'price' || undefined}
        onValueChange={(price) => setState((s) => withLimitPrice(s, price))}
        onPresetSelect={(value) => setState((s) => withLimitPreset(s, value))}
        onInvert={() => setState(withInvertedPrice)}
      />
    </Stage>
  )
}

/** Settings is controlled; give the frame local state so the inputs respond. */
function SettingsFrame() {
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [deadline, setDeadline] = useState(30)
  return (
    <Stage width={352} className="bg-transparent p-0">
      <PopoverSurface>
        <SwapSettingsPanel
          slippage={slippage}
          onSlippageChange={setSlippage}
          deadlineMinutes={deadline}
          onDeadlineChange={setDeadline}
        />
      </PopoverSurface>
    </Stage>
  )
}
