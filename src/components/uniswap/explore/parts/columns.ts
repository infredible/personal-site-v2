import type { ExploreTimePeriod, PoolSortField, TokenSortField } from '../types'
import type { ExploreColumn } from './Table'

/*
 * Column sets, in production's order and widths
 * (pages/Explore/tables/Tokens/TokensTable.tsx, Pools/PoolTable.tsx).
 * Widths include the 12px cell padding; data columns carry production's extra
 * 32px lead (16px for Volume) so FDV and Volume read as a pair.
 *
 * Breakpoints are the table's own width (@container/explore-table), not the
 * viewport, so the same table reflows inside a 375px frame:
 *   Tokens  ≥ 1104  # · Token (flex, min 280) · Price 136 · 1H 124 · 1D 124 · FDV 116 · Volume 144 · 1D chart 120
 *           < 1104  # hidden, Token min 225 (production's lg)
 *           <  969  compact pinned cell: logo + symbol, 128 (production keeps 225 + name)
 *   Pools   ≥  850  # · Pool (min 240) · TVL · 1D vol · 30D vol · 1D vol/TVL · Pool APR (110 each, sharing spare width)
 *           <  850  # hidden, Pool min 210
 *           <  760  compact pinned cell, 168
 * # and the name column are pinned; below the minimum the body scrolls sideways.
 * Volume is 20px wider than production's 124 to hold its period menu ("1D ⌄"),
 * taken from the Token column's minimum so the breakpoints hold.
 * Under 640px (both tables) rows drop to two cells and nothing scrolls
 * sideways (EXPLORE_TABLE_NARROW_WIDTH, Table.tsx); sortLabel names a column
 * in that layout's sort menu.
 */

export const TOKEN_TABLE_COMPACT_WIDTH = 969
export const POOL_TABLE_COMPACT_WIDTH = 760

const DATA = 'shrink-0'

export function tokenColumns(chainName?: string, period: ExploreTimePeriod = '1D'): ExploreColumn<TokenSortField>[] {
  return [
    {
      id: 'index',
      label: '#',
      align: 'start',
      pinned: true,
      tooltip: `Ranked by ${period} volume`,
      className: 'w-[60px] shrink-0 left-0 rounded-l-uni-12 @max-[1104px]/explore-table:hidden',
    },
    {
      id: 'token',
      label: 'Token',
      align: 'start',
      pinned: true,
      pinnedEdge: true,
      // contain:inline-size keeps long names from widening the column past its minimum
      className: [
        'min-w-[280px] flex-1 [contain:inline-size] left-[60px]',
        '@max-[1104px]/explore-table:left-0 @max-[1104px]/explore-table:min-w-[225px] @max-[1104px]/explore-table:rounded-l-uni-12 @max-[1104px]/explore-table:pl-uni-8',
        '@max-[969px]/explore-table:w-[128px] @max-[969px]/explore-table:min-w-[128px] @max-[969px]/explore-table:flex-none',
      ].join(' '),
    },
    {
      id: 'price',
      label: 'Price',
      align: 'end',
      sortField: 'price',
      tooltip: chainName
        ? `Token price on ${chainName}`
        : 'For multi-network tokens, token price reflects price on highest-volume network.',
      className: `w-[136px] ${DATA}`,
    },
    { id: 'change1h', label: '1H', sortLabel: '1H change', align: 'end', sortField: 'change1h', className: `w-[124px] ${DATA}` },
    { id: 'change1d', label: '1D', sortLabel: '1D change', align: 'end', sortField: 'change1d', className: `w-[124px] ${DATA}` },
    {
      id: 'fdv',
      label: 'FDV',
      align: 'end',
      sortField: 'fdv',
      tooltip: 'Fully diluted valuation (FDV) calculates the total market value assuming all tokens are in circulation.',
      className: `w-[116px] ${DATA}`,
    },
    {
      id: 'volume',
      label: 'Volume',
      align: 'end',
      sortField: 'volume',
      tooltip:
        'Volume is the amount of the asset that has been traded on Uniswap or within the Solana ecosystem during the selected timeframe.',
      className: `w-[144px] ${DATA}`,
    },
    { id: 'sparkline', label: '1D chart', align: 'end', className: `w-[120px] ${DATA}` },
  ]
}

const POOL_DATA = 'min-w-[110px] flex-[1_1_0%]'

export const POOL_COLUMNS: ExploreColumn<PoolSortField>[] = [
  {
    id: 'index',
    label: '#',
    align: 'start',
    pinned: true,
    tooltip: 'Ranked by 1D volume',
    className: 'w-[60px] shrink-0 left-0 rounded-l-uni-12 @max-[850px]/explore-table:hidden',
  },
  {
    id: 'pool',
    label: 'Pool',
    align: 'start',
    pinned: true,
    pinnedEdge: true,
    className: [
      'min-w-[240px] flex-[2_1_0%] [contain:inline-size] left-[60px]',
      '@max-[850px]/explore-table:left-0 @max-[850px]/explore-table:min-w-[210px] @max-[850px]/explore-table:rounded-l-uni-12 @max-[850px]/explore-table:pl-uni-8',
      '@max-[760px]/explore-table:w-[168px] @max-[760px]/explore-table:min-w-[168px] @max-[760px]/explore-table:flex-none',
    ].join(' '),
  },
  { id: 'tvl', label: 'TVL', align: 'end', sortField: 'tvl', tooltip: 'Total value locked', className: POOL_DATA },
  { id: 'volume1d', label: '1D vol', align: 'end', sortField: 'volume1d', tooltip: '1 day volume', className: POOL_DATA },
  {
    id: 'volume30d',
    label: '30D vol',
    align: 'end',
    sortField: 'volume30d',
    tooltip: '30 day volume',
    className: POOL_DATA,
  },
  { id: 'volumeTvl', label: '1D vol/TVL', align: 'end', sortField: 'volumeTvl', className: POOL_DATA },
  {
    id: 'apr',
    label: 'Pool APR',
    align: 'end',
    sortField: 'apr',
    tooltip: 'Annualized based on 1 day fees',
    className: POOL_DATA,
  },
]
