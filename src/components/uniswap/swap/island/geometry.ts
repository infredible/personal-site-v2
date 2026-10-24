import type { TargetAndTransition, Transition } from 'framer-motion'

/*
 * Dynamic Island geometry, in iPhone points (iPhone 15 Pro / 16: 393 × 852).
 * The island is anchored 11pt from the top and centred; it only ever grows
 * around the sensor housing, which stays put: the pill at rest is the
 * hardware's footprint, so every presentation keeps content clear of it.
 */

export const ISLAND_TOP = 11

/** The resting pill, and the region content must avoid in every presentation. */
export const SENSOR = { width: 126, height: 37 } as const

/** The front camera: its centre is this far right of the island's centre. */
export const LENS = { offset: 44, size: 12 } as const

export type IslandKind = 'idle' | 'faceid' | 'compact' | 'expanded' | 'alert'

export const ISLAND_SIZE: Record<IslandKind, { width: number; height: number; radius: number }> = {
  idle: { width: SENSOR.width, height: SENSOR.height, radius: SENSOR.height / 2 },
  /** Face ID's square, as the system draws it for any app */
  faceid: { width: 136, height: 136, radius: 46 },
  /** Leading and trailing views either side of the sensor; narrow enough to keep the time and battery */
  compact: { width: 214, height: SENSOR.height, radius: SENSOR.height / 2 },
  /** Full width less 11pt each side; HIG caps the height at 160 */
  expanded: { width: 371, height: 148, radius: 44 },
  /** The system's own alert size (AirPods, Apple Pay): shorter than expanded */
  alert: { width: 371, height: 112, radius: 40 },
}

/** The minimal presentation: a separate bubble, when another activity holds the island. */
export const MINIMAL_SIZE = SENSOR.height

/*
 * Motion. The island is a spring, never a curve: it grows with a visible
 * overshoot and settles back with less, like the system's. Content never
 * scales with the shape: it's laid out at its final size, clipped by the
 * growing island, and fades in with a blur once the shape is under way.
 */
export const ISLAND_MOTION = {
  grow: { type: 'spring', visualDuration: 0.45, bounce: 0.32 } satisfies Transition,
  shrink: { type: 'spring', visualDuration: 0.38, bounce: 0.16 } satisfies Transition,
  reduced: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } satisfies Transition,
  contentIn: { duration: 0.28, delay: 0.1, ease: [0.23, 1, 0.32, 1] } satisfies Transition,
  contentOut: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } satisfies Transition,
  /** Face ID's "no": the island shakes sideways, as the system's does */
  shake: { x: [0, -14, 12, -9, 6, -3, 0], transition: { duration: 0.55, delay: 0.12, ease: 'easeOut' } } satisfies TargetAndTransition,
}

/** Simulated timings for the island flow (ms): Face ID is quick, the chain isn't. */
export const ISLAND_TIMINGS = {
  flow: {
    /** One Face ID covers the approval… */
    approve: 900,
    /** …and the swap signature */
    sign: 1300,
    /** Submitted → confirmed: long enough to tap the island open */
    confirm: 6000,
    /** Face ID cancelled */
    reject: 1300,
  },
  /** The Face ID check holds before the island hands over to the activity */
  faceIdSuccess: 750,
  /** The shake plays out before the island goes back to rest */
  faceIdFailed: 1300,
  /** The success alert shows unprompted, then folds to compact… */
  alert: 3500,
  /** …which lingers with its check, then the activity ends */
  linger: 3000,
}

/** Pending progress: starts just under way, never claims done until the chain does. */
export const PROGRESS = { start: 0.12, cap: 0.92, still: 0.55 } as const
