import type { Metadata } from 'next'
import { IslandShowcase } from './IslandShowcase'

export const metadata: Metadata = {
  title: 'Swap review · Dynamic Island',
  description:
    'The swap review flow translated to the iPhone app: the sheet reviews, one Face ID signs, and the Dynamic Island carries the swap as a Live Activity through to the receipt.',
}

export default function IslandShowcasePage() {
  return <IslandShowcase />
}
