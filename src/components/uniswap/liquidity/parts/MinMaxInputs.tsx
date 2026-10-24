import { cn } from '@/lib/utils'
import type { Token } from '../../swap/types'
import { rangeEndText } from '../inputText'
import { formatRangePrice, formatSignedPercent, percentFromCurrent, rangeEndPrice, type VisualRange } from '../ticks'
import type { RangeInputMode } from '../types'
import { RangeAmountInput } from './RangeAmountInput'

/*
 * The Min price / Max price pair (D3LiquidityMinMaxInput): two square surface2
 * cells 4px apart that share the card's rounded bottom. A row on wide
 * containers, a column on narrow ones (the 375px mobile frame is a container,
 * not a viewport, so this is a container query). Parts show formatted text
 * from the range; the draft (text being typed) wins while it exists.
 */

interface MinMaxInputsProps {
  fullRange: boolean
  mode: RangeInputMode
  /** Committed range, visual ticks */
  range: VisualRange
  tickSpacing: number
  /** Visual tick of the current price */
  currentTick: number
  base: Token
  quote: Token
  /** Text being typed per end; null shows the formatted price */
  drafts: { lower: string | null; upper: string | null }
  /** min >= max: both texts turn critical */
  invalid?: boolean
  onDraftChange?: (end: 'lower' | 'upper', text: string) => void
  onCommit?: (end: 'lower' | 'upper') => void
  onStep?: (end: 'lower' | 'upper', direction: 1 | -1) => void
  onToggleMode?: () => void
  className?: string
}

const ENDS = [
  { end: 'lower', label: 'Min price', stepLabel: 'min price' },
  { end: 'upper', label: 'Max price', stepLabel: 'max price' },
] as const

function MinMaxInputs({
  fullRange,
  mode,
  range,
  tickSpacing,
  currentTick,
  base,
  quote,
  drafts,
  invalid,
  onDraftChange,
  onCommit,
  onStep,
  onToggleMode,
  className,
}: MinMaxInputsProps) {
  const unit = `${quote.symbol} = 1 ${base.symbol}`

  return (
    <div
      data-slot="min-max-inputs"
      className={cn(
        'flex gap-uni-4 overflow-hidden rounded-b-uni-20 @max-[440px]/range:flex-col',
        className,
      )}
    >
      {ENDS.map(({ end, label, stepLabel }) => {
        const tick = range[end]
        const value =
          drafts[end] ?? rangeEndText({ tick, end, mode, fullRange, tickSpacing, currentTick })
        const subLabel = fullRange
          ? { text: unit, toggles: false }
          : mode === 'percent'
            ? { text: `${formatRangePrice(rangeEndPrice(tick, end, tickSpacing, false))} ${unit}`, toggles: true }
            : { text: formatSignedPercent(percentFromCurrent(tick, currentTick)), toggles: true }
        return (
          <RangeAmountInput
            key={end}
            label={label}
            stepLabel={stepLabel}
            value={value}
            mode={mode}
            disabled={fullRange}
            invalid={invalid}
            subLabel={subLabel}
            onValueChange={(text) => onDraftChange?.(end, text)}
            onCommit={() => onCommit?.(end)}
            onStep={onStep && ((direction) => onStep(end, direction))}
            onToggleMode={onToggleMode}
          />
        )
      })}
    </div>
  )
}

export { MinMaxInputs }
export type { MinMaxInputsProps }
