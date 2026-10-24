import type { Metadata } from 'next'
import { ExploreShowcase } from './ExploreShowcase'

export const metadata: Metadata = {
  title: 'Explore tables',
  description:
    "A recreation of Uniswap's Explore Tokens and Pools tables: the live component, and a canvas of its parts and states.",
}

export default function ExploreShowcasePage() {
  return <ExploreShowcase />
}
