import type { Metadata } from 'next'
import { UniswapScope } from '@/components/uniswap'

export const metadata: Metadata = {
  title: {
    template: '%s · Uniswap recreation',
    default: 'Uniswap recreation',
  },
  // Work in progress: keep out of search until the showcase is ready
  robots: { index: false, follow: false },
}

export default function UniswapLayout({ children }: { children: React.ReactNode }) {
  return <UniswapScope fullPage>{children}</UniswapScope>
}
