import type { Metadata } from 'next'
import { BuyShowcase } from './BuyShowcase'

export const metadata: Metadata = {
  title: 'Buy flow',
  description:
    'A mobile buy flow prototype: keypad amount entry, pay and receive cards, and a sheet of tokens and payment providers.',
}

export default function BuyShowcasePage() {
  return <BuyShowcase />
}
