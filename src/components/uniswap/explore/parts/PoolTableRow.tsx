'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { TextSkeleton } from '../../Skeleton'
import { UniTooltip } from '../../UniTooltip'
import { TokenLogo } from '../../swap/parts/TokenLogo'
import { TOKENS } from '../../swap/tokens'
import type { Chain } from '../../swap/types'
import { poolVolumeOverTvl } from '../filters'
import { formatFeeTier, formatFiatTokenStats, formatPercent, formatTokenQuantityStats } from '../format'
import type { ExplorePoolStats, PoolSortField } from '../types'
import { HighlightedText } from './HighlightedText'
import { PoolLogos } from './PoolLogos'
import { ExploreNarrowCell, ExploreSkeletonRow, ExploreTableCell, ExploreTableRow, type ExploreColumn } from './Table'

/*
 * A Pools table row (production: PoolTable's columns, PoolDescription,
 * PoolDetailsLine, AprCell).
 *
 * Pool cell: split pair logo with the network badge, "{base}/{quote}" in
 * body2, and the details line in body3 neutral2: "{version} · {fee}" plus
 * " · {hook}" for v4 pools with one (plain text; production's hook tooltip
 * and details modal are left out, there's no detail data). The fee keeps up
 * to four decimals, trailing zeros trimmed.
 *
 * APR: fee APR, and for pools with incentives production's RewardAprBadge
 * (size sm, no background) under it: the reward token's 12px logo and
 * "+{apr}" in body4 neutral2. Hovering the cell explains the split.
 *
 * Narrow (table under 640px): two cells. Start: logos, pair, details line.
 * End: TVL over the active sort's metric (1D vol, 30D vol, vol/TVL, or APR,
 * the default). A reward APR shrinks to the UNI logo after "APR", with the
 * same tooltip and screen-reader breakdown.
 */

export interface PoolTableRowProps {
  row: ExplorePoolStats
  /** Position in the current order */
  rank: number
  columns: ExploreColumn[]
  /** Search text to highlight in the pair */
  query?: string
  /** Network badge on the pair logo */
  badge?: Chain
  /** Active sort: picks the narrow layout's second value */
  sortField?: PoolSortField
}

/** Mock incentives are paid in UNI (Unichain and Base LP rewards). */
const REWARD_TOKEN = TOKENS.UNI

function PoolDescription({ row, query, badge }: Pick<PoolTableRowProps, 'row' | 'query' | 'badge'>) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-uni-8">
      <PoolLogos token0={row.token0} token1={row.token1} chain={badge} />
      <div className="flex min-w-0 flex-1 flex-col gap-uni-2">
        <span className="truncate text-body2 text-neutral1">
          <HighlightedText text={`${row.token0.symbol}/${row.token1.symbol}`} query={query} />
        </span>
        <PoolDetailsLine row={row} />
      </div>
    </div>
  )
}

/** "v4 · 0.05% · Dynamic Fee" */
export function PoolDetailsLine({ row, className }: { row: ExplorePoolStats; className?: string }) {
  const dot = (
    <span aria-hidden className="shrink-0">
      ·
    </span>
  )
  return (
    <span className={cn('flex min-w-0 max-w-full items-center gap-uni-4 text-body3 text-neutral2', className)}>
      <span className="shrink-0">{row.protocol}</span>
      {dot}
      <span className="shrink-0">{formatFeeTier(row.feeTier)}</span>
      {row.hook && (
        <>
          {dot}
          <span className="min-w-0 max-w-[160px] truncate">{row.hook}</span>
        </>
      )}
    </span>
  )
}

/** Production's RewardAprBadge, size sm, no background: "[UNI] +6%" */
export function RewardAprBadge({ rewardApr, className }: { rewardApr: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-uni-6 text-body4 text-neutral2', className)}>
      <span aria-hidden className="inline-flex">
        <TokenLogo token={REWARD_TOKEN} size={12} />
      </span>
      +{formatPercent(rewardApr)}
      <span className="sr-only"> {REWARD_TOKEN.symbol} reward APR</span>
    </span>
  )
}

