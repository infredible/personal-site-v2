import * as React from 'react'
import { cn } from '@/lib/utils'
import { UniButton } from '../../UniButton'

/*
 * Empty and error states for the Explore tables.
 *
 * Empty: production shows a bare "No data found" row. Here it echoes the
 * search, and offers "Clear search" and, when one network is selected,
 * "Search all networks".
 *
 * Error: production's ErrorModal card, centered over static skeleton rows
 * with the header dimmed: 320px, 12px padding, surface5 with a 24px backdrop
 * blur, 1px surface3 border, 20px radius; a ChartBarCrossed glyph on a
 * surface3 chip, "Error loading data" (subheading2) and the body3 message.
 * Production wires no retry on Explore; here Retry works.
 */

export interface ExploreEmptyStateProps {
  /** What the table lists, for the copy */
  noun: 'tokens' | 'pools'
  query?: string
  /** Selected network's name; offers "Search all networks" */
  chainName?: string
  onClearSearch?: () => void
  onSearchAllNetworks?: () => void
  className?: string
}

export function ExploreEmptyState({
  noun,
  query,
  chainName,
  onClearSearch,
  onSearchAllNetworks,
  className,
}: ExploreEmptyStateProps) {
  const q = query?.trim()
  const title = q ? `No ${noun} found for “${q}”${chainName ? ` on ${chainName}` : ''}` : 'No data found'
  const showAllNetworks = !!chainName && !!onSearchAllNetworks
  return (
    <div className={cn('flex flex-col items-center gap-uni-16 px-uni-16 py-uni-32 text-center', className)}>
      <div className="flex max-w-[360px] flex-col gap-uni-4">
        <p className="text-subheading2 text-neutral1">{title}</p>
        {q && (
          <p className="text-body3 text-neutral2">
            {showAllNetworks ? 'Try a different name or symbol, or search every network.' : 'Try a different name or symbol.'}
          </p>
        )}
      </div>
      {(q && onClearSearch) || showAllNetworks ? (
        <div className="flex flex-wrap justify-center gap-uni-8">
          {q && onClearSearch && (
            <UniButton size="small" emphasis="secondary" onClick={onClearSearch}>
              Clear search
            </UniButton>
          )}
          {showAllNetworks && (
            <UniButton size="small" emphasis="secondary" onClick={onSearchAllNetworks}>
              Search all networks
            </UniButton>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Production's ChartBarCrossed: three bars with a slash through them. */
function ChartBarCrossed(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path d="M5 16V10M10 16V5M15 16V12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M3 3L17 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function ExploreErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex w-[320px] max-w-full gap-uni-12 rounded-uni-20 border border-surface3 bg-surface5 p-uni-12 backdrop-blur-[24px]',
        'shadow-[0_4px_6px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      <span className="flex size-[36px] shrink-0 items-center justify-center rounded-uni-12 bg-surface3">
        <ChartBarCrossed className="size-uni-20 text-neutral2" />
      </span>
      <div className="flex max-w-[200px] min-w-0 flex-col items-start gap-uni-4">
        <p className="text-subheading2 text-neutral1">Error loading data</p>
        <p className="text-body3 text-neutral2">Data is unavailable at the moment; we’re working on a fix</p>
        {onRetry && (
          <UniButton size="small" emphasis="secondary" onClick={onRetry} className="mt-uni-8">
            Retry
          </UniButton>
        )}
      </div>
    </div>
  )
}
