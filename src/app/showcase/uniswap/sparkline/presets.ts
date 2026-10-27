import type { ChartPeriod, ChartType } from '@/components/uniswap/chart'
import { TOKENS } from '@/components/uniswap/swap/tokens'
import type { Token } from '@/components/uniswap/swap/types'

export interface SparklinePreset {
  id: string
  label: string
  token: Token
  period: ChartPeriod
  /** Default line */
  chartType?: ChartType
  /** Plays the first-load skeleton, then morphs the line in */
  loading?: boolean
}

export const SPARKLINE_PRESETS: SparklinePreset[] = [
  { id: 'eth-1d', label: 'ETH · 1D (up)', token: TOKENS.ETH, period: '1D' },
  { id: 'eth-live', label: 'ETH · Live', token: TOKENS.ETH, period: 'LIVE' },
  { id: 'eth-1d-candles', label: 'ETH · 1D candles', token: TOKENS.ETH, period: '1D', chartType: 'candles' },
  { id: 'eth-live-candles', label: 'ETH · Live candles', token: TOKENS.ETH, period: 'LIVE', chartType: 'candles' },
  { id: 'down', label: 'SHIB · 1D (down)', token: TOKENS.SHIB, period: '1D' },
  { id: 'stablecoin', label: 'DAI · stablecoin (flat)', token: TOKENS.DAI, period: '1D' },
  { id: 'eth-1w', label: 'ETH · 1W', token: TOKENS.ETH, period: '1W' },
  { id: 'eth-1y', label: 'ETH · 1Y', token: TOKENS.ETH, period: '1Y' },
  { id: 'loading', label: 'Loading', token: TOKENS.ETH, period: '1D', loading: true },
]

export const getSparklinePreset = (id: string | undefined) =>
  SPARKLINE_PRESETS.find((p) => p.id === id) ?? SPARKLINE_PRESETS[0]
