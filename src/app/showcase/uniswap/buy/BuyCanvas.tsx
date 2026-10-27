'use client'

import * as React from 'react'
import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { UniswapScope } from '@/components/uniswap'
import {
  AmountDisplay,
  BALANCES,
  BUY_PARTS,
  BUY_PRESETS,
  BuyActions,
  BuyFlow,
  BuyWithPanel,
  MethodChip,
  NETWORK_COST_USD,
  NetworkCostRow,
  PAYMENT_METHODS,
  PROVIDER,
  ProviderRow,
  QUICK_AMOUNTS_USD,
  TokenRow,
  TokenTile,
  amountUsd,
  getBuyFormParts,
  getBuyPreset,
  receiveAmount,
  type BuyFormState,
  type BuyPartId,
  type BuySide,
  type PaymentMethodId,
  type PaySource,
} from '@/components/uniswap/buy'
import { TOKENS } from '@/components/uniswap/swap/tokens'
import type { Token } from '@/components/uniswap/swap/types'
import { cn } from '@/lib/utils'

/*
 * Canvas view of the buy prototype: the screen taken apart, then whole
 * screens in their states, both themes, the number's sizes, the sheet's
 * views, and its rows and controls. Screens and sheets are live (each frame
 * keeps its own state); rows and states are static snapshots.
 */

const SCREEN_WIDTH = 375
const SCREEN_HEIGHT = 760

/** A Uniswap-scoped surface for a frame. Follows the site theme unless forced. */
function Stage({
  theme,
  width = SCREEN_WIDTH,
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
      className={cn('rounded-uni-20 bg-surface1', className)}
      style={{ width, maxWidth: '100%' }}
    >
      {children}
    </UniswapScope>
  )
}

/** A whole phone screen, live */
function Screen({ preset, theme }: { preset: string; theme?: 'light' | 'dark' }) {
  const { state, sheet } = getBuyPreset(preset)
  return (
    <Stage theme={theme} className="overflow-hidden rounded-[36px] border border-surface3">
      <div style={{ height: SCREEN_HEIGHT }}>
        <BuyFlow initialState={state} initialSheet={sheet} className="pt-uni-16" />
      </div>
    </Stage>
  )
}

const PART_NOTES: Record<BuyPartId, string> = {
  header: 'Title and the overflow menu',
  amount: 'Digits rise in as typed, drop out on delete; ⇅ switches $ / token',
  cards: 'Top card pays; tap either to open the sheet, flip to trade places',
  keypad: '64px keys, no fill; a press scales the label and buzzes 25ms',
  cost: 'Skeleton on the first fetch, then the old value pulses',
  actions: 'Quick amounts at zero; Review rises in once there’s an amount',
}

/**
 * The live screen taken apart, one part per frame in an exploded vertical
 * stack, from the Component view's current state. The exploded-view
 * transition flies each part (data-explode-target) between here and the phone.
 */
function BuyAnatomy({ state }: { state: BuyFormState }) {
  const parts = getBuyFormParts({ state })
  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live screen, taken apart, in the state you left it: header, amount, the pay and receive cards, keypad, network cost, and the actions under it."
      direction="column"
    >
      {BUY_PARTS.map(({ id, label }) => (
        <CanvasFrame key={id} id={`part-${id}`} title={label} note={PART_NOTES[id]} labelPlacement="side">
          <Stage card className={cn('px-uni-16', id === 'amount' && 'py-uni-16')}>
            <div data-explode-target={id}>
              {parts.find((p) => p.id === id)?.node}
            </div>
          </Stage>
        </CanvasFrame>
      ))}
    </CanvasSection>
  )
}

const SCREEN_PRESETS = ['empty', 'amount', 'in-token', 'apple-pay', 'not-enough', 'over-limit']

const SCREEN_NOTES: Record<string, string> = {
  empty: 'Quick amounts until there’s a number',
  amount: 'Typed in dollars; the line under it is UNI',
  'in-token': 'Typed in UNI; balances read in tokens too',
  'apple-pay': 'A fiat method pays: limit instead of balance, flip off',
  'not-enough': 'More than the USDC balance',
  'over-limit': 'Topper’s $5,000 limit, with its 1.2% markup',
}

/** Amounts at each size step, with the length that triggers it */
const SIZES = [
  { amount: '0', note: '64px · up to 6 characters' },
  { amount: '125000', note: '56px · 7–8 characters' },
  { amount: '1250000', note: '48px · 9–10 characters' },
  { amount: '125000000', note: '40px · 11 and up' },
]

const amountFrame = (amount: string, denomination: 'usd' | 'token' = 'usd') => {
  const state = { amount, denomination, receive: TOKENS.UNI }
  return (
    <Stage className="py-uni-16">
      <AmountDisplay
        amount={amount}
        denomination={denomination}
        token={TOKENS.UNI}
        usd={amountUsd(state)}
        tokenAmount={receiveAmount(state)}
      />
    </Stage>
  )
}

