'use client'

import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { PaletteSurface, UniswapScope } from '@/components/uniswap'
import {
  TOKEN_SELECTOR_PARTS,
  TokenSelectorPanel,
  TokenSelectorRowPreview,
  type TokenSelectorPanelProps,
  type TokenSelectorPartId,
} from '@/components/uniswap/swap/overlays/TokenSelectorPanel'
import { CATEGORY_FILTERS } from '@/components/uniswap/swap/overlays/tokenSelectorFilters'
import { CHAINS, MOCK_WALLET, TOKEN_LIST, TOKENS } from '@/components/uniswap/swap/tokens'
import { cn } from '@/lib/utils'
import { otherSide, type TokenSelectorDemoState } from './presets'

/*
 * Canvas view of the token selector: the palette taken apart, then its rows,
 * filters, search, loading and themes in labeled frames. Every frame is the
 * real panel (uncontrolled, so each one can be typed in and arrowed through)
 * or one of its rows.
 */

const balances = MOCK_WALLET.balances
const base = CHAINS.find((c) => c.id === 'base')!

/** A Uniswap-scoped surface for a frame. Follows the site theme unless forced. */
function Stage({
  theme,
  width = 680,
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
      className={cn('rounded-uni-20', className)}
      style={{ width, maxWidth: '100%' }}
    >
      {children}
    </UniswapScope>
  )
}

/** The whole palette, inline in its card. */
function Palette({ theme, ...props }: TokenSelectorPanelProps & { theme?: 'light' | 'dark' }) {
  return (
    <Stage theme={theme} className="bg-transparent">
      <PaletteSurface title="Select a token">
        <TokenSelectorPanel tokens={TOKEN_LIST} balances={balances} selectedSymbol="ETH" {...props} />
      </PaletteSurface>
    </Stage>
  )
}

const PART_NOTES: Record<TokenSelectorPartId, string> = {
  search: 'The search field is the title bar; network menu (⌘K) on the right',
  filters: '⇥ / ⇧⇥ cycle the categories',
  'quick-picks': 'Common tokens; only with no search and the All category',
  list: 'Your tokens by value, then the rest by popularity; sticky headings',
  footer: 'Keyboard hints, hidden on touch and narrow widths',
}

/**
 * Per-part stage tweaks. Parts fly in and out of these frames, so nothing
 * around them clips: the results scroller is opened up, and the token list
 * clips itself to about the height it has in the palette.
 */
const PART_STAGE: Partial<Record<TokenSelectorPartId, string>> = {
  'quick-picks': '[&_[data-slot=token-selector-results]]:overflow-visible',
  list: cn(
    '[&_[data-slot=token-selector-results]]:overflow-visible',
    '[&_[data-explode-target=list]]:max-h-[372px] [&_[data-explode-target=list]]:overflow-hidden',
  ),
  footer: '[&_[data-explode-target=footer]]:rounded-uni-20',
}

/**
 * The live palette taken apart, one region per frame in an exploded vertical
 * stack. Rendered from the Component view's current state; the exploded-view
 * transition flies each region (data-explode-target) between here and the palette.
 */
function TokenSelectorAnatomy({ state }: { state: TokenSelectorDemoState }) {
  const shared: TokenSelectorPanelProps = {
    tokens: TOKEN_LIST,
    balances,
    selectedSymbol: state[state.side]?.symbol,
    otherSymbol: state[otherSide(state.side)]?.symbol,
    otherAction: state.otherAction,
    defaultQuery: state.query,
    defaultCategory: state.category,
    defaultChain: state.chain,
    loading: state.loading,
    onClose: () => {},
    explode: 'target',
  }
  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live palette, taken apart. Each region is the same panel, in the state you left it: search, filters, quick picks, the list, and the footer."
      direction="column"
    >
      {TOKEN_SELECTOR_PARTS.map((part) => (
        <CanvasFrame key={part.id} id={`part-${part.id}`} title={part.label} note={PART_NOTES[part.id]} labelPlacement="side">
          <Stage card className={PART_STAGE[part.id]}>
            <TokenSelectorPanel
              {...shared}
              // Quick picks only show without a search or category, so their frame always clears both
              {...(part.id === 'quick-picks' && { defaultQuery: '', defaultCategory: 'all' as const })}
              parts={[part.id]}
              label={part.label}
            />
          </Stage>
        </CanvasFrame>
      ))}
    </CanvasSection>
  )
}

