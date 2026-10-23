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
function SparklineAnatomy({ token, period: initialPeriod }: { token: Token; period: ChartPeriod }) {
  const [period, setPeriod] = useState(initialPeriod)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const model = useSparklineModel(token, period)
  const stage = PART_WIDTH + 32

  return (
    <CanvasSection
      id="anatomy"
      title="Anatomy"
      description="The live card, taken apart. The parts share one state: scrub the chart and the header follows."
      direction="column"
    >
      <CanvasFrame id="part-header" title="Header" note="Token, price, change; the hovered point while scrubbing" labelPlacement="side">
        <Stage card width={stage}>
          <div data-explode-target="header">
            <SparklineHeader model={model} hoverIndex={hoverIndex} />
          </div>
        </Stage>
      </CanvasFrame>
      <CanvasFrame id="part-chart" title="Chart" note="Line + fill by direction; crosshair and dot on hover" labelPlacement="side">
        <Stage card width={stage}>
          <div data-explode-target="chart">
            <SparklineChart model={model} hoverIndex={hoverIndex} onHoverIndexChange={setHoverIndex} style={{ height: CHART_HEIGHT }} />
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
  anatomy: { token: Token; period: ChartPeriod }
}) {
  return (
    <Canvas controller={controller} className="h-full" maxRowWidth={2400} initialFocus="anatomy" aria-label="Price sparkline canvas">
      <SparklineAnatomy key={`${anatomy.token.symbol}-${anatomy.period}`} token={anatomy.token} period={anatomy.period} />

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

      <CanvasSection id="periods" title="Periods" description="One seeded series per token and period, ending at the current price. 1D matches the token's 24h change.">
        {CHART_PERIODS.map(({ value, description }) => (
          <CanvasFrame key={value} id={`period-${value}`} title={`ETH · ${value}`} note={description}>
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
