'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UniButton } from '../UniButton'
import {
  AdvancedToggle,
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
 * Uniswap's "Set price range" step, composed (SelectPriceRangeStep):
 *
 *   Set price range / description
 *   ┌ range options: full, strategies, custom (top) ──┐ 4px
 *   ├ current price · token toggle ───────────────────┤
 *   │ Advanced ⌄                                      │
 *   │ ┆ chart, period + zoom + reset (when open)      │
 *   ├ min price | max price (rounded bottom) ─────────┘ 4px
 *   Invalid range
 *   [ Continue ]
 *
 * A redesign of the order, not a port: Uniswap leads with a Full | Custom
 * switch and the chart, and puts the strategies under it. Here one grid of
 * options (full range, the strategies, custom) comes first, and
 * the chart opens behind "Advanced" (state: `advanced`), easing its height
 * open. Closed, the chart is unmounted; its view keeps tracking the range, so
 * it opens fitted to whatever the strategies or inputs set.
 *
 * The root is a container (`@container/range`): the parts switch to their
 * narrow layouts by container width, so the 375px mobile frame (which doesn't
 * change viewport media queries) works too. With `explode`, each part carries
 * data-explode for the exploded-view transition, as SwapFormView does.
 * State lives in useRangeSelector; remount with a key to load another preset.
 */

interface LiquidityRangeSelectorProps {
  defaultState: RangeSelectorState
  explode?: boolean
  className?: string
  onContinue?: () => void
}

type Part = 'heading' | 'strategies' | 'chart-header' | 'advanced' | 'chart' | 'actions' | 'inputs' | 'continue'

function LiquidityRangeSelector({ defaultState, explode, className, onContinue }: LiquidityRangeSelectorProps) {
  const s = useRangeSelector(defaultState)
  const chartId = React.useId()
  const reduceMotion = useReducedMotion()

  const part = (id: Part, node: React.ReactNode, partClassName?: string) => (
    <div data-explode={explode ? id : undefined} className={partClassName}>
      {node}
    </div>
  )

  return (
    <div
      data-slot="liquidity-range-selector"
      className={cn('@container/range flex w-full max-w-[560px] flex-col gap-uni-20', className)}
    >
      {part('heading', <RangeHeading fullRange={s.fullRange} />)}

      <div className="flex flex-col gap-uni-8">
        <div className="flex flex-col gap-uni-4">
          {part(
            'strategies',
            <PriceStrategies
              tickSpacing={s.tickSpacing}
              selected={s.option}
              range={s.range}
              currentTick={s.currentTick}
              onSelect={s.selectOption}
              className="rounded-t-uni-20"
            />,
          )}
          <div className="flex flex-col overflow-hidden bg-surface2">
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
            {part('advanced', <AdvancedToggle open={s.advanced} onOpenChange={s.setAdvanced} controls={chartId} />)}
            <AnimatePresence initial={false}>
              {s.advanced && (
                <motion.div
                  key="chart"
                  id={chartId}
                  role="region"
                  aria-label="Liquidity chart"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
            />,
          )}
        </div>
        <RangeValidation kind={s.invalidRange ? 'range' : s.invalidPrice ? 'price' : null} />
      </div>

      {part(
        'continue',
        <UniButton size="large" fill variant="branded" disabled={s.invalid} onClick={onContinue}>
          Continue
        </UniButton>,
      )}
    </div>
  )
}

export { LiquidityRangeSelector }
export type { LiquidityRangeSelectorProps }
