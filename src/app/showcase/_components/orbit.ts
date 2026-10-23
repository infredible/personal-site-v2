/*
 * Geometry for the showcase orbit: a dotted sphere with cards on a tilted ring
 * around it, seen through a CSS-style perspective camera.
 *
 * Space is CSS's: x right, y down, z toward the viewer, in px. The stage has
 * `perspective: P` with its origin at the center, so a point at camera-space
 * (x, y, z) lands at center + (x, y) · P / (P − z). Cards get that projection
 * from the browser (translate3d inside the perspective stage); the canvas
 * sphere uses project() to match them exactly.
 *
 * The camera never moves: the world is offset instead. Overview puts the
 * sphere's center at (0, 0, −D); focusing slides the world most of the way to
 * the front card (WORLD_DOLLY), and the card lifts off the ring for the rest,
 * to the origin, where it renders at its own size (crisp text).
 */

export const CARD_WIDTH = 440
export const CARD_HEIGHT = 560

/** Desktop side panels, by breakpoint (lg, xl): the focused card must fit between them */
const PANEL_WIDTH = { lg: 300, xl: 340 }

/** How large a card at the sphere's depth is, relative to focused (overview zoom) */
const CENTER_SCALE = 0.38

export interface SceneMetrics {
  width: number
  height: number
  compact: boolean
  /** CSS perspective, px */
  perspective: number
  /** Overview distance from the camera plane to the sphere's center */
  distance: number
  sphereRadius: number
  orbitRadius: number
  /** Ring tilt: positive drops the front of the ring toward the viewer */
  pitch: number
  /** The card's CSS scale, so a focused card fits the space it's given */
  cardScale: number
}

export function sceneMetrics(width: number, height: number): SceneMetrics {
  const compact = width < 1024
  const panel = width >= 1280 ? PANEL_WIDTH.xl : PANEL_WIDTH.lg
  const cardScale = compact
    ? Math.min(1, (width - 32) / CARD_WIDTH, (height - 48) / CARD_HEIGHT)
    : Math.min(1, (width - 2 * panel - 48) / CARD_WIDTH, (height - 176) / CARD_HEIGHT)

  // On screen, the sphere is sized to the viewport; in the world it's larger by the overview zoom
  const screenRadius = compact ? Math.min(width * 0.3, height * 0.24) : Math.min(height * 0.21, width * 0.125)
  const sphereRadius = screenRadius / CENTER_SCALE
  const perspective = sphereRadius * 3.2
  return {
    width,
    height,
    compact,
    perspective,
    distance: perspective * (1 / CENTER_SCALE - 1),
    sphereRadius,
    orbitRadius: sphereRadius * (compact ? 1.6 : 1.85),
    pitch: 0.2,
    cardScale: Math.max(cardScale, 0.3),
  }
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Ring tilt: rotates about x so the near side (z > 0) drops (y > 0). */
export function tilt(x: number, y: number, z: number, pitch: number): Vec3 {
  const c = Math.cos(pitch)
  const s = Math.sin(pitch)
  return { x, y: y * c + z * s, z: z * c - y * s }
}

/** Screen position (relative to the stage center) and scale of a camera-space point */
export function project(p: Vec3, perspective: number) {
  const scale = perspective / Math.max(perspective - p.z, 1)
  return { x: p.x * scale, y: p.y * scale, scale }
}

/** How far focusing moves the world toward the front card (1 would put it at the origin) */
export const WORLD_DOLLY = 0.72

/** How far a launch pushes toward the viewer, as a fraction of the perspective */
export const LAUNCH_PUSH = 0.3

/**
 * The world offset: where the sphere's center is in camera space. `focus`
 * dollies in toward the front of the ring; `launch` pushes everything toward
 * the viewer on the way to a showcase's page.
 */
export function worldOffset(m: SceneMetrics, focus: number, launch: number): Vec3 {
  const front = tilt(0, 0, m.orbitRadius, m.pitch)
  const t = focus * WORLD_DOLLY
  return { x: 0, y: lerp(0, -front.y, t), z: lerp(-m.distance, -front.z, t) + launch * m.perspective * LAUNCH_PUSH }
}

/** Evenly spread unit vectors (Fibonacci lattice) */
export function spherePoints(count: number): Vec3[] {
  const points: Vec3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count
    const r = Math.sqrt(1 - y * y)
    const a = i * golden
    points.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r })
  }
  return points
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Wraps an angle to (−π, π] */
export function wrapAngle(a: number) {
  const tau = Math.PI * 2
  return a - tau * Math.floor((a + Math.PI) / tau)
}

/**
 * One step of a damped spring toward `target` (semi-implicit Euler, substepped
 * so a long frame can't blow it up). Returns the new [value, velocity].
 */
export function springStep(
  value: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness: number,
  dampingRatio = 1,
): [number, number] {
  const damping = 2 * Math.sqrt(stiffness) * dampingRatio
  const steps = Math.ceil(dt / (1 / 120))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    velocity += (stiffness * (target - value) - damping * velocity) * h
    value += velocity * h
  }
  // Land exactly once it's imperceptibly close, so the settled card is pixel-aligned
  if (Math.abs(target - value) < 1e-4 && Math.abs(velocity) < 1e-3) return [target, 0]
  return [value, velocity]
}
