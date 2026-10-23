import type { Metadata } from 'next'
import { TokenSelectorShowcase } from './TokenSelectorShowcase'

export const metadata: Metadata = {
  title: 'Token selector',
  description:
    "A recreation of Uniswap's token selector as a command palette: the live component, and a canvas of its parts and states.",
}

export default function TokenSelectorShowcasePage() {
  return <TokenSelectorShowcase />
}
