import type { Metadata } from 'next'
import { PageTransition, FloatingBackButton } from '@/components'
import { ShowcaseOrbit } from './_components/ShowcaseOrbit'

export const metadata: Metadata = {
  title: 'Showcase',
  description: 'Design engineering recreations of Uniswap interfaces.',
  // Work in progress: keep out of search until the showcase is ready
  robots: { index: false, follow: false },
}

// The showcases themselves are listed in ./_lib/showcases.ts
export default function ShowcaseIndexPage() {
  return (
    <PageTransition>
      <FloatingBackButton />
      <ShowcaseOrbit />
    </PageTransition>
  )
}