/** The sheet's content inline, with its own chips, search and picks */
function SheetFrame({
  side = 'pay',
  method = 'tokens',
  query = '',
  usd = 0,
  pay = { kind: 'token', token: TOKENS.USDC },
  theme,
}: {
  side?: BuySide
  method?: PaymentMethodId
  query?: string
  usd?: number
  pay?: PaySource
  theme?: 'light' | 'dark'
}) {
  const [view, setView] = React.useState({ method, query, pay, receive: TOKENS.UNI as Token })
  return (
    <Stage theme={theme} className="overflow-hidden rounded-t-uni-20 rounded-b-uni-20 border border-surface3 pt-uni-20">
      <div style={{ height: 620 }}>
        <BuyWithPanel
          side={side}
          method={view.method}
          query={view.query}
          onMethodChange={(m) => setView((v) => ({ ...v, method: m, query: '' }))}
          onQueryChange={(q) => setView((v) => ({ ...v, query: q }))}
          pay={view.pay}
          receive={view.receive}
          usd={usd}
          balances={BALANCES}
          onSelectToken={(token) =>
            setView((v) => (side === 'pay' ? { ...v, pay: { kind: 'token', token } } : { ...v, receive: token }))
          }
          onSelectProvider={(m, provider) => setView((v) => ({ ...v, pay: { kind: 'fiat', method: m, provider } }))}
        />
      </div>
    </Stage>
  )
}

const actionStates = [
  { id: 'quick', title: 'Quick amounts', note: 'Dollars, in either unit; Max is the balance or limit', action: { kind: 'quick' } as const },
  { id: 'review', title: 'Review', note: 'Where the prototype ends', action: { kind: 'review' } as const },
  { id: 'not-enough', title: 'Not enough', note: 'Over the pay token’s balance', action: { kind: 'insufficient', label: 'Not enough USDC' } as const },
  { id: 'over-limit', title: 'Over limit', note: 'Over the provider’s limit', action: { kind: 'insufficient', label: 'Over Topper’s limit' } as const },
]

const costStates = [
  { id: 'none', title: 'No amount', props: { status: 'idle', hasAmount: false } as const },
  { id: 'first', title: 'First fetch', note: 'Skeleton the size of the value', props: { status: 'loading', hasAmount: true } as const },
  { id: 'refetch', title: 'Refetching', note: 'Old value stays and pulses', props: { status: 'loading', usd: NETWORK_COST_USD, hasAmount: true } as const },
  { id: 'ready', title: 'Ready', props: { status: 'ready', usd: NETWORK_COST_USD, hasAmount: true } as const },
]

const applePayProviders = [PROVIDER['coinbase-pay'], PROVIDER.transak, PROVIDER.topper]

