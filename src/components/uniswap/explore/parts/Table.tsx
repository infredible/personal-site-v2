'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArrowDown } from '../../icons'
import { UniTooltip } from '../../UniTooltip'
import type { SortState } from '../types'

/*
 * Table primitives for the Explore tables, after Uniswap's shared Table
 * (apps/web/src/components/Table: Table, TableHead, Cell, HeaderCell,
 * SortableHeader). Same geometry: a surface2 header row with 12px radius and
 * 12px vertical padding, 64px rows 2px apart with a 12px-radius hover fill
 * (surface1Hovered, 100ms), 12px cell padding (8px at the outer edges),
 * right-aligned tabular numbers, no outer border or card.
 *
 * Production renders divs (tanstack + react-scroll-sync). Here it's a real
 * <table> with explicit roles (its parts are display: flex/block, which can
 * drop native table semantics), so headers are <th aria-sort> and sorting is
 * a <button>. The header and body are separate horizontal scrollers kept in
 * sync, as in production, so the header can stay sticky against the page
 * while the body scrolls sideways.
 *
 * Differences from production:
 * - Sort headers are buttons with aria-sort; header tooltips open on focus as
 *   well as hover, and clicking the label sorts (production's tooltip
 *   swallowed label clicks).
 * - Rows are focusable with a roving tabindex: one tab stop for the body,
 *   ↑/↓ move, Home/End jump, ←/→ scroll sideways, Enter activates.
 * - Rows reorder with a FLIP layout animation (framer-motion `layout`) instead
 *   of a skeleton swap; reduced motion moves them instantly.
 * - The sticky header gains a hairline once it's stuck (production shows no
 *   change); pinned cells are opaque rather than 95%.
 * - Sizing follows the table's own container (@container/explore-table), so
 *   it reflows inside a 375px frame as on a phone.
 */

export type ExploreColumnAlign = 'start' | 'end'

export interface ExploreColumn<F extends string = string> {
  id: string
  label: string
  align: ExploreColumnAlign
  /** Width (and container-query variants on @container/explore-table) */
  className: string
  /** Sortable: the field it sorts by */
  sortField?: F
  /** Header description, shown on hover and focus */
  tooltip?: React.ReactNode
  /** Stays put while the body scrolls sideways (pass its sticky `left` in className) */
  pinned?: boolean
  /** The last pinned column draws the 1px divider while the table overflows */
  pinnedEdge?: boolean
}

/* Cells ------------------------------------------------------------------- */

const cellBase = 'flex min-w-0 items-center px-uni-12 first:pl-uni-8 last:pr-uni-8'

function cellClassName(column: ExploreColumn, surface: 'header' | 'body') {
  return cn(
    cellBase,
    column.align === 'end' ? 'justify-end text-right' : 'justify-start text-left',
    column.pinned &&
      (surface === 'header'
        ? 'sticky z-[1] bg-surface2'
        : 'sticky z-[1] bg-surface1 transition-colors duration-100 ease-in-out group-hover/row:bg-surface1Hovered group-focus-visible/row:bg-surface1Hovered'),
    column.pinnedEdge && 'group-data-[overflowing=true]/explore-table:shadow-[inset_-1px_0_0_var(--uni-surface3)]',
    column.className,
  )
}

/** A body cell. Text inside should truncate (`truncate`, `min-w-0`) rather than widen the column. */
export function ExploreTableCell({
  column,
  className,
  children,
  ...props
}: { column: ExploreColumn } & React.ComponentProps<'td'>) {
  return (
    <td role="cell" className={cn(cellClassName(column, 'body'), 'overflow-hidden', className)} {...props}>
      {children}
    </td>
  )
}

/* Header ------------------------------------------------------------------ */

const ariaSort = (active: boolean, direction: 'asc' | 'desc') =>
  active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'

export interface ExploreTableHeaderCellProps<F extends string> {
  column: ExploreColumn<F>
  sort?: SortState<F>
  onSort?: (field: F) => void
}

/**
 * Header cell. Sortable columns render a button: the arrow (16px, neutral1)
 * sits left of the label on the active column only, like production's
 * HeaderArrow + HeaderSortText; the label is neutral1 when active.
 */
