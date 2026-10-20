'use client'

import * as React from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UniTooltip } from '../../UniTooltip'
import { DEFAULT_SLIPPAGE } from '../tokens'
import type { SlippageSettings } from '../types'
import { InfoCircleFilled, WarningMessage } from './shared'

/*
 * Swap settings content, ported from Uniswap's web settings popover
 * (packages/uniswap/src/features/transactions/components/settings:
 * TransactionSettingsModal/TransactionSettingsModalInterface.tsx (320px popover),
 * TransactionSettingsModalContent/TransactionSettingsRow.tsx (row layout),
 * settingsConfigurations/slippage/SlippageControl/SlippageControl.web.tsx,
 * slippage/useSlippageSettings.ts + SlippageWarning.tsx (validation, warnings),
 * settingsConfigurations/deadline/DeadlineControl.web.tsx; and
 * swap/components/SwapFormSettings/settingsConfigurations/TradeRoutingPreference).
 *
 * Presentational and controlled: renders inline, so place it in <PopoverSurface>
 * (desktop, under the gear) or <ModalSurface title="Swap settings"> (mobile sheet).
 */

/** Percent thresholds, from uniswap/src/constants/transactions.ts */
const MAX_CUSTOM_SLIPPAGE = 100
const SLIPPAGE_CRITICAL = 20
/** Below this, a swap is likely to revert on normal price movement. Not a Uniswap constant (see report). */
const SLIPPAGE_LOW = 0.05
const DEFAULT_DEADLINE = 30
const WARNING_DEADLINE = 60
const MAX_DEADLINE = 3 * 24 * 60

export interface SwapSettingsPanelProps {
  slippage: SlippageSettings
  onSlippageChange: (slippage: SlippageSettings) => void
  deadlineMinutes: number
  onDeadlineChange: (minutes: number) => void
  /** Auto slippage for the current trade, as a fraction. Defaults to 0.5%. */
  autoSlippage?: number
  /** Trade options summary on the right of its row ("Default" or "Custom"). */
  tradeOptionsLabel?: string
  /** Makes the Trade options row a button (Uniswap opens a sub-screen). */
  onTradeOptionsClick?: () => void
  className?: string
}

/** Fraction -> percent string without float noise: 0.005 -> "0.5" */
function toPercentString(fraction: number): string {
  return String(Number((fraction * 100).toFixed(4)))
}

type Warning = { tone: 'warning' | 'critical'; message: string; tooltip?: string }

function slippageWarning(pct: number, autoPct: number): Warning | undefined {
  if (pct === 0) return { tone: 'critical', message: 'Enter a value larger than 0' }
  if (pct >= SLIPPAGE_CRITICAL)
    return {
      tone: 'critical',
      message: 'Very high slippage',
      tooltip: 'This may result in an unfavorable trade. Try lowering your slippage setting.',
    }
  if (pct > autoPct)
    return {
      tone: 'warning',
      message: 'High slippage',
      tooltip: 'This may result in an unfavorable trade. Try lowering your slippage setting.',
    }
  if (pct < SLIPPAGE_LOW)
    return {
      tone: 'warning',
      message: 'Low slippage',
      tooltip: 'Your transaction may revert if the price moves before it is confirmed.',
    }
  return undefined
}

export function SwapSettingsPanel({
  slippage,
  onSlippageChange,
  deadlineMinutes,
  onDeadlineChange,
  autoSlippage = DEFAULT_SLIPPAGE.value,
  tradeOptionsLabel = 'Default',
  onTradeOptionsClick,
  className,
}: SwapSettingsPanelProps) {
  return (
    <div className={cn('flex flex-col gap-uni-4 px-uni-4 py-uni-12', className)}>
      <SlippageRow slippage={slippage} onSlippageChange={onSlippageChange} autoSlippage={autoSlippage} />
      <DeadlineRow minutes={deadlineMinutes} onChange={onDeadlineChange} />
      <SettingRow
        title="Trade options"
        onControlClick={onTradeOptionsClick}
        control={
          <>
            <span className="text-subheading2 text-neutral2 transition-colors group-hover/control:text-neutral2Hovered">
              {tradeOptionsLabel}
            </span>
            <ChevronRightIcon aria-hidden className="size-uni-24 text-neutral3" />
          </>
        }
      />
    </div>
  )
}

