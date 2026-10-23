import { SWAP_PRESETS } from '@/components/uniswap/swap/presets'
import { REVIEW_PRESETS } from '@/components/uniswap/swap/review/presets'
import { colorGroups } from '../uniswap/_lib/tokens'
import { SPARKLINE_PRESETS } from '../uniswap/sparkline/presets'
import { TOKEN_SELECTOR_PRESETS } from '../uniswap/token-selector/presets'

// The showcases on the /showcase index, in orbit order. Add new ones here and
// give them a preview in ../_components/previews.tsx.

export type ShowcaseId = 'swap' | 'token-selector' | 'review' | 'sparkline' | 'system'

export interface Showcase {
  id: ShowcaseId
  href: string
  title: string
  description: string
  /** What kind of piece it is: one word or two */
  kind: string
  /** Headline number for the metadata panel, e.g. 13 states */
  count: { value: number; label: string }
  /** The views its page offers */
  views: string[]
  stack: string[]
  highlights: string[]
}

const colorTokenCount = colorGroups.reduce((n, group) => n + group.tokens.length, 0)

export const SHOWCASES: Showcase[] = [
  {
    id: 'swap',
    href: '/showcase/uniswap/swap',
    title: 'Swap',
    description: 'The swap box, live, with an exploded-view canvas of every part and state.',
    kind: 'Component',
    count: { value: SWAP_PRESETS.length, label: 'states' },
    views: ['Component', 'Canvas'],
    stack: ['React', 'Radix', 'Tailwind'],
    highlights: [
      'Exploded-view transition between the box and its parts',
      'Mock quotes, token selector, settings, and review',
      'One function decides the main button',
    ],
  },
  {
    id: 'token-selector',
    href: '/showcase/uniswap/token-selector',
    title: 'Token selector',
    description: 'A command-palette take on token search: keyboard-first, with category and network filters.',
    kind: 'Overlay',
    count: { value: TOKEN_SELECTOR_PRESETS.length, label: 'states' },
    views: ['Component', 'Canvas'],
    stack: ['cmdk', 'React', 'Tailwind'],
    highlights: [
      'Search, filter, and pick without leaving the keyboard',
      'Category and network filters that compose',
      'Skeletons sized to the rows they replace',
    ],
  },
  {
    id: 'review',
    href: '/showcase/uniswap/review',
    title: 'Swap review',
    description: 'A redesign of the review flow as one morphing surface, compared with production.',
    kind: 'Flow',
    count: { value: REVIEW_PRESETS.length, label: 'states' },
    views: ['Component', 'Canvas'],
    stack: ['Framer Motion', 'React', 'Tailwind'],
    highlights: [
      'One surface that morphs through every phase',
      'Amounts stay mounted: nothing jumps between states',
      'Side by side with the production-style panel',
    ],
  },
  {
    id: 'sparkline',
    href: '/showcase/uniswap/sparkline',
    title: 'Price sparkline',
    description: 'The mini price chart beside the swap: scrubbing, periods, and loading.',
    kind: 'Data viz',
    count: { value: SPARKLINE_PRESETS.length, label: 'states' },
    views: ['Component', 'Canvas'],
    stack: ['SVG', 'Framer Motion', 'React'],
    highlights: [
      'Scrub with hover or touch-drag',
      'A placeholder wave that morphs into the line',
      'Color follows the direction of the change',
    ],
  },
  {
    id: 'system',
    href: '/showcase/uniswap/system',
    title: 'Design system',
    description: 'The Uniswap tokens and components these are built from.',
    kind: 'Foundations',
    count: { value: colorTokenCount, label: 'color tokens' },
    views: ['Catalog'],
    stack: ['Tailwind 4', 'shadcn', 'Radix'],
    highlights: [
      'Tokens ported from Uniswap’s open-source interface',
      'Exposed as Tailwind utilities, light and dark',
      'shadcn variables mapped onto Uniswap tokens',
    ],
  },
]