/** Tooltip body for a boosted APR (production's PoolAprTooltip, simplified) */
function AprBreakdown({ apr, rewardApr }: { apr: number; rewardApr: number }) {
  const line = 'flex items-center justify-between gap-uni-16'
  return (
    <div className="flex w-[232px] flex-col gap-uni-8 text-body3">
      <div className={line}>
        <span className="text-neutral2">Pool APR</span>
        <span className="text-neutral1 tabular-nums">{formatPercent(apr)}</span>
      </div>
      <div className={line}>
        <span className="flex items-center gap-uni-6 text-neutral2">
          <TokenLogo token={REWARD_TOKEN} size={16} />
          {REWARD_TOKEN.symbol} reward APR
        </span>
        <span className="text-neutral1 tabular-nums">+{formatPercent(rewardApr)}</span>
      </div>
      <span aria-hidden className="h-px bg-surface3" />
      <div className={line}>
        <span className="text-neutral1">Total APR</span>
        <span className="text-neutral1 tabular-nums">{formatPercent(apr + rewardApr)}</span>
      </div>
      <p className="text-body4 text-neutral2">
        Liquidity providers here also earn {REWARD_TOKEN.symbol} incentives, on top of the trading fees in Pool APR.
      </p>
    </div>
  )
}

function AprCell({ row }: { row: ExplorePoolStats }) {
  if (row.rewardApr === undefined) return <span className="truncate">{formatPercent(row.apr)}</span>
  return (
    <UniTooltip content={<AprBreakdown apr={row.apr} rewardApr={row.rewardApr} />} className="p-uni-12">
      <span className="flex flex-col items-end gap-uni-6">
        <span>
          {formatPercent(row.apr)}
          <span className="sr-only"> pool APR,</span>
        </span>
        <RewardAprBadge rewardApr={row.rewardApr} />
        <span className="sr-only">, total APR {formatPercent(row.apr + row.rewardApr)}</span>
      </span>
    </UniTooltip>
  )
}

/** Narrow end cell's second line: the active sort's metric, APR by default */
function NarrowMetric({ row, sortField }: { row: ExplorePoolStats; sortField?: PoolSortField }) {
  switch (sortField) {
    case 'volume1d':
      return <span className="truncate">{formatFiatTokenStats(row.volume1dUsd)} 1D vol</span>
    case 'volume30d':
      return <span className="truncate">{formatFiatTokenStats(row.volume30dUsd)} 30D vol</span>
    case 'volumeTvl':
      return <span className="truncate">{formatTokenQuantityStats(poolVolumeOverTvl(row))} vol/TVL</span>
    default: {
      const apr = <span className="truncate">{formatPercent(row.apr)} APR</span>
      if (row.rewardApr === undefined) return apr
      return (
        <UniTooltip content={<AprBreakdown apr={row.apr} rewardApr={row.rewardApr} />} className="p-uni-12">
          <span className="inline-flex min-w-0 items-center gap-uni-4">
            {apr}
            <span aria-hidden className="inline-flex shrink-0">
              <TokenLogo token={REWARD_TOKEN} size={12} />
            </span>
            <span className="sr-only">
              , {REWARD_TOKEN.symbol} reward APR +{formatPercent(row.rewardApr)}, total APR{' '}
              {formatPercent(row.apr + row.rewardApr)}
            </span>
          </span>
        </UniTooltip>
      )
    }
  }
}

