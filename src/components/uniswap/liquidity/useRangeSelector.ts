'use client'

import * as React from 'react'
import { sanitizeAmountInput } from '../swap/parts/amount'
import { getPairPriceHistory } from './pools'
import {
  currentPrice,
  currentVisualTick,
  detectStrategy,
  fromVisualRange,
  fullRangeTicks,
  getDefaultRange,
  getStrategyRange,
  isInvalidRange,
  pairTokens,
  parseInputTick,
  toVisualRange,
  usableTickBounds,
  visualHistory,
  withLower,
  withUpper,
  type VisualRange,
} from './ticks'
import type { Pool, PriceRange, PriceStrategyId, RangeInputMode, RangePeriod, RangeSelectorState, RangeView } from './types'
import { ZOOM_FACTOR, fitRangeView, historyView, zoomView } from './view'

/*
 * State and handlers of the range selector (Uniswap's CreatePosition range
 * context plus the D3 chart's local store, folded into one hook).
 *
 * - State keeps CANONICAL ticks (RangeSelectorState); everything the UI sees
 *   or edits is VISUAL (toVisualRange), so inverting the token toggle never
 *   needs special cases in the parts.
 * - Every transition is a pure functional update of one `Core` object, so the
 *   handlers are stable and can be handed straight to the chart.
 * - Typing: each keystroke only changes the draft text and a `live` range the
 *   chart draws (production's chart-local price). The committed range changes
 *   on blur / Enter, which snaps, clamps (withLower / withUpper) and reverts
 *   the text to the formatted price of the snapped tick.
 * - Full range -> Custom: restores the custom range the user had before
 *   (production just recomputes the default, because it discards it; keeping
 *   it avoids losing work on an accidental toggle). With none, or after the
 *   token toggle flips, it's the default range (getDefaultRange).
 * - The chart view refits (fitRangeView, or historyView in full range) when
 *   the range changes as a whole: mode, strategy, invert, reset, expand. Not
 *   on drags, steppers or typing, so the window stays put under the pointer.
 */

export type RangeEnd = 'lower' | 'upper'

interface Core {
  pool: Pool
  inverted: boolean
  range: PriceRange
  period: RangePeriod
  inputMode: RangeInputMode
  strategy: PriceStrategyId | null
  /** Liquidity chart revealed */
  advanced: boolean
  view: RangeView
  /** Text being typed per end; null shows the formatted price */
  drafts: Record<RangeEnd, string | null>
  /** The range a parseable draft would give, so the chart band follows the keys */
  live: VisualRange | null
  /** Custom range to restore after a stint in full range */
  lastCustom: { range: PriceRange; strategy: PriceStrategyId | null } | null
}

const NO_DRAFTS: Core['drafts'] = { lower: null, upper: null }

const historyOf = (pool: Pool, period: RangePeriod, inverted: boolean) =>
  visualHistory(getPairPriceHistory(pool, period), inverted)

function viewFor(pool: Pool, range: PriceRange, inverted: boolean, period: RangePeriod): RangeView {
  const tick = currentVisualTick(pool, inverted)
  return range.fullRange
    ? historyView(historyOf(pool, period, inverted), tick, pool.tickSpacing)
    : fitRangeView(toVisualRange(range, inverted), pool.tickSpacing)
}

function defaultRangeFor(pool: Pool, period: RangePeriod, inverted: boolean): PriceRange {
  const visual = getDefaultRange(
    currentVisualTick(pool, inverted),
    historyOf(pool, period, inverted),
    pool.tickSpacing,
  )
  return { ...fromVisualRange(visual, inverted), fullRange: false }
}

function init(state: RangeSelectorState): Core {
  return {
    pool: state.pool,
    inverted: state.inverted,
    range: state.range,
    period: state.period,
    inputMode: state.inputMode,
    strategy: state.strategy,
    advanced: state.advanced ?? false,
    view: viewFor(state.pool, state.range, state.inverted, state.period),
    drafts: NO_DRAFTS,
    live: null,
    lastCustom: null,
  }
}

/** A custom range set by hand: detects the matching strategy, clears typing */
function withCustomRange(core: Core, visual: VisualRange): Core {
  const strategy = detectStrategy(visual, currentVisualTick(core.pool, core.inverted), core.pool.tickSpacing)
  return {
    ...core,
    range: { ...fromVisualRange(visual, core.inverted), fullRange: false },
    strategy,
    drafts: NO_DRAFTS,
    live: null,
  }
}

/** Input text -> what's allowed to be typed: digits, one dot, "∞" (price), a leading "-" (percent) */
function sanitizeRangeText(raw: string, mode: RangeInputMode) {
  if (mode === 'price' && raw.includes('∞')) return '∞'
  const negative = mode === 'percent' && raw.trim().startsWith('-')
  return (negative ? '-' : '') + sanitizeAmountInput(raw.replace(/-/g, ''), 18)
}

