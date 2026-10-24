'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { TextSkeleton } from '../../Skeleton'
import { ChainLogo } from '../../swap/overlays/NetworkMenu'
import { TokenLogo } from '../../swap/parts/TokenLogo'
import type { Chain } from '../../swap/types'
import { formatFiatTokenPrice, formatFiatTokenStats } from '../format'
import type { ExploreTimePeriod, ExploreTokenStats, TokenSortField } from '../types'
import { HighlightedText } from './HighlightedText'
import { PriceChangeCell } from './PriceChangeCell'
import { ExploreNarrowCell, ExploreSkeletonRow, ExploreTableCell, ExploreTableRow, type ExploreColumn } from './Table'
import { TokenSparklineCell } from './TokenSparklineCell'

/*
 * A Tokens table row (production: TokensTable's columns + TokenDescription).
 *
 * Token cell: 32px logo (network badge when the table is filtered to one
 * network or the token lives on one), name in body2, symbol in body3 neutral2.
 * On hover (and keyboard focus) a multichain token's symbol slot swaps to
 * "{n} networks" plus 12px network icons, as production's GroupHoverTransition
 * does. Production's single-chain swap to a copyable address is left out:
 * the mock tokens have no addresses, and a button inside the row would nest
 * interactive content.
 *
 * Compact (table under 969px; Tailwind needs these class names spelled out,
 * so the breakpoint is repeated literally): the name hides and the symbol becomes the
 * label, so the pinned column stays narrow.
 *
 * Narrow (table under 640px): two cells. Start: logo, name, and a subline
 * "{symbol} · {metric}" where the metric follows the sort, so a sort by a
 * hidden column still shows its values: Volume and the default (Price, 1D)
 * show the period's volume, FDV the FDV, 1H the 1H change. End: price over
 * the 1D change.
 */

export interface TokenTableRowProps {
  row: ExploreTokenStats
  /** Position in the current order */
  rank: number
  columns: ExploreColumn[]
  period: ExploreTimePeriod
  /** Search text to highlight in the name and symbol */
  query?: string
  /** Network badge on the logo */
  badge?: Chain
  /** Networks for the hover swap; shown when there are two or more */
  networks?: Chain[]
  /** Active sort: picks the narrow layout's subline metric */
  sortField?: TokenSortField
}

/** The narrow subline's metric for the active sort */
function NarrowMetric({ row, period, sortField }: Pick<TokenTableRowProps, 'row' | 'period' | 'sortField'>) {
  switch (sortField) {
    case 'fdv':
      return <span className="truncate">{formatFiatTokenStats(row.fdvUsd)} FDV</span>
    case 'change1h':
      return (
        <span className="inline-flex min-w-0 items-center gap-uni-4">
          <PriceChangeCell change={row.change1h} className="gap-uni-2 [&_svg]:size-uni-12" />
          <span className="shrink-0">1H</span>
        </span>
      )
    default:
      return (
        <span className="truncate">
          {formatFiatTokenStats(row.volumeUsd[period])} {period} vol
        </span>
      )
  }
}

function NarrowTokenCells({
  row,
  period,
  query,
  badge,
  sortField,
}: Pick<TokenTableRowProps, 'row' | 'period' | 'query' | 'badge' | 'sortField'>) {
  return (
    <>
      <ExploreNarrowCell side="start" className="gap-uni-12">
        <span aria-hidden className="shrink-0">
          <TokenLogo token={row.token} size={32} chain={badge} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body2 text-neutral1">
            <HighlightedText text={row.token.name} query={query} />
          </span>
          <span className="flex h-[20px] min-w-0 items-center gap-uni-4 text-body3 text-neutral2">
            <span className="shrink-0">
              <HighlightedText text={row.token.symbol} query={query} />
            </span>
            <span aria-hidden className="shrink-0">
              ·
            </span>
            <NarrowMetric row={row} period={period} sortField={sortField} />
          </span>
        </div>
      </ExploreNarrowCell>
      <ExploreNarrowCell side="end">
        <span className="max-w-full truncate text-body2 text-neutral1">{formatFiatTokenPrice(row.priceUsd)}</span>
        <span className="flex h-[20px] items-center text-body3 text-neutral2">
          <span className="sr-only">1D change </span>
          <PriceChangeCell change={row.change1d} className="gap-uni-2 [&_svg]:size-uni-12" />
        </span>
      </ExploreNarrowCell>
    </>
  )
}