const rowStates = [
  { id: 'default', title: 'Default', note: 'Not held: price and 24h change', props: { token: TOKENS.UNI } },
  { id: 'active', title: 'Active · hover', note: 'Keyboard highlight; hover moves it', props: { token: TOKENS.UNI, active: true } },
  {
    id: 'selected',
    title: 'Selected',
    note: 'Already chosen for this side',
    props: { token: TOKENS.ETH, balance: balances.ETH, selected: true },
  },
  {
    id: 'unavailable',
    title: 'Unavailable',
    note: 'The other side’s token, with otherAction "disable"',
    props: { token: TOKENS.USDC, balance: balances.USDC, unavailable: true },
  },
  {
    id: 'switch',
    title: 'Switch',
    note: 'The other side’s token, with otherAction "switch": picking it flips the pair',
    props: { token: TOKENS.USDC, balance: balances.USDC, switches: true },
  },
  { id: 'owned', title: 'Owned', note: 'Held: value and balance', props: { token: TOKENS.DAI, balance: balances.DAI } },
  { id: 'price-down', title: 'Price · down', note: 'Not held, falling', props: { token: TOKENS.AAVE } },
  { id: 'network', title: 'Network badge', note: 'With a network filter on', props: { token: TOKENS.UNI, chain: base } },
]

export function TokenSelectorCanvas({
  controller,
  anatomyState,
}: {
  controller: CanvasController
  anatomyState: TokenSelectorDemoState
}) {
  return (
    <Canvas
      controller={controller}
      className="h-full"
      maxRowWidth={2400}
      initialFocus="anatomy"
      aria-label="Token selector component canvas"
    >
      <TokenSelectorAnatomy state={anatomyState} />

      <CanvasSection
        id="themes"
        title="Palette"
        description="The assembled palette in both themes. Type, ↑↓ ↵, ⇥ for category, ⌘K for network; esc clears the search."
      >
        <CanvasFrame id="palette-light" title="Light">
          <Palette theme="light" otherSymbol="USDC" />
        </CanvasFrame>
        <CanvasFrame id="palette-dark" title="Dark">
          <Palette theme="dark" otherSymbol="USDC" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="rows"
        title="Rows"
        description="56px rows: logo, name and symbol, and a right-aligned value column that's always there, whatever the state."
      >
        {rowStates.map((row) => (
          <CanvasFrame key={row.id} id={`row-${row.id}`} title={row.title} note={row.note}>
            <Stage width={480} className="p-uni-8">
              <TokenSelectorRowPreview {...row.props} />
            </Stage>
          </CanvasFrame>
        ))}
      </CanvasSection>

      <CanvasSection
        id="filters"
        title="Filters"
        description="Category chips and the network menu narrow the same list; quick picks only show on All."
      >
        {CATEGORY_FILTERS.map((c) => (
          <CanvasFrame key={c.id} id={`filter-${c.id}`} title={c.label}>
            <Palette defaultCategory={c.id} />
          </CanvasFrame>
        ))}
        <CanvasFrame id="filter-network-menu" title="Network menu" note="⌘K opens it; ↑↓ ↵ inside, with a count per network">
          <Palette defaultNetworkMenuOpen />
        </CanvasFrame>
        <CanvasFrame id="filter-base" title="On Base" note="Chain badge on every logo">
          <Palette defaultChain="base" />
        </CanvasFrame>
        <CanvasFrame id="filter-empty" title="Nothing on this network" note="Empty state offers to clear the filters (↵)">
          <Palette defaultCategory="meme" defaultChain="base" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="search"
        title="Search"
        description="Ranked: exact symbol, symbol prefix, name prefix, word start in the name, then substrings; ties by your balance."
      >
        <CanvasFrame id="search-eth" title="Ranking · “eth”" note="ETH (exact) before WETH and Ethereum Name Service">
          <Palette defaultQuery="eth" />
        </CanvasFrame>
        <CanvasFrame id="search-name" title="Word start · “name”" note="Matches inside the name: Ethereum Name Service">
          <Palette defaultQuery="name" />
        </CanvasFrame>
        <CanvasFrame id="search-empty" title="No results" note="↵ clears the search">
          <Palette defaultQuery="doge" />
        </CanvasFrame>
        <CanvasFrame id="search-elsewhere" title="No results · filtered" note="Says how many match outside the filters">
          <Palette defaultQuery="eth" defaultCategory="stablecoin" />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="loading"
        title="Loading"
        description="First load: skeleton rows with the real row's metrics, fading down the list (Uniswap's Loader.Token). Search and filters stay usable."
      >
        <CanvasFrame id="loading-list" title="Token list · loading">
          <Palette loading />
        </CanvasFrame>
        <CanvasFrame id="loading-dark" title="Loading · dark">
          <Palette theme="dark" loading />
        </CanvasFrame>
      </CanvasSection>
    </Canvas>
  )
}