export function useRangeSelector(initial: RangeSelectorState) {
  const [core, setCore] = React.useState<Core>(() => init(initial))

  const { pool, inverted, range, period, inputMode, strategy, advanced, view, drafts } = core
  const { tickSpacing } = pool

  const visualRange = React.useMemo(() => toVisualRange(range, inverted), [range, inverted])
  const { base, quote } = pairTokens(pool, inverted)
  const tick = currentVisualTick(pool, inverted)

  /** The range the chart draws: the typed one while it's valid, else the committed one */
  const chartRange = core.live ?? visualRange

  const bounds = usableTickBounds(tickSpacing)
  const invalidRange = !range.fullRange && isInvalidRange(range)
  const invalidPrice = !range.fullRange && (range.minTick < bounds.minTick || range.maxTick > bounds.maxTick)

  /* Mode ------------------------------------------------------------------ */

  const setFullRange = React.useCallback((full: boolean) => {
    setCore((c) => {
      if (c.range.fullRange === full) return c
      if (full) {
        const next = fullRangeTicks(c.pool.tickSpacing)
        return {
          ...c,
          range: next,
          strategy: null,
          drafts: NO_DRAFTS,
          live: null,
          lastCustom: { range: c.range, strategy: c.strategy },
          view: viewFor(c.pool, next, c.inverted, c.period),
        }
      }
      const restored = c.lastCustom
      const next = restored?.range ?? defaultRangeFor(c.pool, c.period, c.inverted)
      const visual = toVisualRange(next, c.inverted)
      return {
        ...c,
        range: next,
        strategy:
          restored?.strategy ??
          detectStrategy(visual, currentVisualTick(c.pool, c.inverted), c.pool.tickSpacing),
        view: viewFor(c.pool, next, c.inverted, c.period),
      }
    })
  }, [])

  /** The token toggle: back to the default range in the new orientation (full range stays full) */
  const setInverted = React.useCallback((next: boolean) => {
    setCore((c) => {
      if (c.inverted === next) return c
      const range = c.range.fullRange ? c.range : defaultRangeFor(c.pool, c.period, next)
      return {
        ...c,
        inverted: next,
        range,
        strategy: range.fullRange
          ? null
          : detectStrategy(toVisualRange(range, next), currentVisualTick(c.pool, next), c.pool.tickSpacing),
        drafts: NO_DRAFTS,
        live: null,
        lastCustom: null,
        view: viewFor(c.pool, range, next, c.period),
      }
    })
  }, [])

  const setPeriod = React.useCallback((next: RangePeriod) => {
    setCore((c) =>
      c.period === next
        ? c
        : {
            ...c,
            period: next,
            // Full range fits the history, so a new history refits; a custom view stays where it is
            view: c.range.fullRange ? viewFor(c.pool, c.range, c.inverted, next) : c.view,
          },
    )
  }, [])

  const selectStrategy = React.useCallback((id: PriceStrategyId) => {
    setCore((c) => {
      const visual = getStrategyRange(id, currentVisualTick(c.pool, c.inverted), c.pool.tickSpacing)
      const next: PriceRange = { ...fromVisualRange(visual, c.inverted), fullRange: false }
      return {
        ...c,
        range: next,
        strategy: id,
        drafts: NO_DRAFTS,
        live: null,
        view: fitRangeView(visual, c.pool.tickSpacing),
      }
    })
  }, [])

  const toggleInputMode = React.useCallback(() => {
    setCore((c) => ({
      ...c,
      inputMode: c.inputMode === 'price' ? 'percent' : 'price',
      drafts: NO_DRAFTS,
      live: null,
    }))
  }, [])

  /* Chart ----------------------------------------------------------------- */

  /** Reveals or hides the chart. The view keeps tracking the range while hidden, so it opens fitted. */
  const setAdvanced = React.useCallback((next: boolean) => setCore((c) => ({ ...c, advanced: next })), [])

  const handleViewChange = React.useCallback((next: RangeView) => setCore((c) => ({ ...c, view: next })), [])

  /** Drags: live while moving (strategy kept), detected on release. Ignored in full range. */
  const handleRangeChange = React.useCallback((next: VisualRange, info: { final: boolean }) => {
    setCore((c) => {
      if (c.range.fullRange || next.lower >= next.upper) return c
      const updated = withCustomRange(c, next)
      return info.final ? updated : { ...updated, strategy: c.strategy }
    })
  }, [])

  const zoomIn = React.useCallback(
    () => setCore((c) => ({ ...c, view: zoomView(c.view, ZOOM_FACTOR, c.pool.tickSpacing) })),
    [],
  )
  const zoomOut = React.useCallback(
    () => setCore((c) => ({ ...c, view: zoomView(c.view, 1 / ZOOM_FACTOR, c.pool.tickSpacing) })),
    [],
  )

  /** Re-centers the window on the range (disabled in full range) */
  const expand = React.useCallback(() => {
    setCore((c) =>
      c.range.fullRange
        ? c
        : { ...c, view: fitRangeView(toVisualRange(c.range, c.inverted), c.pool.tickSpacing) },
    )
  }, [])

  /** Default range + refit, strategy cleared; in full range only the window refits */
  const reset = React.useCallback(() => {
    setCore((c) => {
      if (c.range.fullRange) return { ...c, view: viewFor(c.pool, c.range, c.inverted, c.period) }
      const next = defaultRangeFor(c.pool, c.period, c.inverted)
      return {
        ...c,
        range: next,
        strategy: null,
        drafts: NO_DRAFTS,
        live: null,
        view: viewFor(c.pool, next, c.inverted, c.period),
      }
    })
  }, [])

  /* Inputs ---------------------------------------------------------------- */

  /** Plus / Minus: one tick spacing; clamped like Uniswap's clampTickRange */
  const step = React.useCallback((end: RangeEnd, direction: 1 | -1) => {
    setCore((c) => {
      if (c.range.fullRange) return c
      const v = toVisualRange(c.range, c.inverted)
      const s = c.pool.tickSpacing
      return withCustomRange(c, end === 'lower' ? withLower(v, v.lower + direction * s, s) : withUpper(v, v.upper + direction * s, s))
    })
  }, [])

  const setDraft = React.useCallback((end: RangeEnd, text: string) => {
    setCore((c) => {
      if (c.range.fullRange) return c
      const clean = sanitizeRangeText(text, c.inputMode)
      const parsed = parseInputTick(clean, {
        tickSpacing: c.pool.tickSpacing,
        currentTick: currentVisualTick(c.pool, c.inverted),
        mode: c.inputMode,
      })
      const v = toVisualRange(c.range, c.inverted)
      const candidate = parsed === null ? null : end === 'lower' ? { lower: parsed, upper: v.upper } : { lower: v.lower, upper: parsed }
      return {
        ...c,
        drafts: { ...c.drafts, [end]: clean },
        live: candidate && candidate.lower < candidate.upper ? candidate : null,
      }
    })
  }, [])

  /** Blur / Enter: snap the typed price into the range, then show the snapped price */
  const commitDraft = React.useCallback((end: RangeEnd) => {
    setCore((c) => {
      const text = c.drafts[end]
      if (text === null) return c
      const cleared = { ...c, drafts: { ...c.drafts, [end]: null }, live: null }
      const parsed = parseInputTick(text, {
        tickSpacing: c.pool.tickSpacing,
        currentTick: currentVisualTick(c.pool, c.inverted),
        mode: c.inputMode,
      })
      if (parsed === null) return cleared
      const v = toVisualRange(c.range, c.inverted)
      const s = c.pool.tickSpacing
      return withCustomRange(cleared, end === 'lower' ? withLower(v, parsed, s) : withUpper(v, parsed, s))
    })
  }, [])

  /** Loads a whole new state (a preset). Selectors usually remount with a key instead. */
  const load = React.useCallback((state: RangeSelectorState) => setCore(init(state)), [])

  return {
    // State
    pool,
    inverted,
    period,
    inputMode,
    strategy,
    fullRange: range.fullRange,
    advanced,
    /** Canonical state, as RangeSelectorState describes it */
    state: { pool, inverted, range, period, inputMode, strategy, advanced } satisfies RangeSelectorState,
    // Derived
    /** Committed range, visual ticks (lower = displayed Min price) */
    range: visualRange,
    /** What the chart draws: `range`, or the typed range while a draft parses */
    chartRange,
    view,
    drafts,
    base,
    quote,
    /** Displayed price of the pool: quote per base */
    price: currentPrice(pool, inverted),
    /** Visual tick of the current price */
    currentTick: tick,
    tickSpacing,
    invalidRange,
    invalidPrice,
    invalid: invalidRange || invalidPrice,
    // Handlers
    setFullRange,
    setInverted,
    setPeriod,
    selectStrategy,
    toggleInputMode,
    setAdvanced,
    handleRangeChange,
    handleViewChange,
    zoomIn,
    zoomOut,
    expand,
    reset,
    step,
    setDraft,
    commitDraft,
    load,
  }
}

export type RangeSelector = ReturnType<typeof useRangeSelector>
