import type { Metadata } from 'next'
import { ReviewShowcase } from './ReviewShowcase'

export const metadata: Metadata = {
  title: 'Swap review',
  description:
    'A redesign of Uniswap’s swap review and confirm flow: one surface that morphs from review to wallet to success, with the amounts held still throughout.',
}

export default function ReviewShowcasePage() {
  return <ReviewShowcase />
}
