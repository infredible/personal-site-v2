'use client'

import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { UniButton, UniswapScope } from '@/components/uniswap'
import {
  FEE_TIERS,
  LiquidityRangeSelector,
  MinMaxInputs,
  POOLS,
  PriceStrategies,
  RangeActionBar,
  RangeChartHeader,
  RangeHeading,
  RangeValidation,
  createRangeState,
  poolAtFee,
  stablePercentLabel,
  useRangeSelector,
  type RangeSelectorState,
} from '@/components/uniswap/liquidity'
import { RANGE_CHART_HEIGHT, RangeChart } from '@/components/uniswap/liquidity/RangeChart'
import { cn } from '@/lib/utils'

/*
 * Canvas view of the range selector: the live step taken apart (anatomy), its
 * key states, fee tiers, and both themes. Frames render the real component.
 */

// The selector is 1040 wide: two 508px columns, 24px apart. Anatomy stages add
// 16px padding around a part, so parts keep their exact Component-view width
// and the exploded flight lands without resizing.
const SELECTOR_WIDTH = 1040
const COLUMN_WIDTH = (SELECTOR_WIDTH - 24) / 2
const STACKED_WIDTH = 720
const NARROW_WIDTH = 375
const STAGE_PAD = 32

/** A Uniswap-scoped surface for a frame. Follows the site theme unless forced. */
function Stage({
  theme,
  width = SELECTOR_WIDTH + STAGE_PAD,
  card = false,
  className,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  /** Exploded-view card: its background fades in behind a part flying into it */
  card?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <UniswapScope
      theme={theme}
      data-explode-card={card ? '' : undefined}
      className={cn('rounded-uni-24 p-uni-16', className)}
      style={{ width, maxWidth: '100%' }}
    >
      {children}
    </UniswapScope>
  )
}

/** A live selector in a stage, from a state */
function SelectorStage({
  state,
  theme,
  width,
}: {
  state: RangeSelectorState
  theme?: 'light' | 'dark'
  width?: number
}) {
  return (
    <Stage theme={theme} width={width}>
      <LiquidityRangeSelector defaultState={state} />
    </Stage>
  )
}

/**
 * The step taken apart into its eight parts, all driven by one
 * useRangeSelector: drag the chart and the inputs follow; pick a strategy and
 * the chart, inputs and mode all move.
 */
function RangeAnatomy({ state }: { state: RangeSelectorState }) {
  const s = useRangeSelector(state)

  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live step, taken apart. The parts share one state: drag a bound in the chart and the inputs follow; pick a strategy and the chart moves."
      direction="column"
    >
      <CanvasFrame id="part-heading" title="Heading" note="The description follows full range vs custom" labelPlacement="side">
        <Stage card width={COLUMN_WIDTH + STAGE_PAD}>
          <div data-explode-target="heading">
            <RangeHeading fullRange={s.fullRange} />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-strategies" title="Range options" note="Full range, four strategies, Custom; Custom tracks hand edits" labelPlacement="side">
        <Stage card width={COLUMN_WIDTH + STAGE_PAD}>
          <div data-explode-target="strategies" className="@container/range">
            <PriceStrategies
              tickSpacing={s.tickSpacing}
              selected={s.option}
              range={s.range}
              currentTick={s.currentTick}
              onSelect={s.selectOption}
              className="rounded-uni-20"
            />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-chart-header" title="Chart header" note="Current price; the token toggle inverts it" labelPlacement="side">
        <Stage card width={COLUMN_WIDTH + STAGE_PAD}>
          <div data-explode-target="chart-header" className="@container/range rounded-t-uni-20 bg-surface2">
            <RangeChartHeader
              pool={s.pool}
              inverted={s.inverted}
              price={s.price}
              base={s.base}
              quote={s.quote}
              onInvertedChange={s.setInverted}
            />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-chart" title="Liquidity chart" note="Price history over liquidity; drag the bounds or the band" labelPlacement="side">
        <Stage card width={COLUMN_WIDTH + STAGE_PAD}>
          <div
            data-explode-target="chart"
            className="@container/range relative overflow-hidden border-y border-surface3 bg-surface2 py-uni-12 @max-[440px]/range:py-uni-4"
          >
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
            />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-actions" title="Period and zoom" note="1D to All time, zoom, expand, reset" labelPlacement="side">
        <Stage card width={COLUMN_WIDTH + STAGE_PAD}>
          <div data-explode-target="actions" className="@container/range rounded-b-uni-20 bg-surface2">
            <RangeActionBar
              period={s.period}
              onPeriodChange={s.setPeriod}
              onZoomIn={s.zoomIn}
              onZoomOut={s.zoomOut}
              onExpand={s.expand}
              onReset={s.reset}
              expandDisabled={s.fullRange}
            />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-inputs" title="Min and max" note="Typed prices snap on blur; the steppers move one tick spacing" labelPlacement="side">
        <Stage card width={COLUMN_WIDTH + STAGE_PAD}>
          <div data-explode-target="inputs" className="@container/range">
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
            />
          </div>
          <div className="@container/range mt-uni-8">
            <RangeValidation kind={s.invalidRange ? 'range' : s.invalidPrice ? 'price' : null} />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-continue" title="Continue" note="Disabled while the range is invalid" labelPlacement="side">
        <Stage card width={COLUMN_WIDTH + STAGE_PAD}>
          <div data-explode-target="continue">
            <UniButton size="large" fill variant="branded" disabled={s.invalid}>
              Continue
            </UniButton>
          </div>
        </Stage>
      </CanvasFrame>
    </CanvasSection>
  )
}