export function BuyCanvas({ controller, anatomyState }: { controller: CanvasController; anatomyState: BuyFormState }) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2600} initialFocus="anatomy" aria-label="Buy flow component canvas">
      <BuyAnatomy state={anatomyState} />

      <CanvasSection
        id="screens"
        title="Screens"
        description="The whole screen in each state. Every frame is live: type on its keypad, open its sheet."
      >
        {SCREEN_PRESETS.map((id) => (
          <CanvasFrame key={id} id={`screen-${id}`} title={BUY_PRESETS.find((p) => p.id === id)?.label} note={SCREEN_NOTES[id]}>
            <Screen preset={id} />
          </CanvasFrame>
        ))}
      </CanvasSection>

      <CanvasSection id="themes" title="Themes" description="Uniswap’s light and dark tokens, with the sheet open on Apple Pay.">
        <CanvasFrame id="theme-light" title="Light">
          <Screen preset="sheet-providers" theme="light" />
        </CanvasFrame>
        <CanvasFrame id="theme-dark" title="Dark">
          <Screen preset="sheet-providers" theme="dark" />
        </CanvasFrame>
        <CanvasFrame id="theme-dark-amount" title="Dark · amount">
          <Screen preset="amount" theme="dark" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="amount"
        title="Amount"
        description="The number steps down as it grows, by its displayed length (commas count), so it stays on one line."
      >
        {SIZES.map(({ amount, note }) => (
          <CanvasFrame key={amount} id={`amount-${amount}`} title={amount === '0' ? 'Empty' : `$${Number(amount).toLocaleString('en-US')}`} note={note}>
            {amountFrame(amount)}
          </CanvasFrame>
        ))}
        <CanvasFrame id="amount-fraction" title="Typing a fraction" note="The fraction shows as typed, trailing dot included">
          {amountFrame('12.')}
        </CanvasFrame>
        <CanvasFrame id="amount-token" title="In UNI" note="The symbol follows; the line under it is dollars">
          {amountFrame('12.5', 'token')}
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="sheet"
        title="Buy with"
        description="The sheet’s views. Chips only change what’s in view; the pay side changes when a row is picked, and reopening lands on its chip."
      >
        <CanvasFrame id="sheet-tokens" title="Tokens" note="Your tokens by value, recent searches, popular">
          <SheetFrame />
        </CanvasFrame>
        <CanvasFrame id="sheet-limits" title="Apple Pay · no amount" note="Each provider’s limit">
          <SheetFrame method="apple-pay" />
        </CanvasFrame>
        <CanvasFrame id="sheet-costs" title="Apple Pay · $125" note="What you’d pay, cheapest first">
          <SheetFrame method="apple-pay" usd={125} />
        </CanvasFrame>
        <CanvasFrame id="sheet-venmo" title="Venmo" note="Fewer providers; “worse” is against the cheapest here">
          <SheetFrame method="venmo" usd={4500} pay={{ kind: 'fiat', method: 'venmo', provider: PROVIDER.transak }} />
        </CanvasFrame>
        <CanvasFrame id="sheet-receive" title="Receive" note="No chips; suggested tokens as tiles">
          <SheetFrame side="receive" />
        </CanvasFrame>
        <CanvasFrame id="sheet-search" title="Search · “u”" note="Symbol, then name, then anywhere">
          <SheetFrame query="u" />
        </CanvasFrame>
        <CanvasFrame id="sheet-empty" title="No results" note="Esc clears the search">
          <SheetFrame query="doge" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="rows" title="Rows" description="Provider rows show the limit until there’s an amount, then what you pay.">
        <CanvasFrame id="row-lowest" title="Lowest price">
          <Stage className="p-uni-8">
            <ProviderRow provider={applePayProviders[0]} worse={0} usd={0} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="row-worse" title="Worse · limit">
          <Stage className="p-uni-8">
            <ProviderRow provider={applePayProviders[1]} worse={0.014} usd={0} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="row-cost" title="You pay">
          <Stage className="p-uni-8">
            <ProviderRow provider={applePayProviders[1]} worse={0.014} usd={125} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="row-over" title="Over limit">
          <Stage className="p-uni-8">
            <ProviderRow provider={applePayProviders[2]} worse={0.012} usd={6000} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="row-selected" title="Selected" note="The provider paying now">
          <Stage className="p-uni-8">
            <ProviderRow provider={applePayProviders[0]} worse={0} usd={125} selected />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="row-token-owned" title="Token · held" note="Value and balance">
          <Stage className="p-uni-8">
            <TokenRow token={TOKENS.ETH} balance={BALANCES.ETH} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="row-token" title="Token · recent">
          <Stage className="p-uni-8">
            <TokenRow token={TOKENS.LINK} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="row-token-selected" title="Token · selected">
          <Stage className="p-uni-8">
            <TokenRow token={TOKENS.USDC} balance={BALANCES.USDC} selected />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="controls" title="Controls" description="Method chips invert when selected (brand marks keep their color), and token tiles.">
        <CanvasFrame id="chips" title="Method chips">
          <Stage width={560} className="flex flex-wrap gap-uni-8 p-uni-12">
            {PAYMENT_METHODS.map((m, i) => (
              <MethodChip key={m.id} method={m} selected={i === 1} />
            ))}
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="chips-dark" title="Method chips · dark">
          <Stage theme="dark" width={560} className="flex flex-wrap gap-uni-8 p-uni-12">
            {PAYMENT_METHODS.map((m, i) => (
              <MethodChip key={m.id} method={m} selected={i === 1} />
            ))}
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="tiles" title="Token tiles" note="Receive side; the token being bought is selected">
          <Stage className="grid grid-cols-5 gap-uni-4 p-uni-16">
            {[TOKENS.ETH, TOKENS.USDC, TOKENS.USDT, TOKENS.WBTC, TOKENS.UNI].map((t) => (
              <TokenTile key={t.symbol} token={t} selected={t.symbol === 'UNI'} />
            ))}
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection id="states" title="States" description="Under the keypad: the action slot and the network cost line.">
        {actionStates.map((s) => (
          <CanvasFrame key={s.id} id={`action-${s.id}`} title={s.title} note={s.note}>
            <Stage className="p-uni-16">
              <BuyActions action={s.action} quickAmounts={QUICK_AMOUNTS_USD} />
            </Stage>
          </CanvasFrame>
        ))}
        {costStates.map((s) => (
          <CanvasFrame key={s.id} id={`cost-${s.id}`} title={`Network cost · ${s.title.toLowerCase()}`} note={s.note}>
            <Stage className="px-uni-16">
              <NetworkCostRow {...s.props} />
            </Stage>
          </CanvasFrame>
        ))}
      </CanvasSection>
    </Canvas>
  )
}
