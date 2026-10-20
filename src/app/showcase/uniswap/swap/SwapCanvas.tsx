'use client'

import { useState } from 'react'
import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { ModalSurface, PopoverSurface, UniswapScope } from '@/components/uniswap'
import { getSwapAction } from '@/components/uniswap/swap/getSwapAction'
import { SwapReviewPanel, SwapSettingsPanel, TokenSelectorPanel } from '@/components/uniswap/swap/overlays'
import {
  CurrencyPanel,
  SwapActionButton,
  SwapDetails,
  SwapHeader,
  SwapRateRow,
  SwitchButton,
  TokenSelectButton,
} from '@/components/uniswap/swap/parts'
import { getPreset, mockQuote } from '@/components/uniswap/swap/presets'
import { SwapFormView } from '@/components/uniswap/swap/SwapFormView'
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
  className,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <UniswapScope theme={theme} className={cn('rounded-uni-24 p-uni-16', className)} style={{ width, maxWidth: '100%' }}>
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

export function SwapCanvas({ controller }: { controller: CanvasController }) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2400} initialFocus="overview" aria-label="Swap component canvas">
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
        id="overlays"
        title="Overlays"
        description="Rendered inline here; the live swap shows the same panels in a modal or popover."
      >
        <CanvasFrame id="token-selector" title="Token selector" note="Search and arrow keys work">
          <Stage width={452} className="bg-transparent p-0">
            <ModalSurface title="Select a token" onClose={() => {}}>
              <TokenSelectorPanel tokens={TOKEN_LIST} balances={MOCK_WALLET.balances} selectedSymbol="ETH" />
            </ModalSurface>
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
