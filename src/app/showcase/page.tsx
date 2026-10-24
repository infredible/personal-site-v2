import type { Metadata } from 'next'
import Link from 'next/link'
import { PageTransition, FloatingBackButton } from '@/components'

export const metadata: Metadata = {
  title: 'Showcase',
  description: 'Design engineering recreations of Uniswap interfaces.',
  // Work in progress: keep out of search until the showcase is ready
  robots: { index: false, follow: false },
}

const showcases = [
  {
    href: '/showcase/uniswap/swap',
    title: 'Swap',
    description: 'The swap box, live, with an exploded-view canvas of every part and state.',
  },
  {
    href: '/showcase/uniswap/token-selector',
    title: 'Token selector',
    description: 'A command-palette take on token search: keyboard-first, with category and network filters.',
  },
  {
    href: '/showcase/uniswap/review',
    title: 'Swap review',
    description: 'A redesign of the review flow as one morphing surface, compared with production.',
  },
  {
    href: '/showcase/uniswap/sparkline',
    title: 'Price sparkline',
    description: 'The mini price chart beside the swap: scrubbing, periods, and loading.',
  },
  {
    href: '/showcase/uniswap/liquidity-range',
    title: 'Liquidity range',
    description: 'The price range step of adding liquidity: the liquidity chart with draggable bounds, strategies, and min/max inputs.',
  },
  {
    href: '/showcase/uniswap/system',
    title: 'Design system',
    description: 'The Uniswap tokens and components these are built from.',
  },
]

export default function ShowcaseIndexPage() {
  return (
    <PageTransition>
      <FloatingBackButton />
      <div className="page-content">
        <h1 className="font-serif text-4xl leading-tight font-medium tracking-tight">Showcase</h1>
        <p className="mt-4 text-muted-foreground">
          Design engineering recreations of Uniswap interfaces, each with the live component and a canvas of its
          parts and states.
        </p>
        <ul className="mt-12 flex flex-col divide-y divide-border border-y border-border">
          {showcases.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="group flex flex-col gap-1 py-5 hover:opacity-100">
                <span className="font-medium transition-opacity group-hover:opacity-70">{s.title}</span>
                <span className="text-sm text-muted-foreground">{s.description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-muted-foreground">
          Non-commercial recreations, not affiliated with or endorsed by Uniswap Labs.
        </p>
      </div>
    </PageTransition>
  )
}
