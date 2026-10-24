'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatTokenAmount, formatUsd } from '../../swap/format'
import { TokenLogo } from '../../swap/parts/TokenLogo'
import type { Token } from '../../swap/types'
import { amountFontSize, formatTyped } from '../buy'
import { ArrowUpDown } from '../icons'
import type { BuyDenomination } from '../types'

/*
 * The big number. Typed digits rise into place, deleted ones drop out (the
 * prototype's fade-up / fade-down), staggered 20ms when several change at
 * once. Only characters that changed animate: a typed digit moves nothing
 * else, while a comma shifting over re-sets the digits around it, which reads
 * as the number rolling. It steps down 64 → 56 → 48 → 40px as it grows.
 *
 * In dollars a "$" sits before it; in tokens the symbol follows it. Both are
 * in flow and centered with the number (switching units glides it over as
 * one collapses and the other opens), so a long amount's symbol doesn't run
 * into the arrows on the right that switch between them. The line under it
 * is the other unit.
 */

interface AmountDisplayProps {
  amount: string
  denomination: BuyDenomination
  /** The token bought; token denomination counts in it */
  token: Token
  usd: number
  tokenAmount: number
  onToggleDenomination?: () => void
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** `shift`: +12 rises into place (typing), -12 drops (deleting), 0 fades only (reduced motion) */
const charVariants = {
  enter: (shift: number) => ({ opacity: 0, y: shift }),
  center: { opacity: 1, y: 0 },
  exit: (shift: number) => ({ opacity: 0, y: -shift, transition: { duration: 0.1, ease: EASE_OUT } }),
}

export function AmountDisplay({ amount, denomination, token, usd, tokenAmount, onToggleDenomination }: AmountDisplayProps) {
  const reduceMotion = useReducedMotion()
  const display = formatTyped(amount)
  const chars = display.split('')
  const fontSize = amountFontSize(display, denomination)
  const empty = amount === '0'
  const inUsd = denomination === 'usd'

  // The previous amount, kept in state so it can be read during render: it says
  // which characters are new, and whether this edit deleted (plays downward).
  const [track, setTrack] = React.useState({ amount, previous: amount })
  if (track.amount !== amount) setTrack({ amount, previous: track.amount })
  const shift = reduceMotion ? 0 : amount.length < track.previous.length ? -12 : 12
  const before = formatTyped(track.previous)
  const delays: number[] = []
  chars.reduce((order, char, i) => {
    const changed = before[i] !== char
    delays.push(changed ? order * 0.02 : 0)
    return changed ? order + 1 : order
  }, 0)

  const toggleLabel = inUsd ? `Enter the amount in ${token.symbol}` : 'Enter the amount in US dollars'
  const other = inUsd ? `${empty ? '0' : formatTokenAmount(tokenAmount)} ${token.symbol}` : formatUsd(usd)

  return (
    <div data-slot="buy-amount" className="flex w-full flex-col items-center gap-uni-8">
      <div className="relative flex h-[72px] w-full items-center justify-center">
        <p
          className={cn(
            'relative flex items-baseline leading-none tracking-[-0.02em] tabular-nums transition-[font-size,color] duration-150 ease-out',
            empty ? 'text-neutral3' : 'text-neutral1',
          )}
          style={{ fontSize, fontWeight: 485 }}
        >
          <span className="sr-only" aria-live="polite">
            {inUsd ? formatUsd(Number.parseFloat(amount) || 0) : `${display} ${token.symbol}`}
          </span>
          <span
            aria-hidden
            className={cn(
              'self-start overflow-hidden pt-[0.12em] text-[24px] leading-none transition-[max-width,opacity,translate] duration-150 ease-out',
              inUsd ? 'max-w-uni-24 pr-uni-2 opacity-100' : 'max-w-0 translate-y-uni-8 opacity-0',
            )}
          >
            $
          </span>
          <span aria-hidden className="relative flex">
            {/* `custom` reaches exiting characters too, so they leave in this edit's direction */}
            <AnimatePresence initial={false} mode="popLayout" custom={shift}>
              {chars.map((char, i) => (
                <motion.span
                  key={`${i}:${char}`}
                  className="inline-block"
                  custom={shift}
                  variants={charVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.16, ease: EASE_OUT, delay: delays[i] }}
                >
                  {char}
                </motion.span>
              ))}
            </AnimatePresence>
          </span>
          <span
            aria-hidden
            className={cn(
              'overflow-hidden text-[16px] leading-none whitespace-nowrap transition-[max-width,opacity,translate] duration-150 ease-out',
              inUsd ? 'max-w-0 translate-y-uni-8 opacity-0' : 'max-w-[80px] pl-uni-6 opacity-100',
            )}
          >
            {token.symbol}
          </span>
        </p>
        {onToggleDenomination && (
          <button
            type="button"
            onClick={onToggleDenomination}
            aria-label={toggleLabel}
            title={toggleLabel}
            className={cn(
              'absolute right-uni-12 flex size-uni-36 cursor-pointer items-center justify-center rounded-uni-full text-neutral3 outline-none',
              'transition-[color,background-color,scale] duration-100 ease-out hover:text-neutral2 active:scale-90',
              'focus-visible:bg-surface2 focus-visible:text-neutral2',
            )}
          >
            <ArrowUpDown
              className="size-uni-20 transition-transform duration-200 ease-[cubic-bezier(0.77,0,0.175,1)]"
              style={{ transform: inUsd ? undefined : 'rotate(180deg)' }}
            />
          </button>
        )}
      </div>
      <p className="flex items-center gap-uni-8 text-body3 text-neutral2 tabular-nums">
        <TokenLogo token={token} size={16} />
        <span>{other}</span>
      </p>
    </div>
  )
}
