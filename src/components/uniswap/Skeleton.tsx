import * as React from 'react'
import { cn } from '@/lib/utils'

/*
 * Uniswap's loading skeletons, ported from @universe/mycelium (shimmer,
 * text-loader-wrapper) and ui/src/loading (Skeleton, TokenLoader, Loader.Token).
 *
 * - Shimmer: a moving gradient mask over its children (1s linear, -75deg).
 * - TextSkeleton: invisible placeholder text with a fully rounded surface3 pill
 *   over it (5% inset top/bottom), so the skeleton has the exact size the text
 *   will have. Pass the same type classes the real text uses.
 * - BlockSkeleton: a plain shape (logos, chips), neutral3 like FlexLoader.
 */

/** Gradient-mask shimmer. Static under prefers-reduced-motion (see .uni-shimmer in theme.css). */
function Shimmer({ disabled = false, className, ...props }: React.ComponentProps<'div'> & { disabled?: boolean }) {
  return <div data-slot="uni-shimmer" className={cn(!disabled && 'uni-shimmer', className)} {...props} />
}

interface TextSkeletonProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Text whose width the skeleton takes, e.g. "$0,000.00". Not rendered visibly. */
  placeholder?: string
  /** Wrap in its own Shimmer. Off when a parent already shimmers. */
  shimmer?: boolean
}

function TextSkeleton({ placeholder = '0000.00', shimmer = false, className, ...props }: TextSkeletonProps) {
  const pill = (
    <span
      aria-hidden
      data-slot="uni-text-skeleton"
      className={cn('relative inline-flex max-w-full select-none', className)}
      {...props}
    >
      <span className="invisible truncate">{placeholder}</span>
      <span className="absolute inset-x-0 top-[5%] bottom-[5%] rounded-uni-full bg-surface3" />
    </span>
  )
  return shimmer ? <Shimmer className="inline-flex max-w-full">{pill}</Shimmer> : pill
}

function BlockSkeleton({ className, ...props }: React.ComponentProps<'span'>) {
  return <span aria-hidden className={cn('block shrink-0 rounded-uni-12 bg-neutral3', className)} {...props} />
}

/** Token row placeholder (TokenLoader): logo circle, name + symbol lines, optional value column. */
function TokenRowSkeleton({ withValue = false, style }: { withValue?: boolean; style?: React.CSSProperties }) {
  return (
    <div className="flex items-center justify-between gap-uni-8 p-uni-8" style={style}>
      <div className="flex min-w-0 items-center gap-uni-12">
        <BlockSkeleton className="size-uni-40 rounded-uni-full" />
        <div className="flex min-w-0 flex-col">
          <TextSkeleton placeholder="Token Full Name" className="text-body1" />
          <TextSkeleton placeholder="1,000 TFN" className="text-body3" />
        </div>
      </div>
      {withValue && (
        <div className="flex flex-col items-end">
          <TextSkeleton placeholder="$XX.XX" className="text-body1" />
          <TextSkeleton placeholder="X.XX" className="text-body3" />
        </div>
      )}
    </div>
  )
}

/** Loader.Token: `rows` token rows fading out down the list ((n - i) / n), under one shimmer. */
function TokenListSkeleton({ rows = 7, withValue = false, className }: { rows?: number; withValue?: boolean; className?: string }) {
  return (
    <Shimmer role="status" aria-label="Loading tokens" className={cn('flex flex-col', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <TokenRowSkeleton key={i} withValue={withValue} style={{ opacity: (rows - i) / rows }} />
      ))}
    </Shimmer>
  )
}

export { Shimmer, TextSkeleton, BlockSkeleton, TokenRowSkeleton, TokenListSkeleton }
