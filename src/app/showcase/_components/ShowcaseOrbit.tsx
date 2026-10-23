'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, ChevronLeft, ChevronRight, Minimize2, Maximize2 } from 'lucide-react'
import { UniswapScope } from '@/components/uniswap'
import { cn } from '@/lib/utils'
import { SHOWCASES, type Showcase } from '../_lib/showcases'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  LAUNCH_PUSH,
  clamp,
  lerp,
  project,
  sceneMetrics,
  spherePoints,
  springStep,
  tilt,
  worldOffset,
  wrapAngle,
  type SceneMetrics,
  type Vec3,
} from './orbit'
import { PREVIEW_WIDTH, ShowcasePreview } from './previews'

/*
 * The /showcase index: live previews of each showcase orbiting a dotted
 * sphere, with the 2D details along the sides.
 *
 *   Overview  the ring drifts; hover a card to stop it and read its details,
 *             drag or scroll to spin it (with momentum)
 *   Focused   click a card (or ← →): the ring turns it to the front and the
 *             world slides in until it sits at its real size between the panels
 *   Launch    click the focused card (or Open): it pushes toward the viewer,
 *             then the page navigates
 *
 * One rAF loop owns the motion. React state holds only what the panels show
 * (current, focused); per-frame values live in a ref and are written straight
 * to the cards' style and the canvas. See orbit.ts for the geometry.
 */

const COUNT = SHOWCASES.length
const STEP = (Math.PI * 2) / COUNT

/** Overview drift, rad/s */
const AUTO_SPEED = 0.09
/** Entrance: the ring spins up and opens out from the sphere */
const INTRO_S = 1.4
const INTRO_SPIN = 1.6
/** Card push-through before navigating */
const LAUNCH_S = 0.42
/** Pointer travel before a press becomes a drag */
const DRAG_SLOP = 6

const ACCENT = '#ff37c7'

const sideColumn = cn(
  'contents',
  'lg:pointer-events-none lg:absolute lg:inset-y-0 lg:z-10 lg:flex lg:w-[300px] lg:flex-col lg:justify-between lg:gap-8 lg:overflow-hidden lg:p-10 xl:w-[340px]',
)

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const mod = (i: number, n: number) => ((i % n) + n) % n

/** The ring angle that brings card `i` to the front, nearest to `from` (so it turns the short way). */
function frontYaw(i: number, from: number) {
  const base = -i * STEP
  return base + Math.PI * 2 * Math.round((from - base) / (Math.PI * 2))
}

/** Which card is nearest the front at a given ring angle */
const frontIndex = (yaw: number) => mod(Math.round(-yaw / STEP), COUNT)

interface Motion {
  yaw: number
  yawVelocity: number
  /** Spring the ring to `yawTarget` instead of drifting */
  pinned: boolean
  yawTarget: number
  focus: number
  focusVelocity: number
  focusTarget: number
  /** Per card: how far it has lifted off the ring toward the camera (the focused one goes to 1) */
  lift: number[]
  liftVelocity: number[]
  intro: number
  launch: number
  launchHref: string | null
  navigated: boolean
  current: number
  focused: boolean
  hover: number
  reduced: boolean
  drag: {
    pointerId: number
    startX: number
    startYaw: number
    moved: boolean
    lastX: number
    lastT: number
    velocity: number
  } | null
  /** A drag just ended: swallow the click that follows it */
  suppressClick: boolean
  wheel: { acc: number; lastT: number; lastStep: number }
}

