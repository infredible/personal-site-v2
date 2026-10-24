'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, X } from '../../icons'
import { cn } from '@/lib/utils'
import { UniTooltip } from '../../UniTooltip'
import { formatPercent, formatTokenAmount } from '../format'
import { expiryLabel } from '../limit'
import type { LimitOrder } from '../types'
import { TokenLogo } from './TokenLogo'

/*
 * Open limit orders, under the form. Uniswap tucks these behind a "Your limits"
 * link into a side drawer; the order you just placed showing up right below
 * the button is the confirmation, so they live here. One row per order:
 * the pair as stacked logos, what it trades, how far it sits from market (the
 * exact price on hover), time left, and a cancel button.
 */

interface LimitOrderListProps {
  orders: LimitOrder[]
  onCancel?: (id: string) => void
  className?: string
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const

function OrderRow({ order, onCancel }: { order: LimitOrder; onCancel?: (id: string) => void }) {
  // Say it the way the price panel did: the move in the displayed number
  const inverted = order.base.symbol !== order.input.token.symbol
  const delta = inverted ? 1 / (1 + order.gain) - 1 : order.gain
  const away = Math.abs(order.gain) < 0.0005 ? 'at market' : `${formatPercent(Math.abs(delta))} ${delta > 0 ? 'above' : 'below'} market`
  return (
    <div className="flex items-center gap-uni-12 rounded-uni-16 bg-surface2 px-uni-12 py-uni-12">
      {/* Sell top-left, buy bottom-right, cut out of the row with a surface2 ring */}
      <span aria-hidden className="relative size-uni-36 shrink-0">
        <TokenLogo token={order.input.token} size={24} className="absolute top-0 left-0" />
        <TokenLogo
          token={order.output.token}
          size={24}
          className="absolute right-0 bottom-0 bg-surface2 outline-2 outline-surface2"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-uni-2">
        <span className="flex min-w-0 items-center gap-uni-4 text-body3 text-neutral1">
          <span className="truncate">
            {formatTokenAmount(order.input.amount)} {order.input.token.symbol}
          </span>
          <ArrowDown className="size-uni-12 shrink-0 -rotate-90 text-neutral3" />
          <span className="sr-only">for</span>
          <span className="truncate">
            {formatTokenAmount(order.output.amount)} {order.output.token.symbol}
          </span>
        </span>
        <span className="flex min-w-0 text-body4 text-neutral2">
          <UniTooltip content={`Fills at 1 ${order.base.symbol} = ${formatTokenAmount(order.price)} ${order.quote.symbol}`}>
            <span className="cursor-default truncate first-letter:uppercase">{away}</span>
          </UniTooltip>
          <span className="shrink-0 whitespace-pre text-neutral3"> · {expiryLabel(order.expiry)} left</span>
        </span>
      </div>
      {onCancel && (
        <UniTooltip content="Cancel order">
          <button
            type="button"
            aria-label={`Cancel order: ${order.input.token.symbol} for ${order.output.token.symbol}`}
            onClick={() => onCancel(order.id)}
            className={cn(
              '-mr-uni-4 flex size-uni-28 shrink-0 cursor-pointer items-center justify-center rounded-uni-full text-neutral2 outline-none',
              'transition-[background-color,color,transform,translate,scale,rotate] duration-100 ease-out active:scale-[0.95]',
              'hover:bg-surface3 hover:text-neutral1 focus-visible:bg-surface3 focus-visible:text-neutral1',
            )}
          >
            <X aria-hidden className="size-uni-16" />
          </button>
        </UniTooltip>
      )}
    </div>
  )
}

function LimitOrderList({ orders, onCancel, className }: LimitOrderListProps) {
  const reduceMotion = useReducedMotion()
  return (
    <section data-slot="limit-orders" aria-label="Open limit orders" className={cn('flex flex-col gap-uni-8', className)}>
      <h3 className="flex items-center gap-uni-6 px-uni-8 text-body3 text-neutral2">
        Open orders
        <span className="flex h-uni-20 min-w-uni-20 items-center justify-center rounded-uni-full bg-surface3 px-uni-6 text-buttonLabel4 text-neutral1 tabular-nums">
          {orders.length}
        </span>
      </h3>
      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
          {orders.map((order) => (
            // Height opens so the list below makes room, then the row fades in;
            // a cancel collapses faster than a place opens
            <motion.li
              key={order.id}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', transition: { duration: 0.24, ease: EASE_OUT } }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
              className="overflow-hidden"
            >
              <div className="pb-uni-4">
                <OrderRow order={order} onCancel={onCancel} />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}

export { LimitOrderList }
export type { LimitOrderListProps }
