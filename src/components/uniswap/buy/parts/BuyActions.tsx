import { cn } from '@/lib/utils'
import { MoreHorizontal } from '../../icons'
import type { BuyAction } from '../buy'

/*
 * Under the keypad, one slot holds two layers: quick amounts ($100, $500,
 * Max) while the amount is zero, and the main button once there is one. The
 * quick row lifts away as the button rises in (200ms, strong ease-out); the
 * hidden layer is inert. The button says why it's off when the amount is more
 * than the balance or the provider's limit.
 */

const EASE_OUT = 'ease-[cubic-bezier(0.23,1,0.32,1)]'

const pill =
  'flex h-[44px] cursor-pointer items-center justify-center rounded-uni-full text-buttonLabel2 outline-none select-none transition-[background-color,scale] duration-100 ease-out active:scale-[0.97] focus-visible:outline-1 focus-visible:outline-offset-2'

interface BuyActionsProps {
  action: BuyAction
  quickAmounts: readonly number[]
  onQuickAmount?: (usd: number) => void
  onMax?: () => void
  onReview?: () => void
  className?: string
}

export function BuyActions({ action, quickAmounts, onQuickAmount, onMax, onReview, className }: BuyActionsProps) {
  const quick = action.kind === 'quick'
  const layer = cn('absolute inset-0 transition-[opacity,translate] duration-200', EASE_OUT)
  return (
    <div data-slot="buy-actions" className={cn('relative h-[44px] w-full', className)}>
      <div inert={!quick} className={cn(layer, 'flex gap-uni-8', quick ? 'opacity-100' : '-translate-y-uni-12 opacity-0')}>
        {quickAmounts.map((usd) => (
          <button
            key={usd}
            type="button"
            tabIndex={onQuickAmount ? undefined : -1}
            onClick={() => onQuickAmount?.(usd)}
            className={cn(pill, 'flex-1 border border-surface3 bg-surface1 text-neutral1 shadow-uni-short hover:bg-surface1Hovered focus-visible:outline-neutral3')}
          >
            ${usd.toLocaleString('en-US')}
          </button>
        ))}
        <button
          type="button"
          tabIndex={onMax ? undefined : -1}
          onClick={onMax}
          className={cn(pill, 'flex-1 border border-surface3 bg-surface1 text-neutral1 shadow-uni-short hover:bg-surface1Hovered focus-visible:outline-neutral3')}
        >
          Max
        </button>
      </div>
      <div inert={quick} className={cn(layer, quick ? 'translate-y-uni-12 opacity-0' : 'opacity-100')}>
        {action.kind === 'insufficient' ? (
          <button type="button" disabled className={cn(pill, 'w-full cursor-default bg-surface3 text-neutral2 active:scale-100')}>
            {action.label}
          </button>
        ) : (
          <button
            type="button"
            tabIndex={onReview ? undefined : -1}
            onClick={onReview}
            className={cn(pill, 'w-full bg-accent1 text-white shadow-uni-short hover:bg-accent1Hovered focus-visible:outline-accent1Hovered')}
          >
            Review
          </button>
        )}
      </div>
    </div>
  )
}

export function BuyHeader({ title = 'Swap', onMore }: { title?: string; onMore?: () => void }) {
  return (
    <div data-slot="buy-header" className="flex h-uni-48 w-full items-center justify-between">
      <h2 className="text-buttonLabel1 text-neutral1">{title}</h2>
      <button
        type="button"
        aria-label="More"
        tabIndex={onMore ? undefined : -1}
        onClick={onMore}
        className="-mr-uni-6 flex size-uni-36 cursor-pointer items-center justify-center rounded-uni-full text-neutral1 outline-none transition-colors hover:bg-surface2 focus-visible:bg-surface2"
      >
        <MoreHorizontal className="size-uni-24" />
      </button>
    </div>
  )
}