/** TransactionSettingRow: title (+ info tooltip) and warning on the left, control on the right, min 48px tall. */
function SettingRow({
  title,
  tooltip,
  warning,
  control,
  onControlClick,
}: {
  title: string
  tooltip?: string
  warning?: Warning
  control: React.ReactNode
  onControlClick?: () => void
}) {
  const Control = onControlClick ? 'button' : 'div'
  return (
    <div className="flex items-center justify-between gap-x-uni-16">
      <div className="flex min-h-uni-48 min-w-0 flex-1 flex-col justify-center gap-uni-2">
        <div className="flex min-w-0 items-center gap-uni-4">
          <span className="text-subheading2 text-neutral1">{title}</span>
          {tooltip && (
            <UniTooltip content={tooltip}>
              <button
                type="button"
                aria-label={`About ${title.toLowerCase()}`}
                className="flex cursor-help rounded-uni-full text-neutral3 outline-none hover:text-neutral3Hovered focus-visible:text-neutral3Hovered"
              >
                <InfoCircleFilled />
              </button>
            </UniTooltip>
          )}
        </div>
        {warning &&
          (warning.tooltip ? (
            <UniTooltip content={warning.tooltip}>
              <span className="w-fit cursor-default" tabIndex={0}>
                <WarningMessage tone={warning.tone}>{warning.message}</WarningMessage>
              </span>
            </UniTooltip>
          ) : (
            <WarningMessage tone={warning.tone}>{warning.message}</WarningMessage>
          ))}
      </div>
      <Control
        {...(onControlClick ? { type: 'button' as const, onClick: onControlClick } : {})}
        className={cn(
          'group/control flex shrink items-center justify-end gap-uni-4',
          onControlClick && 'cursor-pointer rounded-uni-8 outline-none focus-visible:ring-1 focus-visible:ring-neutral3',
        )}
      >
        {control}
      </Control>
    </div>
  )
}

/** Border color shared by the slippage and deadline fields */
function fieldBorder({ editing, tone }: { editing: boolean; tone?: Warning['tone'] }) {
  if (tone === 'critical') return 'border-statusCritical hover:border-statusCriticalHovered'
  if (tone === 'warning') return 'border-statusWarning hover:border-statusWarningHovered'
  return editing ? 'border-accent1' : 'border-surface3 hover:border-surface3Hovered'
}

const fieldClassName =
  'flex items-center gap-uni-8 rounded-uni-16 border p-uni-4 transition-colors duration-100'

const inputClassName =
  'min-w-0 bg-transparent p-0 text-right text-subheading2 outline-none placeholder:text-neutral3'

