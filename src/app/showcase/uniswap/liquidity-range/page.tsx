import type { Metadata } from 'next'
import { LiquidityRangeShowcase } from './LiquidityRangeShowcase'

export const metadata: Metadata = {
  title: 'Liquidity range',
  description:
    "A recreation of the price range step of Uniswap's add liquidity flow: the liquidity chart with draggable bounds, strategies, and min/max inputs, and a canvas of its parts, states and fee tiers.",
}

export default function LiquidityRangeShowcasePage() {
  return <LiquidityRangeShowcase />
}
