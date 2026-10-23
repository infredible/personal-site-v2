import type { TokenSelectorCategory, TokenSelectorChain } from '@/components/uniswap/swap/overlays/tokenSelectorFilters'
import { TOKENS } from '@/components/uniswap/swap/tokens'
import type { Token } from '@/components/uniswap/swap/types'

/** Which side of the pair the palette is choosing for. */
export type PairSide = 'input' | 'output'

/** Everything the token selector demo renders from: the palette's filters plus the pair it picks for. */
export interface TokenSelectorDemoState {
  query: string
  category: TokenSelectorCategory
  chain: TokenSelectorChain
  input?: Token
  output?: Token
  side: PairSide
  otherAction: 'disable' | 'switch'
  loading: boolean
}

const base: TokenSelectorDemoState = {
  query: '',
  category: 'all',
  chain: 'all',
  input: TOKENS.ETH,
  output: undefined,
  side: 'output',
  otherAction: 'disable',
  loading: false,
}

export const TOKEN_SELECTOR_PRESETS: { id: string; label: string; state: TokenSelectorDemoState }[] = [
  { id: 'default', label: 'Default', state: base },
  { id: 'searching', label: 'Searching', state: { ...base, query: 'u' } },
  { id: 'no-results', label: 'No results', state: { ...base, query: 'doge' } },
  { id: 'stablecoins', label: 'Stablecoins', state: { ...base, category: 'stablecoin' } },
  { id: 'base', label: 'On Base', state: { ...base, chain: 'base' } },
  { id: 'yours', label: 'Your tokens', state: { ...base, category: 'yours' } },
  { id: 'loading', label: 'Loading', state: { ...base, loading: true } },
  {
    id: 'switch',
    label: 'Other side · switch',
    state: { ...base, output: TOKENS.USDC, otherAction: 'switch' },
  },
]

export const presetState = (id: string | undefined) =>
  TOKEN_SELECTOR_PRESETS.find((p) => p.id === id)?.state ?? TOKEN_SELECTOR_PRESETS[0].state

export const otherSide = (side: PairSide): PairSide => (side === 'input' ? 'output' : 'input')
