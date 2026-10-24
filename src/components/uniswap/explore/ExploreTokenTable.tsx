'use client'

import * as React from 'react'
import { getChain, nextSort, tokenNetworks } from './filters'
import { ExploreEmptyState, ExploreErrorState } from './parts/ExploreStates'
import { ExploreTable, ExploreTableMessage } from './parts/Table'
import { tokenColumns } from './parts/columns'
import { TokenTableRow, TokenTableSkeletonRow } from './parts/TokenTableRow'
import type {
  ExploreChain,
  ExploreStatus,
  ExploreTimePeriod,
  ExploreTokenStats,
  SortState,
  TokenSortField,
} from './types'

/*
 * The Tokens table, display-only: rows arrive sorted and filtered (see
 * filters.ts), the header reports sort clicks, and `status` picks the body.
 *
 *   loading     skeleton rows sized to the text they replace, shimmering
 *   refetching  the rows on screen stay and pulse until new ones arrive
 *   ready       rows; an empty list shows the empty state
 *   error       static skeleton rows, header dimmed, the error card on top
 *
 * Production (TokensTable) swaps in 20 skeleton rows on every sort or filter
 * change; here only the first load does, and sorting reorders in place.
 */

export interface ExploreTokenTableProps {
  rows: ExploreTokenStats[]
  sort: SortState<TokenSortField>
  onSortChange: (sort: SortState<TokenSortField>) => void
  status: ExploreStatus
  /** Search text, highlighted in names and echoed by the empty state */
  query?: string
  /** Volume window shown in the Volume column */
  period?: ExploreTimePeriod
  /** Network the rows are for: badges every logo, and names it in the price tooltip and empty state */
  chain?: ExploreChain
  onRetry?: () => void
  onClearSearch?: () => void
  /** Empty state's "Search all networks" (shown when `chain` is one network) */
  onSearchAllNetworks?: () => void
  onRowSelect?: (row: ExploreTokenStats) => void
  /** Skeleton rows on first load (default 10) */
  skeletonRows?: number
  /** Header sticks this far below the scroll container's top */
  stickyTop?: number
  /** data-explode on the header and rows */
  explode?: boolean
  className?: string
}

const ERROR_ROWS = 8

export function ExploreTokenTable({
  rows,
  sort,
  onSortChange,
  status,
  query,
  period = '1D',
  chain = 'all',
  onRetry,
  onClearSearch,
  onSearchAllNetworks,
  onRowSelect,
  skeletonRows = 10,
  stickyTop,
  explode,
  className,
}: ExploreTokenTableProps) {
  const chainInfo = chain === 'all' ? undefined : getChain(chain)
  const columns = React.useMemo(() => tokenColumns(chainInfo?.name), [chainInfo?.name])
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
  if (status === 'loading') {
    body = Array.from({ length: skeletonRows }, (_, i) => <TokenTableSkeletonRow key={i} columns={columns} />)
  } else if (status === 'error') {
    body = Array.from({ length: ERROR_ROWS }, (_, i) => <TokenTableSkeletonRow key={i} columns={columns} />)
  } else if (rows.length === 0) {
    body = (
      <ExploreTableMessage>
        <ExploreEmptyState
          noun="tokens"
          query={query}
          chainName={chainInfo?.name}
          onClearSearch={onClearSearch}
          onSearchAllNetworks={onSearchAllNetworks}
        />
      </ExploreTableMessage>
    )
  } else {
    body = rows.map((row, i) => {
      const networks = chain === 'all' ? tokenNetworks(row.token.symbol) : undefined
      const badge = chainInfo ?? (networks?.length === 1 ? networks[0] : undefined)
      return (
        <TokenTableRow
          key={row.id}
          row={row}
          rank={i + 1}
          columns={columns}
          period={period}
          query={query}
          badge={badge}
          networks={networks}
          sortField={sort.field}
        />
      )
    })
  }

  return (
    <ExploreTable
      label="Tokens"
      narrowEndLabel="Price and 1D change"
      columns={columns}
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
