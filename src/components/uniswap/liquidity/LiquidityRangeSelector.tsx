'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { UniButton } from '../UniButton'
import {
  MinMaxInputs,
  PriceStrategies,
  RangeActionBar,
  RangeChartHeader,
  RangeHeading,
  RangeValidation,
} from './parts'
import { RANGE_CHART_HEIGHT, RangeChart } from './RangeChart'
import { useRangeSelector } from './useRangeSelector'
import type { RangeSelectorState } from './types'

/*
 * Uniswap's "Set price range" step, recomposed as two columns:
 *
 *   Set price range / description     ┌ current price · token toggle ─┐
 *   ┌ range options (2×3) ──────────┐  │ chart (surface3 rules)        │
 *   └───────────────────────────────┘  │ period + zoom + reset         │
 *   ┌ min price | max price ────────┐  └───────────────────────────────┘
 *   Invalid range
 *   [ Continue ]
 *
 * A redesign of the layout, not a port: Uniswap stacks a Full | Custom switch,
 * the chart and then the strategies in one column. Here the left column is
 * the decision (options, then the exact bounds, then Continue) and the right
 * is the context it's made against: the current price and the chart, always
 * open, so picking a tile or typing a bound shows its range on the chart at
 * once. Both columns edit the same state.
 *
 * The root is a container (`@container/range`). From 880px wide it's two
 * equal columns; narrower (and in the 375px mobile frame, which doesn't change
 * viewport media queries) one column, with the price card between the options
 * and the inputs, so the current price still comes before the bounds. Parts
 * switch to their compact layouts below 440px, also by container width.
 * With `explode`, each part carries data-explode for the exploded-view
 * transition, as SwapFormView does. State lives in useRangeSelector; remount
 * with a key to load another preset.
 */

interface LiquidityRangeSelectorProps {
  defaultState: RangeSelectorState
  explode?: boolean
  className?: string
  onContinue?: () => void
}

type Part = 'heading' | 'strategies' | 'chart-header' | 'chart' | 'actions' | 'inputs' | 'continue'

/** Grid areas: stacked, then two columns with the price card spanning the right */
const LAYOUT = cn(
  'grid grid-cols-1 gap-x-uni-24 gap-y-uni-16',
  "[grid-template-areas:'heading'_'options'_'price'_'inputs'_'continue']",
  '@min-[880px]/range:grid-cols-2 @min-[880px]/range:grid-rows-[auto_auto_auto_1fr]',
  "@min-[880px]/range:[grid-template-areas:'heading_price'_'options_price'_'inputs_price'_'continue_price']",
)

function LiquidityRangeSelector({ defaultState, explode, className, onContinue }: LiquidityRangeSelectorProps) {
  const s = useRangeSelector(defaultState)

  const part = (id: Part, node: React.ReactNode, partClassName?: string) => (
    <div data-explode={explode ? id : undefined} className={partClassName}>
      {node}
    </div>
  )

  return (
    <div data-slot="liquidity-range-selector" className={cn('@container/range w-full max-w-[1040px]', className)}>
      <div className={LAYOUT}>
        {part('heading', <RangeHeading fullRange={s.fullRange} />, '[grid-area:heading]')}

        {part(
          'strategies',
          <PriceStrategies
            tickSpacing={s.tickSpacing}
            selected={s.option}
            range={s.range}
            currentTick={s.currentTick}
            onSelect={s.selectOption}
            className="rounded-uni-20"
          />,
          '[grid-area:options]',
        )}

        <div className="flex flex-col self-start overflow-hidden rounded-uni-20 bg-surface2 [grid-area:price]">
          {part(
            'chart-header',
            <RangeChartHeader
              pool={s.pool}
              inverted={s.inverted}
              price={s.price}
              base={s.base}
              quote={s.quote}
              onInvertedChange={s.setInverted}
            />,
          )}
          {part(
            'chart',
            <RangeChart
              pool={s.pool}
              inverted={s.inverted}
              period={s.period}
              range={s.chartRange}
              fullRange={s.fullRange}
              view={s.view}
              onViewChange={s.handleViewChange}
              onRangeChange={s.handleRangeChange}
              showPercentTooltips={s.inputMode === 'percent'}
              height={RANGE_CHART_HEIGHT}
            />,
            'relative overflow-hidden border-y border-surface3 py-uni-12 @max-[440px]/range:py-uni-4',
          )}
          {part(
            'actions',
            <RangeActionBar
              period={s.period}
              onPeriodChange={s.setPeriod}
              onZoomIn={s.zoomIn}
              onZoomOut={s.zoomOut}
              onExpand={s.expand}
              onReset={s.reset}
              expandDisabled={s.fullRange}
            />,
          )}
        </div>

        <div className="flex flex-col gap-uni-8 [grid-area:inputs]">
          {part(
            'inputs',
            <MinMaxInputs
              fullRange={s.fullRange}
              mode={s.inputMode}
              range={s.range}
              tickSpacing={s.tickSpacing}
              currentTick={s.currentTick}
              base={s.base}
              quote={s.quote}
              drafts={s.drafts}
              invalid={s.invalid}
              onDraftChange={s.setDraft}
              onCommit={s.commitDraft}
              onStep={s.step}
              onToggleMode={s.toggleInputMode}
              className="rounded-uni-20"
            />,
          )}
          <RangeValidation kind={s.invalidRange ? 'range' : s.invalidPrice ? 'price' : null} />
        </div>

        {part(
          'continue',
          <UniButton size="large" fill variant="branded" disabled={s.invalid} onClick={onContinue}>
            Continue
          </UniButton>,
          '[grid-area:continue] @min-[880px]/range:self-end',
        )}
      </div>
    </div>
  )
}

export { LiquidityRangeSelector }
export type { LiquidityRangeSelectorProps }
