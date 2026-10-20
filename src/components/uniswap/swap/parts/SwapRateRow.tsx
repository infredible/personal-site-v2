'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatTokenAmount, formatUsd } from '../format'
import type { Token } from '../types'

/*
 * Exchange-rate line, ported from Uniswap's SwapRateRatio
 * (packages/uniswap/src/features/transactions/swap/components/SwapRateRatio.tsx).
 * Clicking flips the direction. The form footer uses the secondary styling and
 * starts inverted (`initialInverse`), i.e. "1 USDC = 0.000293 ETH ($1.00)":
 * rate in neutral2, fiat in neutral3, each a step darker on hover. Primary
 * styling (neutral1 / neutral2) is used in the expanded "Rate" row.
 */

interface SwapRateRowProps {
  inputToken: Token
  outputToken: Token
  /** Output tokens per 1 input token */
  rate: number
  /** true: "1 OUTPUT = x INPUT". Controlled when set. */
  inverted?: boolean
  /** Uncontrolled starting direction; Uniswap's form starts inverted. */
  defaultInverted?: boolean
  onInvertedChange?: (inverted: boolean) => void
  styling?: 'primary' | 'secondary'
  className?: string
}

export function getRateText({
  inputToken,
  outputToken,
  rate,
  inverted,
}: Pick<SwapRateRowProps, 'inputToken' | 'outputToken' | 'rate'> & { inverted: boolean }) {
  if (inverted) {
    return {
      rate: `1 ${outputToken.symbol} = ${formatTokenAmount(1 / rate)} ${inputToken.symbol}`,
      fiat: formatUsd(outputToken.priceUsd),
    }
  }
  return {
    rate: `1 ${inputToken.symbol} = ${formatTokenAmount(rate)} ${outputToken.symbol}`,
    fiat: formatUsd(rate * outputToken.priceUsd),
  }
}

function SwapRateRow({
  inputToken,
  outputToken,
  rate,
  inverted,
  defaultInverted = true,
  onInvertedChange,
  styling = 'secondary',
  className,
}: SwapRateRowProps) {
  const [localInverted, setLocalInverted] = React.useState(defaultInverted)
  const isInverted = inverted ?? localInverted
  const text = getRateText({ inputToken, outputToken, rate, inverted: isInverted })
  const primary = styling === 'primary'

  return (
    <button
      type="button"
      data-slot="swap-rate-row"
      aria-label={`${text.rate} (${text.fiat}). Switch rate direction`}
      onClick={(event) => {
        event.stopPropagation()
        const next = !isInverted
        setLocalInverted(next)
        onInvertedChange?.(next)
      }}
      className={cn(
        'group/rate flex min-w-0 max-w-full cursor-pointer items-center text-left text-body3 outline-none',
        'focus-visible:underline',
        className,
      )}
    >
      <span
        className={cn(
          'truncate transition-colors duration-100',
          primary ? 'text-neutral1 group-hover/rate:text-neutral1Hovered' : 'text-neutral2 group-hover/rate:text-neutral2Hovered',
        )}
      >
        {text.rate}
      </span>
      <span
        className={cn(
          'shrink-0 whitespace-pre transition-colors duration-100',
          primary ? 'text-neutral2 group-hover/rate:text-neutral1Hovered' : 'text-neutral3 group-hover/rate:text-neutral3Hovered',
        )}
      >
        {` (${text.fiat})`}
      </span>
    </button>
  )
}

export { SwapRateRow }
export type { SwapRateRowProps }
