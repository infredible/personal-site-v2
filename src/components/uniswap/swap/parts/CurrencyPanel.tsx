'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { UniButton } from '../../UniButton'
import { UniTooltip } from '../../UniTooltip'
import { formatTokenAmount, formatUsd } from '../format'
import type { SwapField, Token } from '../types'
import { fitInputFontSize, sanitizeAmountInput } from './amount'
import { TokenLogo } from './TokenLogo'
import { TokenSelectButton } from './TokenSelectButton'

/*
 * Sell / Buy panel. Ported from Uniswap's CurrencyInputPanel family
 * (packages/uniswap/src/components/CurrencyInputPanel/*) as wrapped by
 * SwapFormCurrencyInputPanel / SwapFormCurrencyOutputPanel and
 * useCurrencyInputFocusedStyle:
 *
 * - Frame: rounded20, 1px border, overflow hidden. Focused → surface1 + surface3
 *   border (hover: surface3Hovered); unfocused → surface2, transparent border
 *   (hover: surface2Hovered). The Sell panel adds 4px bottom padding once a token is set.
 * - Content: 16px padding. Header label is neutral2 subheading2 (16px).
 * - Input row: 8px vertical padding, 60px min height; amount is 36px / 1.2
 *   line height, book weight, shrinking to 24px as it gets long; placeholder neutral3.
 * - Footer row: fiat value (body3 neutral2) left, balance (body3 neutral2, critical
 *   when insufficient) right. Hidden but laid out when no token is selected.
 * - Desktop hover reveals 25% / 50% / 75% / Max presets on the Sell header, and
 *   quick-pick token chips on an empty Buy header, both with a 40ms stagger.
 * - While the derived side refetches, its amount pulses 1 → 0.4 opacity over 800ms.
 */

type Percent = 25 | 50 | 75 | 100

const PRESETS: readonly Percent[] = [25, 50, 75, 100]

const PULSE_CSS = `@keyframes uni-refetch-pulse{0%,100%{opacity:1}50%{opacity:.4}}`

interface CurrencyPanelProps {
  field: SwapField
  /** "Sell" / "Buy" */
  label: string
  token?: Token
  /** Controlled decimal string */
  amount: string
  usdValue?: number
  /** Whole-token units; omit when disconnected (hides the balance) */
  balance?: number
  /** Distinct focused frame. Uncontrolled (tracks the input's own focus) when omitted. */
  focused?: boolean
  /** The derived side while a quote loads: the amount pulses */
  loading?: boolean
  /** Insufficient balance: amount and balance turn statusCritical */
  error?: boolean
  /** Renders a static input (for canvas displays). Defaults to true when there's no onAmountChange. */
  readOnly?: boolean
  /** Forces the hover appearance (frame color, revealed presets) for static state displays */
  hovered?: boolean
  /** Where the Max control lives: Uniswap web's hover presets in the header, or a Max button by the balance */
  maxPlacement?: 'header' | 'balance'
  onAmountChange?: (amount: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onTokenClick?: () => void
  onMax?: () => void
  /** 25 / 50 / 75 presets, as a fraction of balance. When omitted only Max is offered. */
  onPercent?: (fraction: number) => void
  /** Empty Buy panel: tokens offered as quick picks in the header on hover */
  quickSelectTokens?: Token[]
  onQuickSelect?: (token: Token) => void
  inputRef?: React.Ref<HTMLInputElement>
  className?: string
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as React.RefObject<T>).current = value
}

/** Hover-reveal transition from Uniswap's hoverStyles.ts: translateY(-8) scale(.95) → identity, staggered 40ms in, no delay out. */
function revealClasses(forceVisible: boolean) {
  return cn(
    'transition-[opacity,transform,translate,scale,rotate] duration-200 ease-out',
    forceVisible
      ? 'opacity-100 translate-y-0 scale-100 [transition-delay:var(--reveal-delay)]'
      : [
          '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:-translate-y-uni-8 [@media(hover:hover)]:scale-95',
          'group-hover/panel:opacity-100 group-hover/panel:translate-y-0 group-hover/panel:scale-100',
          'group-hover/panel:[transition-delay:var(--reveal-delay)]',
        ],
  )
}

