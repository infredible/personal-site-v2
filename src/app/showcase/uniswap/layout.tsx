import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { UniswapScope } from './_components/UniswapScope'

// Stand-in for Basel Grotesk (commercial). Inter's variable axis covers
// Uniswap's web weights (485 book, 535 medium).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s · Uniswap recreation',
    default: 'Uniswap recreation',
  },
  // Work in progress: keep out of search until the showcase is ready
  robots: { index: false, follow: false },
}

export default function UniswapLayout({ children }: { children: React.ReactNode }) {
  return (
    <UniswapScope fontClassName={inter.variable}>
      {children}
    </UniswapScope>
  )
}