export function ShowcaseOrbit() {
  const router = useRouter()
  const [current, setCurrent] = React.useState(0)
  const [focused, setFocused] = React.useState(false)
  const [launching, setLaunching] = React.useState(false)

  const stageRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const metricsRef = React.useRef<SceneMetrics | null>(null)
  const motion = React.useRef<Motion>({
    yaw: -INTRO_SPIN * 0.7,
    yawVelocity: INTRO_SPIN,
    pinned: false,
    yawTarget: 0,
    focus: 0,
    focusVelocity: 0,
    focusTarget: 0,
    lift: SHOWCASES.map(() => 0),
    liftVelocity: SHOWCASES.map(() => 0),
    intro: 0,
    launch: 0,
    launchHref: null,
    navigated: false,
    current: 0,
    focused: false,
    hover: -1,
    reduced: false,
    drag: null,
    suppressClick: false,
    wheel: { acc: 0, lastT: 0, lastStep: 0 },
  })

  const api = React.useMemo(() => {
    const m = motion.current
    const show = (i: number) => {
      m.current = i
      setCurrent(i)
    }
    const focusOn = (i: number, from = m.yaw) => {
      m.focused = true
      m.pinned = true
      m.yawTarget = frontYaw(i, from)
      m.focusTarget = 1
      show(i)
      setFocused(true)
    }
    const unfocus = () => {
      m.focused = false
      m.pinned = false
      m.yawVelocity = 0
      m.focusTarget = 0
      setFocused(false)
    }
    const step = (dir: 1 | -1) => {
      const i = mod(m.current + dir, COUNT)
      if (!m.focused) return focusOn(i)
      // From the current target, so quick presses keep turning the same way
      m.yawTarget -= dir * STEP
      show(i)
    }
    const launch = (i: number) => {
      if (m.launchHref) return
      const { href } = SHOWCASES[i]
      if (m.reduced) return router.push(href)
      if (!m.focused || m.current !== i) focusOn(i)
      m.launchHref = href
      setLaunching(true)
    }
    /** Overview: turn a card to the front without zooming (list hover); focused: switch to it */
    const preview = (i: number) => {
      if (m.focused) return focusOn(i)
      m.pinned = true
      m.yawTarget = frontYaw(i, m.yaw)
      show(i)
    }
    const release = () => {
      if (m.focused) return
      m.pinned = false
      m.yawVelocity = 0
    }
    return { focusOn, unfocus, step, launch, preview, release, show }
  }, [router])

  React.useEffect(() => {
    SHOWCASES.forEach((s) => router.prefetch(s.href))
  }, [router])

  // Reduced motion: no drift or entrance, and focus changes land without travel
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      const m = motion.current
      m.reduced = query.matches
      if (m.reduced) {
        m.intro = 1
        m.yawVelocity = 0
      }
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  // The loop: physics, then cards and canvas
  React.useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!stage || !canvas || !ctx) return

    let dpr = 1
    const resize = () => {
      const { width, height } = stage.getBoundingClientRect()
      metricsRef.current = sceneMetrics(width, height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      stage.style.perspective = `${metricsRef.current.perspective}px`
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(stage)

    // Theme colors for the canvas, re-read when the site theme flips
    const colors = { fg: '#000', bg: '#fff' }
    const readColors = () => {
      const style = getComputedStyle(document.documentElement)
      colors.fg = style.getPropertyValue('--foreground').trim() || colors.fg
      colors.bg = style.getPropertyValue('--background').trim() || colors.bg
    }
    readColors()
    const themeObserver = new MutationObserver(readColors)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const dots = spherePoints(stage.clientWidth < 640 ? 520 : 820)
    const screen = {
      x: new Float32Array(dots.length),
      y: new Float32Array(dots.length),
      r: new Float32Array(dots.length),
      facing: new Float32Array(dots.length),
      spot: new Float32Array(dots.length),
    }
    const RING_DOTS = 200
    const ring = {
      x: new Float32Array(RING_DOTS),
      y: new Float32Array(RING_DOTS),
      r: new Float32Array(RING_DOTS),
      front: new Uint8Array(RING_DOTS),
    }

    // Below lg the page scrolls: skip drawing while the stage is off screen
    let visible = true
    const visibilityObserver = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    visibilityObserver.observe(stage)

    let raf = 0
    let last = performance.now()
    let elapsed = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const geo = metricsRef.current
      if (!geo) return
      const m = motion.current
      if (!m.reduced) elapsed += dt

      // Ring angle
      if (m.drag?.moved) {
        // Pointer owns it
      } else if (m.pinned) {
        if (m.reduced) [m.yaw, m.yawVelocity] = [m.yawTarget, 0]
        else [m.yaw, m.yawVelocity] = springStep(m.yaw, m.yawVelocity, m.yawTarget, dt, 70, 1)
      } else {
        const target = m.reduced || m.hover >= 0 ? 0 : AUTO_SPEED
        m.yawVelocity += (target - m.yawVelocity) * (1 - Math.exp(-dt * (m.intro < 1 ? 1.6 : 2.2)))
        m.yaw += m.yawVelocity * dt
      }

      // Zoom: the world dollies in, and the focused card lifts off the ring
      if (m.reduced) [m.focus, m.focusVelocity] = [m.focusTarget, 0]
      else [m.focus, m.focusVelocity] = springStep(m.focus, m.focusVelocity, m.focusTarget, dt, 90, 0.9)
      for (let i = 0; i < COUNT; i++) {
        const target = m.focused && i === m.current ? 1 : 0
        if (m.reduced) [m.lift[i], m.liftVelocity[i]] = [target, 0]
        else [m.lift[i], m.liftVelocity[i]] = springStep(m.lift[i], m.liftVelocity[i], target, dt, 110, 0.86)
      }

      m.intro = Math.min(1, m.intro + dt / INTRO_S)
      if (m.launchHref) {
        m.launch = Math.min(1, m.launch + dt / LAUNCH_S)
        if (m.launch >= 1 && !m.navigated) {
          m.navigated = true
          router.push(m.launchHref)
        }
      }

      // Overview: the card at the front (or under the pointer) is the one the panels describe
      if (!m.focused && !m.pinned) {
        const next = m.hover >= 0 ? m.hover : frontIndex(m.yaw)
        if (next !== m.current) {
          m.current = next
          setCurrent(next)
        }
      }

      if (!visible) return

      const intro = easeOutCubic(m.intro)
      const launch = easeInOutCubic(m.launch)
      const focus = m.focus
      const zoom = clamp(focus, 0, 1)
      const offset = worldOffset(geo, focus, launch)
      const orbit = geo.orbitRadius * lerp(0.5, 1, intro)

      // Cards
      let lit: Vec3 = { x: 0, y: 0, z: 1 }
      for (let i = 0; i < COUNT; i++) {
        const el = cardRefs.current[i]
        if (!el) continue
        const theta = m.yaw + i * STEP
        const p = tilt(orbit * Math.sin(theta), 0, orbit * Math.cos(theta), geo.pitch)
        // On the ring, blended toward the origin (pushed on launch) by its lift
        const lift = m.lift[i]
        const x = lerp(p.x + offset.x, 0, lift)
        const y = lerp(p.y + offset.y, 0, lift)
        const z = lerp(p.z + offset.z, launch * geo.perspective * LAUNCH_PUSH, lift)
        const isCurrent = i === m.current
        if (isCurrent) lit = { x: p.x, y: p.y, z: p.z }

        // Nearer is brighter; focus dims the others; entrance staggers them in
        const nearness = (Math.cos(theta) + 1) / 2
        const stagger = clamp((m.intro * INTRO_S - 0.1 - i * 0.07) / 0.5, 0, 1)
        let opacity = lerp(0.38, 1, nearness) * easeOutCubic(stagger)
        if (!isCurrent) opacity *= 1 - 0.93 * zoom - 0.07 * launch
        // Partially turned toward the ring's outside, so the sides read as a curve; square to the camera once lifted
        const turn = Math.sin(wrapAngle(theta)) * 0.5 * (1 - lift)

        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateY(${turn.toFixed(4)}rad) scale(${geo.cardScale})`
        el.style.opacity = opacity.toFixed(3)
        el.style.zIndex = String(Math.round(z + 100000))
        el.style.pointerEvents = opacity < 0.05 ? 'none' : ''
      }

      // Canvas: sphere and ring, layered between the cards behind it and those in front
      canvas.style.zIndex = String(Math.round(offset.z + 100000))
      canvas.style.opacity = String(1 - launch)
      ctx.setTransform(dpr, 0, 0, dpr, canvas.width / 2, canvas.height / 2)
      ctx.clearRect(-geo.width, -geo.height, geo.width * 2, geo.height * 2)

      const center = project(offset, geo.perspective)
      const radius = geo.sphereRadius * center.scale
      const dotSize = geo.sphereRadius * 0.0065

      // Light: from the sphere toward the current card, brighter when zoomed in
      // Raised above the card, so the lit patch shows over it rather than hiding behind it
      lit.y -= Math.hypot(lit.x, lit.z) * 0.9
      const litLength = Math.hypot(lit.x, lit.y, lit.z) || 1
      const lx = lit.x / litLength
      const ly = lit.y / litLength
      const lz = lit.z / litLength
      const spotStrength = lerp(0.6, 0.8, zoom) * intro

      const spin = m.yaw * 0.5 + elapsed * 0.03
      const cs = Math.cos(spin)
      const sn = Math.sin(spin)
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        const n = tilt(d.x * cs + d.z * sn, d.y, d.z * cs - d.x * sn, geo.pitch)
        const s = project(
          {
            x: n.x * geo.sphereRadius + offset.x,
            y: n.y * geo.sphereRadius + offset.y,
            z: n.z * geo.sphereRadius + offset.z,
          },
          geo.perspective,
        )
        screen.x[i] = s.x
        screen.y[i] = s.y
        screen.r[i] = dotSize * s.scale
        screen.facing[i] = n.z
        screen.spot[i] = Math.max(0, n.x * lx + n.y * ly + n.z * lz) ** 14 * spotStrength
      }
      for (let i = 0; i < RING_DOTS; i++) {
        const a = m.yaw + (i / RING_DOTS) * Math.PI * 2
        const p = tilt(orbit * Math.sin(a), 0, orbit * Math.cos(a), geo.pitch)
        const s = project({ x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z }, geo.perspective)
        ring.x[i] = s.x
        ring.y[i] = s.y
        ring.r[i] = dotSize * 0.8 * s.scale
        ring.front[i] = Math.cos(a) > 0 ? 1 : 0
      }

      const ringAlpha = (1 - 0.75 * zoom) * intro
      const drawRing = (front: 0 | 1, alpha: number) => {
        ctx.fillStyle = colors.fg
        ctx.globalAlpha = alpha * ringAlpha
        ctx.beginPath()
        for (let i = 0; i < RING_DOTS; i++) {
          if (ring.front[i] !== front) continue
          ctx.moveTo(ring.x[i] + ring.r[i], ring.y[i])
          ctx.arc(ring.x[i], ring.y[i], ring.r[i], 0, Math.PI * 2)
        }
        ctx.fill()
      }

      // Halo
      const halo = ctx.createRadialGradient(center.x, center.y, radius * 0.6, center.x, center.y, radius * 2.4)
      halo.addColorStop(0, colors.fg)
      halo.addColorStop(1, 'transparent')
      ctx.globalAlpha = 0.045 * intro
      ctx.fillStyle = halo
      ctx.fillRect(center.x - radius * 2.4, center.y - radius * 2.4, radius * 4.8, radius * 4.8)

      drawRing(0, 0.16)

      // Far hemisphere, seen faintly through the body
      ctx.fillStyle = colors.fg
      ctx.globalAlpha = 0.16 * intro
      ctx.beginPath()
      for (let i = 0; i < dots.length; i++) {
        if (screen.facing[i] >= 0) continue
        const r = screen.r[i] * 0.85
        ctx.moveTo(screen.x[i] + r, screen.y[i])
        ctx.arc(screen.x[i], screen.y[i], r, 0, Math.PI * 2)
      }
      ctx.fill()

      // Body: mostly opaque, so it hides the far side and the cards behind it
      ctx.globalAlpha = 0.86 * intro
      ctx.fillStyle = colors.bg
      ctx.beginPath()
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.1 * intro
      ctx.strokeStyle = colors.fg
      ctx.lineWidth = 1
      ctx.stroke()

      // Near hemisphere, brighter toward the viewer
      ctx.fillStyle = colors.fg
      for (const band of [0, 1, 2, 3]) {
        const lo = band / 4
        const hi = (band + 1) / 4
        ctx.globalAlpha = (0.16 + 0.5 * ((lo + hi) / 2) ** 1.3) * intro
        ctx.beginPath()
        for (let i = 0; i < dots.length; i++) {
          const f = screen.facing[i]
          if (f < lo || f >= hi || (band === 3 && f > 1)) continue
          ctx.moveTo(screen.x[i] + screen.r[i], screen.y[i])
          ctx.arc(screen.x[i], screen.y[i], screen.r[i], 0, Math.PI * 2)
        }
        ctx.fill()
      }

      // Spotlight facing the current card
      ctx.fillStyle = ACCENT
      for (let i = 0; i < dots.length; i++) {
        const spot = screen.spot[i]
        if (spot < 0.03 || screen.facing[i] < -0.1) continue
        ctx.globalAlpha = Math.min(1, spot * 1.1)
        const r = screen.r[i] * (1 + 0.5 * spot)
        ctx.beginPath()
        ctx.arc(screen.x[i], screen.y[i], r, 0, Math.PI * 2)
        ctx.fill()
      }

      drawRing(1, 0.3)
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      visibilityObserver.disconnect()
    }
  }, [router])

  // Keyboard: ← → browse (and zoom in), Enter opens or zooms, Esc zooms out
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const onStage = !target || target === document.body || target === stageRef.current
      const m = motion.current
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        api.step(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        api.step(-1)
      } else if (e.key === 'Escape' && m.focused) {
        api.unfocus()
      } else if ((e.key === 'Enter' || e.key === ' ') && onStage) {
        e.preventDefault()
        if (m.focused) api.launch(m.current)
        else api.focusOn(m.current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [api])

  /* Pointer: drag to spin, with momentum; focused, a release settles on the nearest card */

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || motion.current.launchHref !== null) return
    const m = motion.current
    m.drag = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startYaw: m.yaw,
      moved: false,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const m = motion.current
    const drag = m.drag
    const geo = metricsRef.current
    if (!drag || drag.pointerId !== e.pointerId || !geo) return
    const dx = e.clientX - drag.startX
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return
      drag.moved = true
      drag.startX = e.clientX
      drag.startYaw = m.yaw
      stageRef.current?.setPointerCapture(e.pointerId)
    }
    // A card at the front tracks the pointer
    const perPx = 1 / (geo.orbitRadius * project(worldOffset(geo, m.focus, 0), geo.perspective).scale * 1.15)
    const yaw = drag.startYaw + (e.clientX - drag.startX) * perPx
    const dt = Math.max(1, e.timeStamp - drag.lastT) / 1000
    drag.velocity = lerp(drag.velocity, (yaw - m.yaw) / dt, 0.6)
    drag.lastX = e.clientX
    drag.lastT = e.timeStamp
    m.yaw = yaw
  }

  const endDrag = (e: React.PointerEvent, cancelled = false) => {
    const m = motion.current
    const drag = m.drag
    if (!drag || drag.pointerId !== e.pointerId) return
    m.drag = null
    if (!drag.moved) return
    m.suppressClick = true
    setTimeout(() => (m.suppressClick = false), 0)
    // A pause before letting go means no flick
    const velocity = cancelled || e.timeStamp - drag.lastT > 80 ? 0 : clamp(drag.velocity, -8, 8)
    if (m.focused) {
      const landing = m.yaw + velocity * 0.2
      api.focusOn(frontIndex(landing), landing)
      m.yawVelocity = velocity
    } else {
      m.pinned = false
      m.yawVelocity = velocity
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    const geo = metricsRef.current
    // Compact layouts scroll the page instead
    if (!geo || geo.compact) return
    const m = motion.current
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (m.focused) {
      const w = m.wheel
      if (e.timeStamp - w.lastT > 200) w.acc = 0
      w.acc += delta
      w.lastT = e.timeStamp
      if (Math.abs(w.acc) > 40 && e.timeStamp - w.lastStep > 450) {
        api.step(w.acc > 0 ? 1 : -1)
        w.acc = 0
        w.lastStep = e.timeStamp
      }
    } else {
      m.pinned = false
      m.yawVelocity = clamp(m.yawVelocity - delta * 0.004, -4, 4)
    }
  }

  const onStageClick = (e: React.MouseEvent) => {
    const m = motion.current
    if (m.suppressClick) return
    if (m.focused && !(e.target as HTMLElement).closest('[data-orbit-card]')) api.unfocus()
  }

  const onCardClick = (i: number) => {
    const m = motion.current
    if (m.suppressClick) return
    if (m.focused && m.current === i) api.launch(i)
    else api.focusOn(i)
  }

  /** Plain clicks animate out first; modified clicks (new tab) keep the browser's behavior */
  const onLinkClick = (e: React.MouseEvent, i: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    api.launch(i)
  }

  const showcase = SHOWCASES[current]

  return (
    <main
      data-launching={launching || undefined}
      className="group/orbit relative isolate flex min-h-dvh flex-col overflow-x-clip lg:block lg:h-dvh lg:overflow-hidden"
    >
      {/* The 3D stage */}
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Showcase previews. Use the left and right arrow keys to browse, Enter to zoom in or open, Escape to zoom out."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e)}
        onPointerCancel={(e) => endDrag(e, true)}
        onWheel={onWheel}
        onClick={onStageClick}
        className={cn(
          'relative order-2 h-[min(62svh,540px)] min-h-[440px] w-full cursor-grab touch-pan-y overflow-hidden outline-none select-none active:cursor-grabbing',
          'group/stage lg:absolute lg:inset-0 lg:h-auto lg:min-h-0',
        )}
        style={{ perspectiveOrigin: '50% 50%' }}
      >
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
        {SHOWCASES.map((s, i) => (
          <OrbitCard
            key={s.id}
            ref={(el) => {
              cardRefs.current[i] = el
            }}
            showcase={s}
            index={i}
            current={i === current}
            focused={focused && i === current}
            onClick={() => onCardClick(i)}
            onPointerEnter={(e) => {
              if (e.pointerType !== 'mouse') return
              const m = motion.current
              m.hover = i
              if (!m.focused && !m.pinned) api.show(i)
            }}
            onPointerLeave={() => {
              motion.current.hover = -1
            }}
          />
        ))}
      </div>

      {/*
        Side columns: on desktop, flex columns over the stage (intro over the
        current showcase on the left; index over its details on the right).
        Below lg they're display: contents, so their blocks stack around the
        stage in `order`.
      */}
      <div className={cn(sideColumn, 'lg:left-0')}>
        <header className="orbit-panel pointer-events-none order-1 px-4 lg:order-none pt-20 sm:px-6 lg:p-0">
          <p className="text-xs tracking-wide text-muted-foreground">Showcase</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] font-medium tracking-tight text-balance">
            Interfaces, taken apart
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Design engineering recreations of Uniswap interfaces. Each one is the live component plus a canvas of its
            parts and states.
          </p>
        </header>

        {/* Current showcase: bottom left */}
        <section className="orbit-panel pointer-events-none order-3 px-4 pt-6 sm:px-6 lg:order-none lg:p-0">
          <div className="flex items-center justify-between gap-3">
            <p key={showcase.id} className="showcase-text-in text-xs tracking-wide text-muted-foreground tabular-nums">
              {String(current + 1).padStart(2, '0')} / {String(COUNT).padStart(2, '0')} · {showcase.kind}
            </p>
            <div className="pointer-events-auto flex items-center gap-1">
              <IconButton label="Previous showcase" onClick={() => api.step(-1)}>
                <ChevronLeft aria-hidden className="size-4" />
              </IconButton>
              <IconButton label="Next showcase" onClick={() => api.step(1)}>
                <ChevronRight aria-hidden className="size-4" />
              </IconButton>
            </div>
          </div>
          <div key={showcase.id} aria-live={focused ? 'polite' : 'off'} className="flex flex-col">
            <h2 className="showcase-text-in mt-1 font-serif text-4xl leading-tight font-medium tracking-tight [animation-delay:30ms]">
              {showcase.title}
            </h2>
            <p className="showcase-text-in mt-2 text-sm leading-relaxed text-muted-foreground [animation-delay:60ms]">
              {showcase.description}
            </p>
          </div>
          <div className="pointer-events-auto mt-5 flex items-center gap-2">
            <Link
              href={showcase.href}
              onClick={(e) => onLinkClick(e, current)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-foreground pr-3 pl-4 text-sm font-medium whitespace-nowrap text-background transition-[opacity,scale] duration-150 ease-out hover:opacity-85 active:scale-[0.97]"
            >
              Open showcase
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => (focused ? api.unfocus() : api.focusOn(current))}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 text-sm whitespace-nowrap transition-[background-color,scale] duration-150 ease-out hover:bg-muted active:scale-[0.97]"
            >
              {focused ? (
                <Minimize2 aria-hidden className="size-3.5" />
              ) : (
                <Maximize2 aria-hidden className="size-3.5" />
              )}
              {focused ? 'Zoom out' : 'Zoom in'}
            </button>
          </div>
        </section>
      </div>

      <div className={cn(sideColumn, 'lg:right-0 lg:pb-24')}>
        <nav
          aria-label="All showcases"
          className="orbit-panel pointer-events-auto order-5 px-4 pt-10 sm:px-6 lg:order-none lg:p-0"
          onPointerLeave={api.release}
        >
          <p className="text-xs tracking-wide text-muted-foreground">Index</p>
          <ol
            className="mt-3 flex flex-col border-t border-border"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) api.release()
            }}
          >
            {SHOWCASES.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={s.href}
                  onClick={(e) => onLinkClick(e, i)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && api.preview(i)}
                  onFocus={() => api.preview(i)}
                  aria-current={i === current ? 'true' : undefined}
                  className="group/row flex items-baseline gap-3 border-b border-border py-2.5 text-sm hover:opacity-100"
                >
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="relative">
                    {s.title}
                    <span
                      aria-hidden
                      className="absolute top-1/2 -left-3 size-1 -translate-y-1/2 rounded-full bg-foreground opacity-0 transition-opacity duration-200 group-aria-[current=true]/row:opacity-100"
                    />
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{s.kind}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <aside
          aria-label={`${showcase.title} details`}
          className="orbit-panel pointer-events-none order-4 px-4 lg:order-none pt-8 sm:px-6 lg:p-0"
        >
          <ShowcaseDetails key={showcase.id} showcase={showcase} />
        </aside>
      </div>

      <footer className="orbit-panel order-6 px-4 pt-10 pb-24 text-xs text-muted-foreground sm:px-6 lg:hidden">
        Non-commercial recreations, not affiliated with or endorsed by Uniswap Labs.
      </footer>
    </main>
  )
}

function ShowcaseDetails({ showcase }: { showcase: Showcase }) {
  const rows = [
    {
      label: showcase.count.label[0].toUpperCase() + showcase.count.label.slice(1),
      value: String(showcase.count.value),
    },
    { label: 'Views', value: showcase.views.join(' · ') },
    { label: 'Built with', value: showcase.stack.join(' · ') },
  ]
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map((row, i) => (
          <React.Fragment key={row.label}>
            <dt className="showcase-text-in text-muted-foreground" style={{ animationDelay: `${i * 30}ms` }}>
              {row.label}
            </dt>
            <dd className="showcase-text-in tabular-nums" style={{ animationDelay: `${i * 30}ms` }}>
              {row.value}
            </dd>
          </React.Fragment>
        ))}
      </dl>
      <ul className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm text-muted-foreground lg:[@media(max-height:860px)]:hidden">
        {showcase.highlights.map((h, i) => (
          <li key={h} className="showcase-text-in flex gap-2.5" style={{ animationDelay: `${90 + i * 30}ms` }}>
            <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-muted-foreground/60" />
            {h}
          </li>
        ))}
      </ul>
      <p className="hidden text-xs text-muted-foreground lg:block">
        <Kbd>←</Kbd> <Kbd>→</Kbd> browse · <Kbd>↵</Kbd> open · <Kbd>esc</Kbd> zoom out
      </p>
      <p className="hidden text-xs text-muted-foreground/70 lg:block lg:[@media(max-height:720px)]:hidden">
        Non-commercial recreations, not affiliated with or endorsed by Uniswap Labs.
      </p>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border px-1 font-sans text-[11px] text-foreground">
      {children}
    </kbd>
  )
}

function IconButton({ label, children, ...props }: React.ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border transition-[background-color,scale] duration-150 ease-out hover:bg-muted active:scale-[0.95]"
      {...props}
    >
      {children}
    </button>
  )
}

interface OrbitCardProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  showcase: Showcase
  index: number
  /** Plays through its states */
  current: boolean
  /** Zoomed in: a click opens it */
  focused: boolean
}

/**
 * A card on the ring. Positioned every frame by the loop (transform, opacity,
 * z-index); decorative for assistive tech, which gets the index links instead.
 */
const OrbitCard = React.forwardRef<HTMLDivElement, OrbitCardProps>(function OrbitCard(
  { showcase, index, current, focused, className, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-orbit-card=""
      aria-hidden
      className={cn('absolute top-1/2 left-1/2 opacity-0', className)}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginLeft: -CARD_WIDTH / 2,
        marginTop: -CARD_HEIGHT / 2,
        ...style,
      }}
      {...props}
    >
      <div
        data-focused={focused || undefined}
        className={cn(
          'group/card relative flex size-full cursor-zoom-in flex-col rounded-[28px] border border-border bg-card p-1.5',
          'shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_64px_-24px_rgb(0_0_0/0.28)] dark:shadow-[0_24px_64px_-24px_rgb(0_0_0/0.8)]',
          'transition-[scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] data-[focused]:cursor-pointer',
          // Keyboard focus on the stage shows on the card it acts on
          current && 'outline-offset-4 outline-ring group-focus-visible/stage:outline-2',
          '[@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02]',
        )}
      >
        <ShowcasePreview
          id={showcase.id}
          playing={current}
          frame={(state, body) => (
            <>
              <div className="flex h-10 shrink-0 items-center justify-between gap-3 px-3.5 text-xs">
                <span className="flex items-center gap-2.5">
                  <span className="text-muted-foreground tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <span className="font-medium">{showcase.title}</span>
                </span>
                <span key={state} className="showcase-text-in flex items-center gap-1.5 truncate text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn('size-1.5 rounded-full bg-muted-foreground/40', current && 'bg-[#ff37c7]')}
                  />
                  {state}
                </span>
              </div>
              <UniswapScope
                inert
                className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[22px] border border-surface3 bg-surface1"
              >
                <div style={{ width: PREVIEW_WIDTH }}>{body}</div>
              </UniswapScope>
            </>
          )}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 translate-y-1 items-center gap-1 rounded-full bg-foreground py-1.5 pr-2.5 pl-3 text-xs font-medium text-background opacity-0',
            'transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
            'group-data-[focused]/card:group-hover/card:translate-y-0 group-data-[focused]/card:group-hover/card:opacity-100',
          )}
        >
          Open showcase
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </div>
  )
})