function SlippageRow({
  slippage,
  onSlippageChange,
  autoSlippage,
}: {
  slippage: SlippageSettings
  onSlippageChange: (slippage: SlippageSettings) => void
  autoSlippage: number
}) {
  const autoPct = autoSlippage * 100
  // While focused the field holds the raw text; otherwise it mirrors the controlled value
  const [draft, setDraft] = React.useState<string | null>(null)
  const fieldRef = React.useRef<HTMLDivElement>(null)
  const editing = draft !== null

  const displayValue = editing ? draft : toPercentString(slippage.auto ? autoSlippage : slippage.value)
  const parsed = parseFloat(displayValue)
  const customPct = editing ? parsed : slippage.auto ? NaN : slippage.value * 100
  const warning = Number.isNaN(customPct) ? undefined : slippageWarning(customPct, autoPct)

  const valueColor =
    warning?.tone === 'critical'
      ? 'text-statusCritical'
      : warning?.tone === 'warning'
        ? 'text-statusWarning'
        : slippage.auto && !editing
          ? 'text-neutral2'
          : 'text-neutral1'

  const onChange = (raw: string) => {
    const value = raw.replace(',', '.')
    if (value === '' || value === '.') {
      setDraft(value)
      return
    }
    const [, decimals] = value.split('.')
    const next = Number(value)
    // Reject invalid input with a shake, as Uniswap does
    if (Number.isNaN(next) || next > MAX_CUSTOM_SLIPPAGE || value.split('.').length > 2 || (decimals?.length ?? 0) > 2) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        fieldRef.current?.animate(
          [0, -4, 4, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
          { duration: 300, easing: 'ease-in-out' },
        )
      }
      return
    }
    setDraft(value)
    if (next > 0) onSlippageChange({ auto: false, value: next / 100 })
  }

  const onFocus = () => setDraft(slippage.auto ? '' : toPercentString(slippage.value))

  const onBlur = () => {
    const next = parseFloat(draft ?? '')
    setDraft(null)
    // Empty or zero falls back to Auto
    if (Number.isNaN(next) || next === 0) onSlippageChange({ auto: true, value: autoSlippage })
  }

  return (
    <SettingRow
      title="Max slippage"
      tooltip="Your transaction will revert if the price changes more than the slippage percentage."
      warning={warning}
      control={
        <div
          ref={fieldRef}
          className={cn(
            fieldClassName,
            'pr-uni-8',
            editing ? 'bg-surface2' : 'bg-surface1 hover:bg-surface1Hovered',
            fieldBorder({ editing, tone: warning?.tone }),
          )}
        >
          <button
            type="button"
            aria-pressed={slippage.auto && !editing}
            onClick={() => {
              setDraft(null)
              onSlippageChange({ auto: true, value: autoSlippage })
            }}
            className={cn(
              'cursor-pointer rounded-uni-full px-uni-8 py-uni-2 text-buttonLabel3 outline-none transition-colors duration-100',
              'focus-visible:ring-1 focus-visible:ring-neutral3',
              slippage.auto && !editing
                ? 'bg-accent2 text-accent1 hover:bg-accent2Hovered'
                : 'bg-surface3 text-neutral2 hover:bg-surface3Hovered hover:text-neutral1',
            )}
          >
            Auto
          </button>
          <label className={cn('flex cursor-text items-center pr-uni-12 pl-uni-4', valueColor)}>
            <input
              inputMode="decimal"
              aria-label="Max slippage percentage"
              value={displayValue}
              placeholder={toPercentString(autoSlippage)}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              // Grows with its text; `size` is the fallback where field-sizing is unsupported
              size={Math.max(displayValue.length, 1)}
              className={cn(inputClassName, 'min-w-[14px] pr-uni-4 [field-sizing:content]')}
            />
            <span className="text-subheading2">%</span>
          </label>
        </div>
      }
    />
  )
}

function DeadlineRow({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const editing = draft !== null
  const value = editing ? draft : String(minutes)
  const current = editing ? Number(draft) || minutes : minutes
  const warning: Warning | undefined = current > WARNING_DEADLINE ? { tone: 'warning', message: 'High deadline' } : undefined

  return (
    <SettingRow
      title="Tx. deadline"
      tooltip="Your transaction will revert if it is pending for more than this period of time. (Maximum: 3 days)."
      warning={warning}
      control={
        <label
          className={cn(
            fieldClassName,
            'cursor-text',
            editing ? 'border-accent1 bg-surface2' : 'border-surface3 bg-surface1 hover:border-surface3Hovered hover:bg-surface1Hovered',
          )}
        >
          <span className="flex items-center gap-uni-4 pr-uni-8">
            <input
              inputMode="numeric"
              aria-label="Transaction deadline in minutes"
              value={value}
              placeholder={String(DEFAULT_DEADLINE)}
              onFocus={() => setDraft(String(minutes))}
              onChange={(e) => {
                const raw = e.target.value
                if (raw !== '' && !/^\d+$/.test(raw)) return
                if (Number(raw) > MAX_DEADLINE) return
                setDraft(raw)
                if (Number(raw) >= 1) onChange(Number(raw))
              }}
              onBlur={() => {
                if (!(Number(draft) >= 1)) onChange(DEFAULT_DEADLINE)
                setDraft(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className={cn(inputClassName, 'w-[44px] text-neutral1')}
            />
            <span className="text-subheading2 text-neutral2">{current === 1 ? 'minute' : 'minutes'}</span>
          </span>
        </label>
      }
    />
  )
}
