'use client'

import * as React from 'react'
import { AlertTriangleFilled, ArrowsLeftRight } from '../../icons'
import { cn } from '@/lib/utils'
import { UniTooltip } from '../../UniTooltip'
import { formatPercent, formatTokenAmount } from '../format'
import { LIMIT_PRESETS, presetLabel, type LimitPrice } from '../limit'
import { fitInputFontSize, sanitizeAmountInput } from './amount'

/*
 * The limit price, as one panel under Buy. Uniswap's LimitPriceInputPanel
 * stacks a "When 1 [ETH ▾] is worth" header with its own token selector, the
 * price, an invert button, and signed preset chips. This keeps the parts that
 * do work and drops the rest:
 *
 *   Limit price                         5% above market
 *   3,583.21                         [⇄ USDC per ETH]
 *   (Market) (+1%) (+5%) (+10%)
 *
 * - Same frame as CurrencyPanel (rounded20; surface2, or surface1 + surface3
 *   border when focused) and the same 36px → 24px amount type, so it reads as a
 *   third field of the form, not a widget bolted on.
 * - No token selector: the unit comes from the pair. The unit pill flips it.
 * - The header says where the price sits against market in words; worse than
 *   market turns it critical (the button explains why it's disabled).
 * - Presets show which one the price came from; typing clears the selection.
 */

interface LimitPricePanelProps {
  /** From getLimitPrice. Without one (no pair yet) the panel shows a disabled placeholder. */
  price?: LimitPrice
  /** Controlled text of the input */
  value: string
  /** Selected preset (fraction better than market), or null for a typed price */
  preset: number | null
  /** Distinct focused frame. Uncontrolled (tracks the input's own focus) when omitted. */
  focused?: boolean
  readOnly?: boolean
  onValueChange?: (value: string) => void
  onPresetSelect?: (preset: number) => void
  onInvert?: () => void
  onFocus?: () => void
  className?: string
}

function DeltaLabel({ price }: { price: LimitPrice }) {
  const marketText = `Market: 1 ${price.base.symbol} = ${formatTokenAmount(price.market)} ${price.quote.symbol}`
  if (!price.status) return null
  if (price.status === 'market') {
    return (
      <UniTooltip content={marketText}>
        <span className="cursor-default text-body3 text-neutral3 select-none">Market price</span>
      </UniTooltip>
    )
  }
  const direction = price.delta > 0 ? 'above' : 'below'
  const worse = price.status === 'below-market'
  const tooltip = worse
    ? `This would sell for less than a swap gets right now. ${marketText}`
    : price.status === 'far'
      ? `Far from market, so this may never fill. ${marketText}`
      : marketText
  return (
    <UniTooltip content={tooltip}>
      <span
        data-status={price.status}
        className={cn(
          'flex cursor-default items-center gap-uni-4 text-body3 select-none',
          worse ? 'text-statusCritical' : price.status === 'far' ? 'text-statusWarning' : 'text-neutral2',
        )}
      >
        {(worse || price.status === 'far') && <AlertTriangleFilled className="size-uni-16" />}
        {formatPercent(Math.abs(price.delta))} {direction} market
      </span>
    </UniTooltip>
  )
}