export function ExploreTableHeaderCell<F extends string>({ column, sort, onSort }: ExploreTableHeaderCellProps<F>) {
  const field = column.sortField
  const active = !!field && sort?.field === field
  const direction = sort?.direction ?? 'desc'

  let content: React.ReactNode
  if (field) {
    const button = (
      <button
        type="button"
        onClick={() => onSort?.(field)}
        className={cn(
          'inline-flex cursor-pointer items-center gap-uni-4 rounded-uni-4 text-body3 whitespace-nowrap outline-none select-none',
          'transition-opacity duration-[80ms] ease-in-out hover:opacity-60',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1',
          active ? 'text-neutral1' : 'text-neutral2',
        )}
      >
        {active && (
          <ArrowDown
            className={cn('size-uni-16 text-neutral1', direction === 'asc' && 'rotate-180')}
            aria-hidden
          />
        )}
        {column.label}
      </button>
    )
    content = column.tooltip ? (
      <UniTooltip content={column.tooltip} className="max-w-[240px] text-body3">
        {button}
      </UniTooltip>
    ) : (
      button
    )
  } else {
    // Non-sortable labels (Token, Pool, 1D chart) are weight 500 in production; # is plain
    content = (
      <span className={cn('text-body3 whitespace-nowrap text-neutral2', column.id !== 'index' && '[font-weight:500]')}>
        {column.label}
      </span>
    )
  }

  return (
    <th
      role="columnheader"
      scope="col"
      aria-sort={field ? ariaSort(active, direction) : undefined}
      className={cn(cellClassName(column, 'header'), 'py-uni-12 font-[inherit]')}
    >
      {content}
    </th>
  )
}

/* Table ------------------------------------------------------------------- */

interface TableContextValue {
  activeId: string | undefined
  onRowFocus: (id: string) => void
  onRowActivate?: (id: string) => void
  reduceMotion: boolean
}

const TableContext = React.createContext<TableContextValue>({
  activeId: undefined,
  onRowFocus: () => {},
  reduceMotion: false,
})

/** Nearest ancestor that scrolls vertically (the sticky header's and the observer's root), or null for the page. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node
  }
  return null
}

const hiddenScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export interface ExploreTableProps<F extends string> {
  columns: ExploreColumn<F>[]
  sort?: SortState<F>
  onSort?: (field: F) => void
  /** Row ids in display order, for keyboard navigation (rows render as children) */
  rowIds: string[]
  /** Enter or click on a row */
  onRowActivate?: (id: string) => void
  /** Accessible name, e.g. "Tokens" */
  label: string
  /** Distance from the scroll container's top where the header sticks (e.g. under an app bar) */
  stickyTop?: number
  /** First load or refetch in progress (aria-busy) */
  busy?: boolean
  /** Header at 40% (production's error state) */
  dimHeader?: boolean
  /** Shimmer the body (first-load skeletons) */
  shimmer?: boolean
  /** Old values pulse while a refetch is in flight */
  pulse?: boolean
  /** Mark header and rows with data-explode (showcase exploded view) */
  explode?: boolean
  /** Centered over the body, outside the scroller (the error card) */
  overlay?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * The table: container, sticky header row, and body. Rows (ExploreTableRow,
 * ExploreSkeletonRow, ExploreTableMessage) are children.
 */
