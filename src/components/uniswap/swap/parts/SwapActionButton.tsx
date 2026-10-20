import { cn } from '@/lib/utils'
import { UniButton } from '../../UniButton'
import type { SwapAction } from '../getSwapAction'

/*
 * The form's main CTA (Uniswap's SwapFormButton): a large, full-width Button
 * with buttonLabel1 text, styled from getSwapAction's output.
 */

interface SwapActionButtonProps {
  action: SwapAction
  onClick?: (action: SwapAction) => void
  className?: string
}

function SwapActionButton({ action, onClick, className }: SwapActionButtonProps) {
  return (
    <UniButton
      data-slot="swap-action-button"
      data-action={action.kind}
      size="large"
      fill
      variant={action.variant}
      emphasis={action.emphasis}
      disabled={action.disabled}
      loading={action.loading}
      onClick={onClick ? () => onClick(action) : undefined}
      className={cn(!onClick && !action.disabled && 'cursor-default', className)}
    >
      {action.label}
    </UniButton>
  )
}

export { SwapActionButton }
export type { SwapActionButtonProps }