function LimitPricePanel({
  price,
  value,
  preset,
  focused,
  readOnly,
  onValueChange,
  onPresetSelect,
  onInvert,
  onFocus,
  className,
}: LimitPricePanelProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const amountAreaRef = React.useRef<HTMLDivElement | null>(null)
  const [selfFocused, setSelfFocused] = React.useState(false)
  const [availableWidth, setAvailableWidth] = React.useState(0)

  const isFocused = focused ?? selfFocused
  const isReadOnly = readOnly ?? !onValueChange
  const disabled = !price

  React.useLayoutEffect(() => {
    const node = amountAreaRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const fontSize = fitInputFontSize(value || '0', availableWidth)
  const worse = price?.status === 'below-market'

  return (
    <div
      role="group"
      aria-label="Limit price"
      data-slot="limit-price-panel"
      data-focused={isFocused || undefined}
      onClick={() => !isReadOnly && !disabled && inputRef.current?.focus()}
      className={cn(
        'group/panel relative overflow-hidden rounded-uni-20 border',
        'transition-[background-color,border-color] duration-[80ms] ease-out',
        isFocused
          ? 'border-surface3 bg-surface1 hover:border-surface3Hovered'
          : 'border-transparent bg-surface2 hover:bg-surface2Hovered',
        !isReadOnly && !disabled && 'cursor-text',
        className,
      )}
    >
      <div className="flex flex-col p-uni-16">
        {/* Header */}
        <div className="flex h-uni-20 items-center justify-between gap-uni-8">
          <span className="text-subheading2 text-neutral2 select-none">Limit price</span>
          {price && <DeltaLabel price={price} />}
        </div>

        {/* Price + unit */}
        <div className="flex min-h-[60px] items-center justify-between py-uni-8">
          <div ref={amountAreaRef} className="relative mr-uni-8 flex min-h-uni-24 min-w-0 flex-1 items-center">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="0"
              aria-label={price ? `Limit price, ${price.quote.symbol} per ${price.base.symbol}` : 'Limit price'}
              aria-invalid={worse || undefined}
              readOnly={isReadOnly}
              disabled={disabled}
              tabIndex={isReadOnly ? -1 : undefined}
              value={value}
              onChange={(event) => onValueChange?.(sanitizeAmountInput(event.target.value, price?.quote.decimals ?? 18))}
              onFocus={() => {
                setSelfFocused(true)
                onFocus?.()
              }}
              onBlur={() => setSelfFocused(false)}
              className={cn(
                'w-full min-w-0 border-0 bg-transparent p-0 outline-none disabled:cursor-default',
                'font-uni tracking-[-0.01em] [font-weight:485] placeholder:text-neutral3',
                worse ? 'text-statusCritical' : 'text-neutral1',
                isReadOnly ? 'cursor-default' : 'cursor-text',
              )}
              style={{ fontSize, lineHeight: `${fontSize * 1.2}px`, height: fontSize * 1.2 }}
            />
          </div>
          {price && (
            <UniTooltip content={`Show in ${price.base.symbol} per ${price.quote.symbol}`}>
              <button
                type="button"
                data-slot="limit-price-unit"
                aria-label={`${price.quote.symbol} per ${price.base.symbol}, flip unit`}
                tabIndex={onInvert ? undefined : -1}
                onClick={(event) => {
                  event.stopPropagation()
                  onInvert?.()
                }}
                className={cn(
                  'group/unit inline-flex h-uni-36 shrink-0 items-center gap-uni-6 rounded-uni-full border border-surface3Solid bg-surface1 px-uni-12',
                  'shadow-[0_0_10px_rgba(19,19,19,0.04)] outline-none select-none',
                  'transition-[transform,translate,scale,rotate,background-color] duration-100 ease-[cubic-bezier(0.17,0.67,0.45,1)]',
                  'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral3Hovered',
                  onInvert ? 'cursor-pointer hover:bg-surface1Hovered active:scale-[0.98]' : 'cursor-default',
                )}
              >
                <ArrowsLeftRight
                  aria-hidden
                  className="size-uni-16 text-neutral2 transition-transform duration-200 ease-out group-active/unit:rotate-180"
                />
                <span className="text-buttonLabel3 whitespace-nowrap text-neutral1">
                  {price.quote.symbol} <span className="text-neutral2">per</span> {price.base.symbol}
                </span>
              </button>
            </UniTooltip>
          )}
        </div>

        {/* Presets */}
        <div role="group" aria-label="Price presets" className="flex flex-wrap items-center gap-uni-4">
          {LIMIT_PRESETS.map((option) => {
            const selected = preset === option && !disabled
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                tabIndex={onPresetSelect ? undefined : -1}
                onClick={(event) => {
                  event.stopPropagation()
                  onPresetSelect?.(option)
                }}
                className={cn(
                  'flex h-uni-28 items-center rounded-uni-full border px-uni-12 text-buttonLabel4 outline-none select-none',
                  'transition-[background-color,border-color,color,transform,translate,scale,rotate] duration-100 ease-out',
                  'focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
                  'disabled:cursor-default disabled:text-neutral3',
                  selected
                    ? 'border-transparent bg-surface3 text-neutral1'
                    : 'border-surface3 text-neutral2 enabled:hover:bg-surface3 enabled:hover:text-neutral1',
                  onPresetSelect && !disabled ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default',
                )}
              >
                {presetLabel(option, price?.inverted ?? false)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { LimitPricePanel }
export type { LimitPricePanelProps }