export function ExploreTable<F extends string>({
  columns,
  sort,
  onSort,
  rowIds,
  onRowActivate,
  label,
  stickyTop = 0,
  busy = false,
  dimHeader = false,
  shimmer = false,
  pulse = false,
  explode = false,
  overlay,
  className,
  children,
}: ExploreTableProps<F>) {
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const headRef = React.useRef<HTMLTableSectionElement>(null)
  const bodyRef = React.useRef<HTMLTableSectionElement>(null)
  const [stuck, setStuck] = React.useState(false)
  const [scroll, setScroll] = React.useState({ overflowing: false, canScrollRight: false })
  const [focusedId, setFocusedId] = React.useState<string | undefined>()
  const reduceMotion = useReducedMotion() ?? false

  // Roving tabindex: the last focused row keeps the tab stop while it's still listed
  const activeId = focusedId && rowIds.includes(focusedId) ? focusedId : rowIds[0]

  const measure = React.useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    const overflowing = body.scrollWidth > body.clientWidth + 1
    const canScrollRight = overflowing && body.scrollLeft + body.clientWidth < body.scrollWidth - 1
    setScroll((prev) =>
      prev.overflowing === overflowing && prev.canScrollRight === canScrollRight ? prev : { overflowing, canScrollRight },
    )
  }, [])

  React.useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    if (body.firstElementChild) observer.observe(body.firstElementChild)
    return () => observer.disconnect()
  }, [measure, rowIds.length, shimmer])

  // Stuck once the sentinel above the table passes under the sticky line
  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const root = scrollParent(sentinel)
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < rootTop + stickyTop + 1)
      },
      { root, rootMargin: `-${stickyTop}px 0px 0px 0px`, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [stickyTop])

  const echoRef = React.useRef<HTMLElement | null>(null)

  // Header and body scroll sideways together (production: react-scroll-sync)
  const syncFrom = (source: 'head' | 'body') => {
    const from = source === 'head' ? headRef.current : bodyRef.current
    const to = source === 'head' ? bodyRef.current : headRef.current
    if (source === 'body') measure()
    // The write below fires the other side's scroll event a frame later; swallow it so a stale value
    // never bounces back and cancels smooth or momentum scrolling
    if (from && from === echoRef.current) {
      echoRef.current = null
      return
    }
    if (from && to && to.scrollLeft !== from.scrollLeft) {
      const before = to.scrollLeft
      to.scrollLeft = from.scrollLeft
      // No change (clamped) means no echo event to wait for
      echoRef.current = to.scrollLeft !== before ? to : null
    }
  }

  const focusRow = (id: string | undefined) => {
    if (!id) return
    const row = bodyRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`)
    // preventScroll keeps a canvas from panning; the row is scrolled into view by hand
    row?.focus({ preventScroll: true })
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement
    const id = target.dataset.rowId
    if (!id || rowIds.length === 0) return
    const index = rowIds.indexOf(id)
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault()
        const next = index + (e.key === 'ArrowDown' ? 1 : -1)
        focusRow(rowIds[Math.max(0, Math.min(rowIds.length - 1, next))])
        return
      }
      case 'Home':
        e.preventDefault()
        focusRow(rowIds[0])
        return
      case 'End':
        e.preventDefault()
        focusRow(rowIds[rowIds.length - 1])
        return
      case 'ArrowLeft':
      case 'ArrowRight': {
        const body = bodyRef.current
        if (!body || !scroll.overflowing) return
        e.preventDefault()
        body.scrollBy({ left: e.key === 'ArrowRight' ? 120 : -120, behavior: reduceMotion ? 'auto' : 'smooth' })
        return
      }
      case 'Enter':
        e.preventDefault()
        onRowActivate?.(id)
        return
    }
  }

  const context = React.useMemo<TableContextValue>(
    () => ({ activeId, onRowFocus: setFocusedId, onRowActivate, reduceMotion }),
    [activeId, onRowActivate, reduceMotion],
  )

  return (
    <div
      data-slot="explore-table"
      data-overflowing={scroll.overflowing}
      className={cn('group/explore-table @container/explore-table relative w-full min-w-0', className)}
      style={{ '--explore-sticky-top': `${stickyTop}px` } as React.CSSProperties}
    >
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <table role="table" aria-label={label} aria-busy={busy || undefined} className="-mt-px block w-full">
        <thead
          ref={headRef}
          role="rowgroup"
          data-explode={explode ? 'header' : undefined}
          data-stuck={stuck || undefined}
          onScroll={() => syncFrom('head')}
          style={{ top: stickyTop }}
          className={cn(
            'sticky z-10 block overflow-x-auto overflow-y-hidden bg-surface1 pt-uni-12 pb-uni-2',
            // Hairline once stuck, so rows sliding under it have an edge
            'shadow-[0_1px_0_transparent] transition-shadow duration-150 ease-out data-[stuck]:shadow-[0_1px_0_var(--uni-surface3)]',
            hiddenScrollbar,
          )}
        >
          <tr
            role="row"
            className={cn(
              'flex w-fit min-w-full rounded-uni-12 bg-surface2 transition-opacity duration-150',
              dimHeader && 'opacity-40',
            )}
          >
            {columns.map((column) => (
              <ExploreTableHeaderCell key={column.id} column={column} sort={sort} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <TableContext.Provider value={context}>
          <tbody
            ref={bodyRef}
            role="rowgroup"
            data-explode={explode ? 'rows' : undefined}
            onScroll={() => syncFrom('body')}
            onKeyDown={onBodyKeyDown}
            className={cn(
              'relative flex flex-col gap-uni-2 overflow-x-auto overflow-y-hidden overscroll-x-none [overflow-anchor:none]',
              'group-data-[overflowing=true]/explore-table:gap-0',
              hiddenScrollbar,
              shimmer && 'uni-shimmer',
              // Right-edge fade while more columns sit offscreen (production's TableScrollMask, 20px)
              !shimmer && scroll.canScrollRight && '[mask-image:linear-gradient(to_left,transparent,#000_20px)]',
              pulse && 'animate-uni-refetch-pulse motion-reduce:animate-none motion-reduce:opacity-60',
            )}
          >
            {children}
          </tbody>
        </TableContext.Provider>
      </table>
      {overlay && (
        <div className="pointer-events-none absolute inset-x-0 top-[57px] bottom-0 z-[5] flex items-center justify-center p-uni-16 *:pointer-events-auto">
          {overlay}
        </div>
      )}
    </div>
  )
}

/* Rows -------------------------------------------------------------------- */

const ROW_TRANSITION = { type: 'spring', duration: 0.22, bounce: 0 } as const

// scroll-margin keeps a row focused from the keyboard clear of the sticky header (12 + 42 + 2)
const rowBase =
  'relative flex h-[64px] w-fit min-w-full shrink-0 rounded-uni-12 scroll-mt-[calc(var(--explore-sticky-top,0px)+60px)]'

export interface ExploreTableRowProps extends Omit<React.ComponentProps<'tr'>, 'ref' | 'id' | 'children'> {
  /** Stable row id (keyboard navigation, FLIP identity) */
  rowId: string
  children: React.ReactNode
}

/**
 * A data row: 64px, hover fill, focusable (roving tabindex), animates to its
 * new position when the order changes.
 */
export function ExploreTableRow({ rowId, className, children, onClick, onFocus, ...props }: ExploreTableRowProps) {
  const { activeId, onRowFocus, onRowActivate, reduceMotion } = React.useContext(TableContext)
  return (
    <motion.tr
      role="row"
      layout={reduceMotion ? false : 'position'}
      transition={ROW_TRANSITION}
      data-row-id={rowId}
      tabIndex={rowId === activeId ? 0 : -1}
      onFocus={(e: React.FocusEvent<HTMLTableRowElement>) => {
        onRowFocus(rowId)
        onFocus?.(e)
      }}
      onClick={(e: React.MouseEvent<HTMLTableRowElement>) => {
        onRowActivate?.(rowId)
        onClick?.(e)
      }}
      className={cn(
        rowBase,
        'group/row text-body2 text-neutral1 tabular-nums outline-none [font-variant-numeric:lining-nums_tabular-nums]',
        'transition-colors duration-100 ease-in-out hover:bg-surface1Hovered focus-visible:bg-surface1Hovered',
        onRowActivate && 'cursor-pointer',
        // Focus ring above the pinned cells (which paint their own background)
        'after:pointer-events-none after:absolute after:inset-0 after:z-[2] after:rounded-uni-12 after:content-[""]',
        'focus-visible:after:ring-2 focus-visible:after:ring-accent1 focus-visible:after:ring-inset',
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.tr>)}
    >
      {children}
    </motion.tr>
  )
}

/**
 * Skeleton row (first load, error backdrop): the real columns with each cell's
 * placeholder, so shapes line up with the rows that replace them.
 */
export function ExploreSkeletonRow({
  columns,
  cells,
  className,
}: {
  columns: ExploreColumn[]
  /** Placeholder per column id */
  cells: Record<string, React.ReactNode>
  className?: string
}) {
  return (
    <tr role="row" aria-hidden className={cn(rowBase, className)}>
      {columns.map((column) => (
        <td key={column.id} role="cell" className={cn(cellClassName(column, 'body'), 'overflow-hidden')}>
          {cells[column.id]}
        </td>
      ))}
    </tr>
  )
}

/** A full-width body row for messages (empty state), centered in the visible width. */
export function ExploreTableMessage({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <tr role="row" className={cn('sticky left-0 flex w-full', className)}>
      <td role="cell" className="flex w-full flex-col items-center">
        {children}
      </td>
    </tr>
  )
}
