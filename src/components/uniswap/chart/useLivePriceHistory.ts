'use client'

import * as React from 'react'
import type { Token } from '../swap/types'
import {
  LIVE_POINTS,
  LIVE_TICK_MS,
  MOCK_NOW,
  createMockPriceStream,
  getMockPriceHistory,
  type PricePoint,
} from './mockPriceHistory'

/*
 * The Live period's mock feed: the seeded two-minute history, then a new point
 * every tick from createMockPriceStream, keeping the latest LIVE_POINTS.
 *
 * Time runs on the feed's own clock. It's wall time while the feed runs (the
 * history is moved to end "now" each time Live is selected) and it stops while
 * paused, so scrubbing freezes the chart in place and resuming carries on from
 * the same point. The chart reads the clock every frame: the line's tip sits at
 * the clock's time and eases toward each new value (see SparklineChart).
 */

export interface LiveClock {
  /** Feed time, Unix ms */
  now(): number
}

function createFeed(token: Token) {
  const next = createMockPriceStream(token)
  let points = getMockPriceHistory(token, 'LIVE')
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  // Stopped until run(): `frozen` holds the time; running, time = base + elapsed
  let frozen: number | null = MOCK_NOW
  let base = MOCK_NOW
  let since = 0
  const clock: LiveClock = { now: () => frozen ?? base + (performance.now() - since) }
  const latest = () => points[points.length - 1]

  const tick = () => {
    const now = clock.now()
    let last = latest()
    if (last.timestamp + LIVE_TICK_MS > now) return
    const out = points.slice()
    // Catches up in one go after a throttled background tab
    while (last.timestamp + LIVE_TICK_MS <= now) {
      last = next(last)
      out.push(last)
    }
    points = out.slice(-LIVE_POINTS)
    emit()
  }

  return {
    token,
    clock,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    getPoints: () => points,
    /** Shift the series so it ends now (on selecting Live; values carry on where they left off) */
    rebase() {
      const shift = Date.now() - latest().timestamp
      if (shift > 0) points = points.map((p) => ({ ...p, timestamp: p.timestamp + shift }))
      frozen = latest().timestamp
      emit()
    },
    /** Start the clock and the ticks; the returned stop freezes both */
    run() {
      base = frozen ?? clock.now()
      since = performance.now()
      frozen = null
      let id: ReturnType<typeof setTimeout>
      const schedule = () => {
        id = setTimeout(
          () => {
            tick()
            schedule()
          },
          Math.max(0, latest().timestamp + LIVE_TICK_MS - clock.now()),
        )
      }
      schedule()
      return () => {
        clearTimeout(id)
        frozen = clock.now()
      }
    },
  }
}

export function useLivePriceHistory(
  token: Token,
  { enabled, paused = false }: { enabled: boolean; paused?: boolean },
): { points: PricePoint[]; clock: LiveClock } {
  const [feed, setFeed] = React.useState(() => createFeed(token))
  // A new token starts its own feed
  if (feed.token !== token) setFeed(createFeed(token))

  const points = React.useSyncExternalStore(feed.subscribe, feed.getPoints, feed.getPoints)

  React.useEffect(() => {
    if (enabled) feed.rebase()
  }, [feed, enabled])

  React.useEffect(() => {
    if (enabled && !paused) return feed.run()
  }, [feed, enabled, paused])

  return { points, clock: feed.clock }
}
