import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s · Uniswap recreation',
    default: 'Uniswap recreation',
  },
  // Work in progress: keep out of search until the showcase is ready
  robots: { index: false, follow: false },
}

// No Uniswap scope here: showcase pages keep site chrome (the ShowcaseShell
// controls bar) outside the scope, so each page applies <UniswapScope> itself.
export default function UniswapLayout({ children }: { children: React.ReactNode }) {
  return children
}
