'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RangeInputMode } from '../types'

/*
 * One bound of the range (Uniswap's D3RangeAmountInput): a surface2 cell with
 * a body3 label ("Min price"), a borderless heading3 input, and a body3
 * sub-label. On the right, two round surface3 steppers (Plus above Minus);
 * hidden in full range, where the input is disabled and reads 0 or ∞.
 *
 * - Type is heading3 (24px) shrinking to 16px as the text outgrows the cell,
 *   like the swap amount fields do. In percent mode a "%" follows the text.
 * - The sub-label is the other way to read the bound: its % from the current
 *   price (click: switch the inputs to percent), or in percent mode its price
 *   (click: switch back). In full range it's a static "<QUOTE> = 1 <BASE>".
 * - Invalid (min >= max) turns the text critical. Enter commits, like blur.
 */

const MAX_FONT = 24
const MIN_FONT = 16
const CHAR_WIDTH_AT_MAX = 13

function fitFontSize(chars: number, width: number) {
  if (width <= 0 || chars <= 0) return MAX_FONT
  const needed = chars * CHAR_WIDTH_AT_MAX
  if (needed <= width) return MAX_FONT
  return Math.max(MIN_FONT, Math.floor((width / needed) * MAX_FONT))
}

interface RangeAmountInputProps {
  /** "Min price" / "Max price" */
  label: string
  /** Text of the input: a draft, or the formatted price / percent */
  value: string
  mode: RangeInputMode
  /** Full range: input disabled, steppers hidden */
  disabled?: boolean
  invalid?: boolean
  /** Under the input; `toggles` makes it the price / percent switch */
  subLabel: { text: string; toggles: boolean }
  /** For aria-labels */
  stepLabel: string
  onValueChange?: (text: string) => void
  onCommit?: () => void
  onStep?: (direction: 1 | -1) => void
  onToggleMode?: () => void
  className?: string
}

function RangeAmountInput({
  label,
  value,
  mode,
  disabled,
  invalid,
  subLabel,
  stepLabel,
  onValueChange,
  onCommit,
  onStep,
  onToggleMode,
  className,
}: RangeAmountInputProps) {
  const areaRef = React.useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = React.useState(0)

  React.useLayoutEffect(() => {
    const node = areaRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const percent = mode === 'percent' && !disabled
  const fontSize = fitFontSize(Math.max(value.length, 1) + (percent ? 1 : 0), width)
  const textStyle = { fontSize, lineHeight: `${Math.round(fontSize * 1.2)}px`, height: Math.round(fontSize * 1.2) }
  const color = invalid ? 'text-statusCritical' : 'text-neutral1'

  return (
    <div
      data-slot="range-amount-input"
      data-invalid={invalid || undefined}
      className={cn('flex min-w-0 flex-1 justify-between gap-uni-8 overflow-hidden bg-surface2 p-uni-16', className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-uni-4">
        <span className="text-body3 text-neutral2">{label}</span>
        <div ref={areaRef} className="flex min-w-0 items-center">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="0"
            aria-label={label}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
            onBlur={onCommit}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            className={cn(
              'min-w-0 border-0 bg-transparent p-0 outline-none placeholder:text-neutral3',
              'font-uni tracking-[-0.005em] [font-weight:485]',
              'disabled:cursor-default disabled:opacity-100 disabled:[-webkit-text-fill-color:currentColor]',
              color,
              percent ? 'max-w-full' : 'w-full',
            )}
            style={{ ...textStyle, ...(percent ? { width: `${Math.max(value.length, 1) + 0.5}ch` } : null) }}
          />
          {percent && (
            <span className={cn('font-uni tracking-[-0.005em] [font-weight:485] select-none', color)} style={textStyle}>
              %
            </span>
          )}
        </div>
        {subLabel.toggles ? (
          <button
            type="button"
            onClick={onToggleMode}
            className="w-fit max-w-full cursor-pointer truncate text-left text-body3 text-neutral2 outline-none hover:text-neutral2Hovered focus-visible:underline"
          >
            {subLabel.text}
          </button>
        ) : (
          <span className="truncate text-body3 text-neutral2">{subLabel.text}</span>
        )}
      </div>

      {!disabled && (
        <div className="flex shrink-0 flex-col justify-center gap-[10px]">
          {(
            [
              { direction: 1, Icon: Plus, name: 'Increase' },
              { direction: -1, Icon: Minus, name: 'Decrease' },
            ] as const
          ).map(({ direction, Icon, name }) => (
            <button
              key={direction}
              type="button"
              aria-label={`${name} ${stepLabel}`}
              onClick={() => onStep?.(direction)}
              className={cn(
                'flex size-uni-32 items-center justify-center rounded-uni-full bg-surface3 text-neutral2 outline-none',
                'transition-[background-color,transform,translate,scale,rotate] duration-100 ease-out',
                'hover:bg-surface3Hovered active:scale-[0.96] focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-neutral3Hovered',
                onStep ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <Icon aria-hidden className="size-uni-16" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { RangeAmountInput }
export type { RangeAmountInputProps }
