'use client'

import { useState } from 'react'
import { Canvas, CanvasFrame, CanvasSection, type CanvasController } from '@/components/showcase/canvas'
import { UniswapScope } from '@/components/uniswap'
import {
  CHART_PERIODS,
  POINTS_PER_SERIES,
  SparklineChart,
  SparklineHeader,
  SparklinePeriodSelector,
  TokenPriceSparkline,
  useSparklineModel,
  type ChartPeriod,
  type ChartType,
} from '@/components/uniswap/chart'
import { TOKENS } from '@/components/uniswap/swap/tokens'
import type { Token } from '@/components/uniswap/swap/types'
import { cn } from '@/lib/utils'

/*
 * Canvas view of the sparkline: the live card taken apart (anatomy), its key
 * states, and both themes. Frames render the real component, so scrubbing and
 * period switching work everywhere.
 */

// The card is 480 wide; its parts sit inside 1px border + 8px padding (462).
// Anatomy stages add 16px padding around a part, so parts keep their exact width.
const CARD_WIDTH = 480
const PART_WIDTH = CARD_WIDTH - 2 - 16
const CHART_HEIGHT = 160

/** A Uniswap-scoped surface for a frame. Follows the site theme unless forced. */
function Stage({
  theme,
  width = CARD_WIDTH + 32,
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

/**
 * The live card's token and period, taken apart into header, chart and period
 * selector. The three frames share one state: scrub the chart frame and the
 * header frame follows; change the period and the chart morphs.
 */
function SparklineAnatomy({
  token,
  period: initialPeriod,
  chartType: initialChartType,
}: {
  token: Token
  period: ChartPeriod
  chartType: ChartType
}) {
  const [period, setPeriod] = useState(initialPeriod)
  const [chartType, setChartType] = useState(initialChartType)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const model = useSparklineModel(token, period, { paused: hoverIndex !== null })
  const stage = PART_WIDTH + 32

  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live card, taken apart. The parts share one state: scrub the chart and the header follows."
      direction="column"
    >
      <CanvasFrame id="part-header" title="Header" note="Token, chart type, price, change; the hovered point while scrubbing" labelPlacement="side">
        <Stage card width={stage}>
          <div data-explode-target="header">
            <SparklineHeader
              model={model}
              hoverIndex={hoverIndex}
              chartType={chartType}
              onChartTypeChange={(next) => {
                setHoverIndex(null)
                setChartType(next)
              }}
            />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame
        id="part-chart"
        title="Chart"
        note="Line + fill by direction, or candles; time axis; crosshair on hover (with a dot, or the candle's OHLC)"
        labelPlacement="side"
      >
        <Stage card width={stage}>
          <div data-explode-target="chart">
            <SparklineChart
              model={model}
              type={chartType}
              hoverIndex={hoverIndex}
              onHoverIndexChange={setHoverIndex}
              style={{ height: CHART_HEIGHT }}
            />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-periods" title="Period selector" note="SegmentedControl; the path morphs between periods" labelPlacement="side">
        <Stage card width={stage}>
          <div data-explode-target="periods">
            <SparklinePeriodSelector
              value={period}
              onValueChange={(next) => {
                setHoverIndex(null)
                setPeriod(next)
              }}
            />
          </div>
        </Stage>
      </CanvasFrame>
    </CanvasSection>
  )
}

export function SparklineCanvas({
  controller,
  anatomy,
}: {
  controller: CanvasController
  anatomy: { token: Token; period: ChartPeriod; chartType: ChartType }
}) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2400} initialFocus="anatomy" aria-label="Price sparkline canvas">
      <SparklineAnatomy
        key={`${anatomy.token.symbol}-${anatomy.period}-${anatomy.chartType}`}
        token={anatomy.token}
        period={anatomy.period}
        chartType={anatomy.chartType}
      />

      <CanvasSection
        id="states"
        title="States"
        description="Direction sets the color; a change that rounds to 0.00% reads as flat. Scrubbing shows the hovered point, its change from the period start, and its time."
      >
        <CanvasFrame id="state-scrubbing" title="Scrubbing" note="Pinned at a point; hover to move it">
          <Stage>
            <TokenPriceSparkline token={TOKENS.ETH} scrubIndex={Math.round(POINTS_PER_SERIES * 0.42)} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="state-up" title="Up" note="ETH +1.84% · statusSuccess">
          <Stage>
            <TokenPriceSparkline token={TOKENS.ETH} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="state-down" title="Down" note="SHIB −3.15% · statusCritical">
          <Stage>
            <TokenPriceSparkline token={TOKENS.SHIB} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="state-flat" title="Flat" note="DAI 0.00%: neutral, with a stablecoin's minimum range">
          <Stage>
            <TokenPriceSparkline token={TOKENS.DAI} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="state-loading" title="Loading" note="First load: price and change skeletons, a wave under the shimmer">
          <Stage>
            <TokenPriceSparkline token={TOKENS.ETH} loading />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="candles"
        title="Candlesticks"
        description="The token bar's switch draws the same series as OHLC candles: hourly on 1D (four points each, sharing boundaries so each opens at the last close), 5 seconds on Live, where the forming candle closes at the eased tip. Scrubbing steps by candle and shows its open, high, low and close."
      >
        <CanvasFrame id="candles-1d" title="ETH · 1D" note="24 hourly candles">
          <Stage>
            <TokenPriceSparkline token={TOKENS.ETH} defaultChartType="candles" />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="candles-scrubbing" title="Scrubbing" note="Pinned at a candle: the header shows its close, the readout its OHLC">
          <Stage>
            <TokenPriceSparkline token={TOKENS.ETH} defaultChartType="candles" scrubIndex={Math.round(POINTS_PER_SERIES * 0.42)} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="candles-live" title="ETH · Live" note="A candle per 5 seconds, scrolling">
          <Stage>
            <TokenPriceSparkline token={TOKENS.ETH} defaultPeriod="LIVE" defaultChartType="candles" />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="candles-down" title="SHIB · 1W" note="Each candle colored by its own direction">
          <Stage>
            <TokenPriceSparkline token={TOKENS.SHIB} defaultPeriod="1W" defaultChartType="candles" />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="candles-dark" title="ETH · 1M · dark">
          <Stage theme="dark">
            <TokenPriceSparkline token={TOKENS.ETH} defaultPeriod="1M" defaultChartType="candles" />
          </Stage>
        </CanvasFrame>
      </CanvasSection>

      <CanvasSection
        id="periods"
        title="Periods"
        description="One seeded series per token and period, ending at the current price. 1D matches the token's 24h change. Live streams a new point every 500ms; the line's tip eases toward each one as it scrolls. Scrubbing pauses it."
      >
        {CHART_PERIODS.map(({ value, label, description }) => (
          <CanvasFrame key={value} id={`period-${value}`} title={`ETH · ${label}`} note={description}>
            <Stage>
              <TokenPriceSparkline token={TOKENS.ETH} defaultPeriod={value} />
            </Stage>
          </CanvasFrame>
        ))}
      </CanvasSection>

      <CanvasSection
        id="themes"
        title="Light and dark"
        description="The same card under each theme. Line, fill and dot take statusSuccess / statusCritical from the theme."
      >
        <CanvasFrame id="theme-light" title="ETH · light">
          <Stage theme="light">
            <TokenPriceSparkline token={TOKENS.ETH} />
          </Stage>
        </CanvasFrame>
        <CanvasFrame id="theme-dark" title="ETH · dark">
          <Stage theme="dark">
            <TokenPriceSparkline token={TOKENS.ETH} />
          </Stage>
        </CanvasFrame>
      </CanvasSection>
    </Canvas>
  )
}