function CurrencyPanel({
  field,
  label,
  token,
  amount,
  usdValue,
  balance,
  focused,
  loading = false,
  error = false,
  readOnly,
  hovered = false,
  maxPlacement = 'header',
  onAmountChange,
  onFocus,
  onBlur,
  onTokenClick,
  onMax,
  onPercent,
  quickSelectTokens,
  onQuickSelect,
  inputRef,
  className,
}: CurrencyPanelProps) {
  const localInputRef = React.useRef<HTMLInputElement | null>(null)
  const amountAreaRef = React.useRef<HTMLDivElement | null>(null)
  const [selfFocused, setSelfFocused] = React.useState(false)
  const [availableWidth, setAvailableWidth] = React.useState(0)

  const isInput = field === 'input'
  const isFocused = focused ?? selfFocused
  const isReadOnly = readOnly ?? !onAmountChange
  const hasAmount = amount !== '' && Number(amount) > 0
  const hasBalance = balance !== undefined && balance > 0
  const isMaxSet = hasBalance && Number(amount) === balance

  React.useLayoutEffect(() => {
    const node = amountAreaRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const fontSize = fitInputFontSize(amount || '0', availableWidth)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onAmountChange?.(sanitizeAmountInput(event.target.value, token?.decimals ?? 18))
  }

  // Uniswap's whole panel is a touch target: it focuses the input, or opens the
  // selector when no token is chosen yet.
  const handlePanelClick = () => {
    if (!token) onTokenClick?.()
    else if (!isReadOnly) localInputRef.current?.focus()
  }

  const showPresets = isInput && Boolean(token) && hasBalance && maxPlacement === 'header' && Boolean(onMax || onPercent)
  const presets = onPercent ? PRESETS : PRESETS.filter((p) => p === 100)
  const showQuickSelect = !isInput && !token && Boolean(quickSelectTokens?.length)
  const showBalance = Boolean(token) && balance !== undefined && !(!isInput && balance === 0)
  const balanceClickable = showBalance && hasBalance && Boolean(onMax)

  const fiatText = !hasAmount ? '$0' : usdValue !== undefined ? formatUsd(usdValue) : '-'
  const amountColor = error ? 'text-statusCritical' : 'text-neutral1'

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="currency-panel"
      data-field={field}
      data-focused={isFocused || undefined}
      onClick={handlePanelClick}
      className={cn(
        'group/panel relative overflow-hidden rounded-uni-20 border',
        'transition-[opacity,transform,translate,scale,rotate] duration-[80ms] ease-in-out',
        isFocused
          ? cn('border-surface3 bg-surface1 hover:border-surface3Hovered', hovered && 'border-surface3Hovered')
          : cn('border-transparent bg-surface2 hover:bg-surface2Hovered', hovered && 'bg-surface2Hovered'),
        (token || onTokenClick) && 'cursor-text',
        !token && onTokenClick && 'cursor-pointer',
        isInput && token && 'pb-uni-4',
        className,
      )}
    >
      {loading && (
        <style href="uni-refetch-pulse" precedence="default">
          {PULSE_CSS}
        </style>
      )}
      <div className="flex flex-col p-uni-16">
        {/* Header */}
        <div className="relative flex items-center justify-between">
          <span className="text-subheading2 text-neutral2 select-none">{label}</span>

          {showPresets && (
            <div className="absolute right-0 -top-uni-2 flex gap-uni-4">
              {presets.map((percent, index) => {
                const isMax = percent === 100
                // Rightmost first, as Uniswap staggers right-to-left
                const delay = (presets.length - index - 1) * 40
                return (
                  <div
                    key={percent}
                    className={revealClasses(hovered)}
                    style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
                  >
                    <UniButton
                      size="xxsmall"
                      emphasis="secondary"
                      disabled={isMax && isMaxSet}
                      className="border-surface3 py-uni-4 hover:scale-[1.02] active:scale-[0.99] disabled:border-transparent"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (isMax) onMax?.()
                        else onPercent?.(percent / 100)
                      }}
                    >
                      {isMax ? 'Max' : `${percent}%`}
                    </UniButton>
                  </div>
                )
              })}
            </div>
          )}

          {showQuickSelect && (
            <div className="absolute right-0 -top-uni-6 flex justify-end gap-uni-4">
              {quickSelectTokens!.slice(0, 5).map((option, index, list) => (
                <div
                  key={option.symbol}
                  className={revealClasses(hovered)}
                  style={{ '--reveal-delay': `${(list.length - index - 1) * 40}ms` } as React.CSSProperties}
                >
                  <UniTooltip content={option.symbol}>
                    <button
                      type="button"
                      aria-label={`Select ${option.symbol}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onQuickSelect?.(option)
                      }}
                      className={cn(
                        'flex cursor-pointer rounded-uni-full bg-surface3 p-uni-4 outline-none',
                        'transition-transform duration-[80ms] ease-in-out hover:scale-110 hover:bg-surface3Hovered',
                        'focus-visible:outline-1 focus-visible:outline-neutral3Hovered',
                      )}
                    >
                      <TokenLogo token={option} size={20} />
                    </button>
                  </UniTooltip>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Amount + token */}
        <div className="flex min-h-[60px] items-center justify-between py-uni-8">
          <div
            ref={amountAreaRef}
            className="mr-uni-8 flex min-h-uni-24 min-w-0 flex-1 items-center"
            style={loading && hasAmount ? { animation: 'uni-refetch-pulse 800ms ease-in-out infinite' } : undefined}
          >
            {token ? (
              <input
                ref={(node) => {
                  localInputRef.current = node
                  setRef(inputRef, node)
                }}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="0"
                aria-label={`${label} amount`}
                aria-invalid={error || undefined}
                readOnly={isReadOnly}
                tabIndex={isReadOnly ? -1 : undefined}
                value={amount}
                onChange={handleChange}
                onFocus={() => {
                  setSelfFocused(true)
                  onFocus?.()
                }}
                onBlur={() => {
                  setSelfFocused(false)
                  onBlur?.()
                }}
                className={cn(
                  'w-full min-w-0 border-0 bg-transparent p-0 outline-none',
                  'font-uni tracking-[-0.01em] [font-weight:485] placeholder:text-neutral3',
                  'transition-[font-size] duration-100',
                  amountColor,
                  isReadOnly ? 'cursor-default' : 'cursor-text',
                )}
                style={{ fontSize, lineHeight: `${fontSize * 1.2}px`, height: fontSize * 1.2 }}
              />
            ) : (
              <span
                aria-hidden
                className="font-uni tracking-[-0.01em] [font-weight:485] text-neutral3 select-none"
                style={{ fontSize, lineHeight: `${fontSize}px` }}
              >
                0
              </span>
            )}
          </div>
          <TokenSelectButton token={token} onClick={onTokenClick} />
        </div>

        {/* Fiat value + balance */}
        <div
          className={cn('flex min-h-[18px] items-center', !token && 'pointer-events-none opacity-0')}
          aria-hidden={!token || undefined}
        >
          <span
            className="min-w-0 flex-1 truncate text-body3 text-neutral2 select-none"
            style={loading && hasAmount ? { animation: 'uni-refetch-pulse 800ms ease-in-out infinite' } : undefined}
          >
            {fiatText}
          </span>
          {showBalance && token && (
            <div className="ml-auto flex items-center gap-uni-4">
              {balanceClickable ? (
                <button
                  type="button"
                  aria-label={`Balance ${formatTokenAmount(balance!)} ${token.symbol}, use max`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onMax?.()
                  }}
                  className={cn(
                    'cursor-pointer whitespace-nowrap text-body3 outline-none transition-colors duration-100',
                    'focus-visible:underline',
                    error ? 'text-statusCritical hover:text-statusCriticalHovered' : 'text-neutral2 hover:text-neutral2Hovered',
                  )}
                >
                  {formatTokenAmount(balance!)} {token.symbol}
                </button>
              ) : (
                <span className={cn('whitespace-nowrap text-body3', error ? 'text-statusCritical' : 'text-neutral2')}>
                  {formatTokenAmount(balance!)} {token.symbol}
                </span>
              )}
              {maxPlacement === 'balance' && isInput && hasBalance && onMax && (
                <UniButton
                  size="xxsmall"
                  variant="branded"
                  emphasis="secondary"
                  disabled={isMaxSet}
                  className="border-0 py-uni-4 hover:scale-[1.02] active:scale-[0.99]"
                  onClick={(event) => {
                    event.stopPropagation()
                    onMax()
                  }}
                >
                  Max
                </UniButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { CurrencyPanel }
export type { CurrencyPanelProps }