const ETH_USDC = POOLS['eth-usdc']

export function LiquidityRangeCanvas({
  controller,
  state,
}: {
  controller: CanvasController
  state: RangeSelectorState
}) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2400} initialFocus="anatomy" aria-label="Liquidity range canvas">
      <RangeAnatomy key={`${state.pool.id}-${state.inverted}-${state.strategy}-${state.range.fullRange}-${state.inputMode}`} state={state} />

      <CanvasSection
        id="states"
        title="States"
        description="Each frame is the live step. Full range shows 0 and ∞; a strategy highlights its card until a bound is edited by hand."
      >
        <CanvasFrame id="state-full-range" title="Full range" note="Min 0, Max ∞; the chart fits the price history">
          <SelectorStage state={createRangeState(ETH_USDC, { fullRange: true })} />
        </CanvasFrame>
        <CanvasFrame id="state-custom" title="Custom (default)" note="Middle 60% of a window reaching the history's low and high; the Custom tile shows it">
          <SelectorStage state={createRangeState(ETH_USDC)} />
        </CanvasFrame>
        <CanvasFrame id="state-strategy" title="Strategy selected" note="Wide: 0.5× to 2× the current price">
          <SelectorStage state={createRangeState(ETH_USDC, { strategy: 'wide' })} />
        </CanvasFrame>
        <CanvasFrame id="state-out-of-range" title="Out of range" note="One-sided upper: the price is below Min, so the position holds only ETH">
          <SelectorStage state={createRangeState(ETH_USDC, { strategy: 'one-sided-upper' })} />
        </CanvasFrame>
        <CanvasFrame id="state-percent" title="Percent mode" note="Inputs read a % from the current price; chart tooltips match">
          <SelectorStage state={createRangeState(ETH_USDC, { inputMode: 'percent' })} />
        </CanvasFrame>
        <CanvasFrame id="state-inverted" title="Inverted" note="ETH per USDC; ticks are negated so up is still a higher price">
          <SelectorStage state={createRangeState(ETH_USDC, { inverted: true })} />
        </CanvasFrame>
        <CanvasFrame id="state-stable" title="Stable pair" note="USDC/USDT 0.01%: spacing 1, Stable is ± 0.03%">
          <SelectorStage state={createRangeState(POOLS['usdc-usdt'], { strategy: 'stable' })} />
        </CanvasFrame>
        <CanvasFrame id="state-stacked" title="Stacked (720px)" note="Under 880px one column; the price card moves between the options and the inputs">
          <SelectorStage state={createRangeState(ETH_USDC)} width={STACKED_WIDTH + STAGE_PAD} />
        </CanvasFrame>
        <CanvasFrame id="state-narrow" title="Narrow (375px)" note="Container queries: compact paddings and stacked inputs">
          <SelectorStage state={createRangeState(ETH_USDC)} width={NARROW_WIDTH + STAGE_PAD} />
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="fee-tiers"
        title="Fee tiers"
        description="The same pair at each tier. The tier sets the tick spacing (1, 10, 60, 200), so Stable's width and every snapped bound change; Stable is selected in each."
      >
        {FEE_TIERS.map(({ fee, label }) => {
          const pool = poolAtFee(ETH_USDC, fee)
          return (
            <CanvasFrame
              key={fee}
              id={`fee-${fee}`}
              title={`ETH/USDC · ${label}`}
              note={`Spacing ${pool.tickSpacing} · Stable ${stablePercentLabel(pool.tickSpacing)}`}
            >
              <SelectorStage state={createRangeState(pool, { strategy: 'stable' })} />
            </CanvasFrame>
          )
        })}
      </CanvasSection>

      <CanvasSection
        id="themes"
        title="Light and dark"
        description="The same step under each theme. The chart's band and bounds use the pair's token colors in both."
      >
        <CanvasFrame id="theme-light" title="Light">
          <SelectorStage theme="light" state={createRangeState(ETH_USDC)} />
        </CanvasFrame>
        <CanvasFrame id="theme-dark" title="Dark">
          <SelectorStage theme="dark" state={createRangeState(ETH_USDC)} />
        </CanvasFrame>
      </CanvasSection>
    </Canvas>
  )
}
