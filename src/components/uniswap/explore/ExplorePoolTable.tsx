'use client'

import * as React from 'react'
import { getChain, nextSort } from './filters'
import { ExploreEmptyState, ExploreErrorState } from './parts/ExploreStates'
import { PoolTableRow, PoolTableSkeletonRow } from './parts/PoolTableRow'
import { ExploreTable, ExploreTableMessage } from './parts/Table'
import { POOL_COLUMNS } from './parts/columns'
import type { ExploreChain, ExplorePoolStats, ExploreStatus, PoolSortField, SortState } from './types'

/*
 * The Pools table, display-only; same states as ExploreTokenTable. Every pool
 * lives on one network, so every pair logo carries its badge.
 */

export interface ExplorePoolTableProps {
  rows: ExplorePoolStats[]
  sort: SortState<PoolSortField>
  onSortChange: (sort: SortState<PoolSortField>) => void
  status: ExploreStatus
  /** Search text, highlighted in pairs and echoed by the empty state */
  query?: string
  /** Network the rows are for (the empty state names it) */
  chain?: ExploreChain
  onRetry?: () => void
  onClearSearch?: () => void
  /** Empty state's "Search all networks" (shown when `chain` is one network) */
  onSearchAllNetworks?: () => void
  onRowSelect?: (row: ExplorePoolStats) => void
  /** Skeleton rows on first load (default 10) */
  skeletonRows?: number
  stickyTop?: number
  explode?: boolean
  className?: string
}

const ERROR_ROWS = 8

export function ExplorePoolTable({
  rows,
  sort,
  onSortChange,
  status,
  query,
  chain = 'all',
  onRetry,
  onClearSearch,
  onSearchAllNetworks,
  onRowSelect,
  skeletonRows = 10,
  stickyTop,
  explode,
  className,
}: ExplorePoolTableProps) {
  const chainInfo = chain === 'all' ? undefined : getChain(chain)
  const showRows = status === 'ready' || status === 'refetching'
  const rowIds = React.useMemo(() => (showRows ? rows.map((row) => row.id) : []), [rows, showRows])

  const onRowActivate = React.useMemo(() => {
    if (!onRowSelect) return undefined
    return (id: string) => {
      const row = rows.find((r) => r.id === id)
      if (row) onRowSelect(row)
    }
  }, [rows, onRowSelect])

  let body: React.ReactNode
  if (status === 'loading' || status === 'error') {
    const count = status === 'loading' ? skeletonRows : ERROR_ROWS
    body = Array.from({ length: count }, (_, i) => <PoolTableSkeletonRow key={i} columns={POOL_COLUMNS} />)
  } else if (rows.length === 0) {
    body = (
      <ExploreTableMessage>
        <ExploreEmptyState
          noun="pools"
          query={query}
          chainName={chainInfo?.name}
          onClearSearch={onClearSearch}
          onSearchAllNetworks={onSearchAllNetworks}
        />
      </ExploreTableMessage>
    )
  } else {
    body = rows.map((row, i) => (
      <PoolTableRow
        key={row.id}
        row={row}
        rank={i + 1}
        columns={POOL_COLUMNS}
        query={query}
        badge={getChain(row.chain)}
      />
    ))
  }

  return (
    <ExploreTable
      label="Pools"
      columns={POOL_COLUMNS}
      sort={sort}
      onSort={(field) => onSortChange(nextSort(sort, field))}
      rowIds={rowIds}
      onRowActivate={onRowActivate}
      stickyTop={stickyTop}
      busy={status === 'loading' || status === 'refetching'}
      shimmer={status === 'loading'}
      pulse={status === 'refetching'}
      dimHeader={status === 'error'}
      overlay={status === 'error' ? <ExploreErrorState onRetry={onRetry} /> : undefined}
      explode={explode}
      className={className}
    >
      {body}
    </ExploreTable>
  )
}
