'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ArrowDown, ChevronsOut } from '../../icons'

/*
 * The pay and receive cards, stacked, with the flip button on the seam. The
 * top card always pays. Flipping doesn't swap the cards' contents: the two
 * cards trade places (translateY, ease-in-out), so the asset you're watching
 * moves with its card, as in the prototype.
 */

export interface AssetCardContent {
  /** "Pay with" / "Receive": read before the title by screen readers */
  role: string
  logo: React.ReactNode
  title: string
  subtitle: string
  value: string
  /** "Balance", "Limit" */
  valueLabel: string
}

/** Card height (66) + gap (6): the distance a card travels on a flip */
const CARD_STEP = 72

const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)'

export function AssetCard({
  content,
  onClick,
  className,
  style,
  ...props
}: {
  content: AssetCardContent
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
} & Pick<React.ComponentProps<'button'>, 'aria-haspopup' | 'aria-expanded' | 'id'>) {
  const { role, logo, title, subtitle, value, valueLabel } = content
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={onClick ? undefined : -1}
      className={cn(
        'flex h-[66px] w-full items-center justify-between gap-uni-8 rounded-uni-20 border border-surface3 bg-surface1 p-uni-12 pr-uni-16 text-left shadow-uni-short outline-none',
        onClick && 'cursor-pointer',
        'transition-[background-color,scale] duration-100 ease-out hover:bg-surface1Hovered active:scale-[0.99]',
        'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-neutral1',
        className,
      )}
      style={style}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-uni-8">
        {logo}
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-uni-4 text-body2 text-neutral1">
            <span className="sr-only">{role}: </span>
            <span className="truncate">{title}</span>
            <ChevronsOut className="size-uni-16 shrink-0 text-neutral2" />
          </span>
          <span className="truncate text-body4 text-neutral2">{subtitle}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end tabular-nums">
        <span className="text-body2 text-neutral1">{value}</span>
        <span className="text-body4 text-neutral2">{valueLabel}</span>
      </span>
    </button>
  )
}

/** The flip button: each flip turns the arrow once around, so it settles pointing down (pay → receive). */
export function FlipButton({ onClick, disabled = false, className }: { onClick?: () => void; disabled?: boolean; className?: string }) {
  const [turns, setTurns] = React.useState(0)
  const interactive = Boolean(onClick) && !disabled
  const noteId = React.useId()
  return (
    <>
    <button
      type="button"
      aria-label="Flip pay and receive"
      title={disabled ? 'A card payment can’t be received' : undefined}
      aria-disabled={disabled || undefined}
      aria-describedby={disabled ? noteId : undefined}
      tabIndex={onClick ? undefined : -1}
      onClick={() => {
        if (!interactive) return
        setTurns((t) => t + 1)
        onClick?.()
      }}
      className={cn(
        'flex size-uni-40 items-center justify-center rounded-uni-12 border border-surface3 bg-surface1 text-neutral2 shadow-uni-medium outline-none',
        interactive && 'cursor-pointer hover:bg-surface1Hovered hover:text-neutral1 active:scale-95',
        'transition-[background-color,color,scale] duration-100 ease-out focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-neutral1',
        disabled && 'text-neutral3',
        className,
      )}
    >
      <ArrowDown
        className="size-uni-20 transition-transform duration-300 motion-reduce:transition-none"
        style={{ transform: `rotate(${turns * 360}deg)`, transitionTimingFunction: EASE_MOVE }}
      />
    </button>
    {disabled && (
      <span id={noteId} className="sr-only">
        A card payment can’t be received
      </span>
    )}
    </>
  )
}

interface BuyCardsProps {
  /** Pay content (top) and receive content (bottom) */
  pay: AssetCardContent
  receive: AssetCardContent
  /** Which physical card holds the pay side; toggles on every flip */
  flipped: boolean
  onPayClick?: () => void
  onReceiveClick?: () => void
  onFlip?: () => void
  flipDisabled?: boolean
  /** Ids for the sheet to return focus to */
  payId?: string
  receiveId?: string
  /** Which card's sheet is open; undefined when closed */
  expanded?: 'pay' | 'receive'
}

export function BuyCards({
  pay,
  receive,
  flipped,
  onPayClick,
  onReceiveClick,
  onFlip,
  flipDisabled,
  payId,
  receiveId,
  expanded,
}: BuyCardsProps) {
  // Card A holds pay until a flip, then receive; it moves rather than re-rendering
  const cards = [
    { key: 'a', top: flipped ? CARD_STEP : 0, isPay: !flipped },
    { key: 'b', top: flipped ? 0 : CARD_STEP, isPay: flipped },
  ]
  return (
    <div data-slot="buy-cards" className="relative h-[138px] w-full">
      {cards.map((card) => (
        <AssetCard
          key={card.key}
          id={card.isPay ? payId : receiveId}
          content={card.isPay ? pay : receive}
          onClick={card.isPay ? onPayClick : onReceiveClick}
          aria-haspopup="dialog"
          aria-expanded={expanded === (card.isPay ? 'pay' : 'receive')}
          className="absolute inset-x-0 top-0 transition-[transform,background-color,scale] duration-[240ms] motion-reduce:transition-none"
          style={{ transform: `translateY(${card.top}px)`, transitionTimingFunction: EASE_MOVE }}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <FlipButton onClick={onFlip} disabled={flipDisabled} className="pointer-events-auto" />
      </div>
    </div>
  )
}