function TokenDescription({
  row,
  query,
  badge,
  networks,
}: Pick<TokenTableRowProps, 'row' | 'query' | 'badge' | 'networks'>) {
  const multichain = !!networks && networks.length > 1
  return (
    <div className="flex min-w-0 flex-1 items-center gap-uni-8">
      <span aria-hidden className="shrink-0 pr-uni-4">
        <TokenLogo token={row.token} size={32} chain={badge} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-body2 text-neutral1', '@max-[969px]/explore-table:hidden')}>
          <HighlightedText text={row.token.name} query={query} />
        </span>
        <span className="relative flex h-[20px] min-w-0 items-center">
          <span
            className={cn(
              'truncate text-body3 text-neutral2 transition-opacity duration-150 ease-out',
              '@max-[969px]/explore-table:text-body2 @max-[969px]/explore-table:text-neutral1',
              multichain && '@min-[969px]/explore-table:group-hover/row:opacity-0 @min-[969px]/explore-table:group-focus-visible/row:opacity-0',
            )}
          >
            <HighlightedText text={row.token.symbol} query={query} />
          </span>
          {multichain && (
            <span
              aria-hidden
              className={cn(
                'absolute inset-0 flex items-center gap-uni-6 text-body3 text-neutral2 opacity-0 transition-opacity duration-150 ease-out',
                'group-hover/row:opacity-100 group-focus-visible/row:opacity-100',
                '@max-[969px]/explore-table:hidden',
              )}
            >
              <span className="shrink-0">{networks.length} networks</span>
              <span className="flex min-w-0 items-center gap-uni-2 overflow-hidden">
                {networks.map((chain) => (
                  <ChainLogo key={chain.id} chain={chain} size={12} />
                ))}
              </span>
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

export function TokenTableRow({ row, rank, columns, period, query, badge, networks, sortField }: TokenTableRowProps) {
  const cells: Record<string, React.ReactNode> = {
    index: rank,
    token: <TokenDescription row={row} query={query} badge={badge} networks={networks} />,
    price: <span className="truncate">{formatFiatTokenPrice(row.priceUsd)}</span>,
    change1h: <PriceChangeCell change={row.change1h} />,
    change1d: <PriceChangeCell change={row.change1d} />,
    fdv: <span className="truncate">{formatFiatTokenStats(row.fdvUsd)}</span>,
    volume: <span className="truncate">{formatFiatTokenStats(row.volumeUsd[period])}</span>,
    sparkline: <TokenSparklineCell token={row.token} change={row.change1d} />,
  }
  return (
    <ExploreTableRow rowId={row.id}>
      {columns.map((column) => (
        <ExploreTableCell key={column.id} column={column}>
          {cells[column.id]}
        </ExploreTableCell>
      ))}
      <NarrowTokenCells row={row} period={period} query={query} badge={badge} sortField={sortField} />
    </ExploreTableRow>
  )
}

/* Skeleton ---------------------------------------------------------------- */

const tokenSkeletonCells: Record<string, React.ReactNode> = {
  index: <TextSkeleton placeholder="00" className="text-body2" />,
  token: (
    <div className="flex min-w-0 items-center gap-uni-8">
      <span className="mr-uni-4 size-[32px] shrink-0 rounded-uni-full bg-surface3" />
      <div className="flex min-w-0 flex-col">
        <TextSkeleton placeholder="Token name" className={cn('text-body2', '@max-[969px]/explore-table:hidden')} />
        <span className="flex h-[20px] items-center">
          <TextSkeleton placeholder="TKN" className={cn('text-body3', '@max-[969px]/explore-table:text-body2')} />
        </span>
      </div>
    </div>
  ),
  price: <TextSkeleton placeholder="$0,000.00" className="text-body2" />,
  change1h: <TextSkeleton placeholder="▲ 0.00%" className="text-body2" />,
  change1d: <TextSkeleton placeholder="▲ 0.00%" className="text-body2" />,
  fdv: <TextSkeleton placeholder="$00.0B" className="text-body2" />,
  volume: <TextSkeleton placeholder="$000.0M" className="text-body2" />,
  sparkline: <span className="h-[20px] w-[80px] rounded-uni-4 bg-surface3" />,
}

const tokenSkeletonNarrow = {
  start: (
    <div className="flex min-w-0 items-center gap-uni-12">
      <span className="size-[32px] shrink-0 rounded-uni-full bg-surface3" />
      <div className="flex min-w-0 flex-col">
        <TextSkeleton placeholder="Token name" className="text-body2" />
        <span className="flex h-[20px] items-center">
          <TextSkeleton placeholder="TKN · $000.0M 1D vol" className="text-body3" />
        </span>
      </div>
    </div>
  ),
  end: (
    <>
      <TextSkeleton placeholder="$0,000.00" className="text-body2" />
      <span className="flex h-[20px] items-center">
        <TextSkeleton placeholder="▲ 0.00%" className="text-body3" />
      </span>
    </>
  ),
}

/** First-load placeholder for a token row: each cell sized to the text it stands in for. */
export function TokenTableSkeletonRow({ columns, className }: { columns: ExploreColumn[]; className?: string }) {
  return <ExploreSkeletonRow columns={columns} cells={tokenSkeletonCells} narrow={tokenSkeletonNarrow} className={className} />
}
