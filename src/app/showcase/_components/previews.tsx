'use client'

import * as React from 'react'
import { PaletteSurface, Pill, SegmentedControl, UniButton, UniswapScope } from '@/components/uniswap'
import { TokenPriceSparkline } from '@/components/uniswap/chart'
import { ExploreTables, getExplorePreset } from '@/components/uniswap/explore'
import { TokenSelectorPanel } from '@/components/uniswap/swap/overlays/TokenSelectorPanel'
import { getPreset } from '@/components/uniswap/swap/presets'
import { ReviewSurface, getReviewPreset } from '@/components/uniswap/swap/review'
import { SwapFormView } from '@/components/uniswap/swap/SwapFormView'
import { MOCK_WALLET, TOKEN_LIST } from '@/components/uniswap/swap/tokens'
import { cn } from '@/lib/utils'
import { getSparklinePreset } from '../uniswap/sparkline/presets'
import { presetState } from '../uniswap/token-selector/presets'
import type { ShowcaseId } from '../_lib/showcases'

/*
 * Orbit card previews: the real components, rendered from the same presets
 * their showcase pages use. Display-only (the card makes them inert). While a
 * card is the current one it plays through a few of its states.
 */

/** Width the previews lay out at: the card body minus its padding. */
export const PREVIEW_WIDTH = 408

const CYCLE_MS = 2600
const noop = () => {}

/** Steps through `items` while `playing`; holds the current one when paused. */
function useCycle<T>(items: readonly T[], playing: boolean): T {
  const [index, setIndex] = React.useState(0)
  React.useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [playing, items.length])
  return items[index]
}

interface PreviewProps {
  playing: boolean
  /** Renders the card's chrome around the preview, given the state on screen */
  frame: (state: string, body: React.ReactNode) => React.ReactNode
}

const SWAP_STATES = ['filled', 'loading-quote', 'limit-ready', 'high-price-impact', 'insufficient-balance']

function SwapPreview({ playing, frame }: PreviewProps) {
  const preset = getPreset(useCycle(SWAP_STATES, playing))!
  return frame(preset.label, <SwapFormView state={preset.state} />)
}

const TOKEN_SELECTOR_STATES = [
  { id: 'default', label: 'Default' },
  { id: 'searching', label: 'Searching' },
  { id: 'stablecoins', label: 'Stablecoins' },
  { id: 'loading', label: 'Loading' },
]

function TokenSelectorPreview({ playing, frame }: PreviewProps) {
  const { id, label } = useCycle(TOKEN_SELECTOR_STATES, playing)
  const state = presetState(id)
  return frame(
    label,
    <PaletteSurface title="Select a token" className="h-[476px] max-w-none">
      <TokenSelectorPanel
        tokens={TOKEN_LIST}
        balances={MOCK_WALLET.balances}
        selectedSymbol={state.output?.symbol}
        otherSymbol={state.input?.symbol}
        onSelect={noop}
        onClose={noop}
        query={state.query}
        onQueryChange={noop}
        category={state.category}
        onCategoryChange={noop}
        chain={state.chain}
        onChainChange={noop}
        loading={state.loading}
      />
    </PaletteSurface>,
  )
}

const REVIEW_STATES = ['review', 'wallet', 'pending', 'success']

function ReviewPreview({ playing, frame }: PreviewProps) {
  const preset = getReviewPreset(useCycle(REVIEW_STATES, playing))!
  return frame(preset.label, <ReviewSurface trade={preset.trade} state={preset.state} onAction={noop} onClose={noop} />)
}

const SPARKLINE_STATES = ['eth-1d', 'eth-1d-candles', 'down', 'eth-1y']

function SparklinePreview({ playing, frame }: PreviewProps) {
  const preset = getSparklinePreset(useCycle(SPARKLINE_STATES, playing))
  return frame(
    preset.label,
    <TokenPriceSparkline token={preset.token} period={preset.period} chartType={preset.chartType} chartHeight={220} />,
  )
}

const EXPLORE_STATES = ['tokens', 'pools', 'search-eth', 'refetching']

function ExplorePreview({ playing, frame }: PreviewProps) {
  const preset = getExplorePreset(useCycle(EXPLORE_STATES, playing))
  // Remounted per preset: ExploreTables reads its initial state only on mount
  return frame(preset.label, <ExploreTables key={preset.id} initialState={preset.state} searchShortcut={false} />)
}

const SWATCHES = [
  'bg-accent1',
  'bg-accent2',
  'bg-neutral1',
  'bg-neutral2',
  'bg-surface3',
  'bg-statusSuccess',
  'bg-statusWarning',
  'bg-statusCritical',
]

const PERIODS = [
  { value: '1H', label: '1H' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
] as const

const THEMES = ['light', 'dark'] as const

/** A sampler of the system, flipping between forced light and dark to show the tokens doing the work. */
function SystemPreview({ playing, frame }: PreviewProps) {
  const theme = useCycle(THEMES, playing)
  return frame(
    theme === 'light' ? 'Light' : 'Dark',
    <UniswapScope
      theme={theme}
      className="flex flex-col gap-uni-20 rounded-uni-20 border border-surface3 bg-surface1 p-uni-20 transition-colors duration-300"
    >
      <div className="flex flex-col gap-uni-4">
        <span className="text-body3 text-accent1">Tokens</span>
        <p className="text-heading3 text-neutral1">Swap anytime, anywhere.</p>
        <p className="text-body3 text-neutral2">Heading 3 over Body 3</p>
      </div>
      <div className="grid grid-cols-8 gap-uni-8">
        {SWATCHES.map((swatch) => (
          <span key={swatch} className={cn('aspect-square rounded-uni-full border border-surface3', swatch)} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-uni-8">
        <UniButton variant="branded" size="small">
          Swap
        </UniButton>
        <UniButton emphasis="secondary" size="small">
          Connect
        </UniButton>
        <UniButton emphasis="tertiary" size="small">
          Cancel
        </UniButton>
      </div>
      <div className="flex flex-wrap items-center gap-uni-8">
        <Pill tone="accent">Best price</Pill>
        <Pill tone="success">+2.41%</Pill>
        <Pill tone="critical">−0.87%</Pill>
        <Pill>v4</Pill>
      </div>
      <SegmentedControl options={PERIODS} value="1D" onValueChange={noop} />
      <div className="flex flex-col gap-uni-8 rounded-uni-16 bg-surface2 p-uni-16">
        <span className="text-body3 text-neutral2">Sell</span>
        <span className="text-heading2 text-neutral1 tabular-nums">0.42</span>
        <span className="text-body3 text-neutral2">$1,302.18</span>
      </div>
    </UniswapScope>,
  )
}

const PREVIEWS: Record<ShowcaseId, React.ComponentType<PreviewProps>> = {
  swap: SwapPreview,
  'token-selector': TokenSelectorPreview,
  review: ReviewPreview,
  sparkline: SparklinePreview,
  explore: ExplorePreview,
  system: SystemPreview,
}

export function ShowcasePreview({ id, ...props }: PreviewProps & { id: ShowcaseId }) {
  const Preview = PREVIEWS[id]
  return <Preview {...props} />
}