function NarrowPoolCells({ row, query, badge, sortField }: Pick<PoolTableRowProps, 'row' | 'query' | 'badge' | 'sortField'>) {
  return (
    <>
      <ExploreNarrowCell side="start" className="gap-uni-12">
        <PoolLogos token0={row.token0} token1={row.token1} chain={badge} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body2 text-neutral1">
            <HighlightedText text={`${row.token0.symbol}/${row.token1.symbol}`} query={query} />
          </span>
          <PoolDetailsLine row={row} className="h-[20px]" />
        </div>
      </ExploreNarrowCell>
      <ExploreNarrowCell side="end">
        <span className="max-w-full truncate text-body2 text-neutral1">
          <span className="sr-only">TVL </span>
          {formatFiatTokenStats(row.tvlUsd)}
        </span>
        <span className="flex h-[20px] max-w-full min-w-0 items-center text-body3 text-neutral2">
          <NarrowMetric row={row} sortField={sortField} />
        </span>
      </ExploreNarrowCell>
    </>
  )
}

export function PoolTableRow({ row, rank, columns, query, badge, sortField }: PoolTableRowProps) {
  const cells: Record<string, React.ReactNode> = {
    index: rank,
    pool: <PoolDescription row={row} query={query} badge={badge} />,
    tvl: <span className="truncate">{formatFiatTokenStats(row.tvlUsd)}</span>,
    volume1d: <span className="truncate">{formatFiatTokenStats(row.volume1dUsd)}</span>,
    volume30d: <span className="truncate">{formatFiatTokenStats(row.volume30dUsd)}</span>,
    volumeTvl: <span className="truncate">{formatTokenQuantityStats(poolVolumeOverTvl(row))}</span>,
    apr: <AprCell row={row} />,
  }
  return (
    <ExploreTableRow rowId={row.id}>
      {columns.map((column) => (
        <ExploreTableCell key={column.id} column={column}>
          {cells[column.id]}
        </ExploreTableCell>
      ))}
      <NarrowPoolCells row={row} query={query} badge={badge} sortField={sortField} />
    </ExploreTableRow>
  )
}

/* Skeleton ---------------------------------------------------------------- */

const poolSkeletonCells: Record<string, React.ReactNode> = {
  index: <TextSkeleton placeholder="00" className="text-body2" />,
  pool: (
    <div className="flex min-w-0 items-center gap-uni-8">
      <span className="size-[32px] shrink-0 rounded-uni-full bg-surface3" />
      <div className="flex min-w-0 flex-col gap-uni-2">
        <TextSkeleton placeholder="ETH/USDC" className="text-body2" />
        <TextSkeleton placeholder="v3 · 0.05%" className="text-body3" />
      </div>
    </div>
  ),
  tvl: <TextSkeleton placeholder="$00.0M" className="text-body2" />,
  volume1d: <TextSkeleton placeholder="$00.0M" className="text-body2" />,
  volume30d: <TextSkeleton placeholder="$000.0M" className="text-body2" />,
  volumeTvl: <TextSkeleton placeholder="0.00" className="text-body2" />,
  apr: <TextSkeleton placeholder="00.00%" className="text-body2" />,
}

const poolSkeletonNarrow = {
  start: (
    <div className="flex min-w-0 items-center gap-uni-12">
      <span className="size-[32px] shrink-0 rounded-uni-full bg-surface3" />
      <div className="flex min-w-0 flex-col">
        <TextSkeleton placeholder="ETH/USDC" className="text-body2" />
        <span className="flex h-[20px] items-center">
          <TextSkeleton placeholder="v3 · 0.05%" className="text-body3" />
        </span>
      </div>
    </div>
  ),
  end: (
    <>
      <TextSkeleton placeholder="$00.0M" className="text-body2" />
      <span className="flex h-[20px] items-center">
        <TextSkeleton placeholder="00.00% APR" className="text-body3" />
      </span>
    </>
  ),
}

/** First-load placeholder for a pool row: each cell sized to the text it stands in for. */
export function PoolTableSkeletonRow({ columns, className }: { columns: ExploreColumn[]; className?: string }) {
  return <ExploreSkeletonRow columns={columns} cells={poolSkeletonCells} narrow={poolSkeletonNarrow} className={className} />
}
