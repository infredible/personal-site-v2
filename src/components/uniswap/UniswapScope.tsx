import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

// Stand-in for Basel Grotesk (commercial). Inter's variable axis covers
// Uniswap's web weights (485 book, 535 medium).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

/**
 * Classes that turn on the Uniswap token scope (see theme.css). Radix portals
 * (dialogs, popovers, tooltips) render into <body>, outside any wrapper, so
 * their content element needs these classes too. The Uni* components apply
 * them already; pass this to stock shadcn content components when used directly.
 */
export const uniswapScopeClassName = cn('uniswap', inter.variable)

interface UniswapScopeProps extends React.ComponentProps<'div'> {
  /** Full showcase page: fills the viewport. Leave off for inline embeds (e.g. in project MDX). */
  fullPage?: boolean
}

/** Applies the Uniswap theme to its children. Works as a page wrapper or inline in any page. */
export function UniswapScope({ fullPage = false, className, ...props }: UniswapScopeProps) {
  return <div className={cn(uniswapScopeClassName, fullPage && 'min-h-dvh', className)} {...props} />
}
