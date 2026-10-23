import type { Metadata } from 'next'
import { SwapShowcase } from './SwapShowcase'

export const metadata: Metadata = {
  title: 'Swap',
  description: "A recreation of Uniswap's swap interface: the live component, and a canvas of its parts and states.",
}

export default function SwapShowcasePage() {
  return <SwapShowcase />
}
