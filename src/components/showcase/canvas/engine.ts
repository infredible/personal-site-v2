/**
 * Framework-free pan/zoom engine behind <Canvas>. It owns the transform, the
 * DOM listeners and the rAF loop, so pans and zooms never re-render React
 * children. React only hears about `{ zoom, mode }` through `subscribe`.
 */

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

/** Figma-style zoom in/out steps (powers of two), clamped to MIN/MAX. */
const ZOOM_STEPS = [MIN_ZOOM, 0.125, 0.25, 0.5, 1, 2, 4]

/** Board units between grid dots at 100%. */
const GRID = 24
/** Screen px of content that must stay visible when panning. */
const KEEP_VISIBLE = 64
/** Wheel events closer together than this belong to the same gesture. */
const WHEEL_GESTURE_MS = 160
const ANIMATION_MS = 260

export type CanvasMode = "unbound" | "canvas" | "list"

export interface CanvasSnapshot {
  /** 1 = 100% */
  zoom: number
  /** "canvas" = pan/zoom board, "list" = narrow-screen stacked fallback, "unbound" = no <Canvas> mounted */
  mode: CanvasMode
}

export interface ZoomOptions {
  /** Animate the change (ignored under prefers-reduced-motion). Default true. */
  animate?: boolean
}

interface Transform {
  x: number
  y: number
  z: number
}

interface Animation {
  from: Transform
  to: Transform
  start: number
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const clampZoom = (z: number) => clamp(z, MIN_ZOOM, MAX_ZOOM)
const mod = (a: number, n: number) => ((a % n) + n) % n
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)

export function nextZoomStep(z: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find((s) => s > z * 1.001) ?? MAX_ZOOM
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) if (ZOOM_STEPS[i] < z * 0.999) return ZOOM_STEPS[i]
  return MIN_ZOOM
}

function isEditable(el: EventTarget | Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Selector marking live frame content: pointer-downs here never start a pan (unless Space is held). */
export const FRAME_BODY_SELECTOR = "[data-canvas-frame-body]"

type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number }

export class CanvasEngine {
  readonly minZoom = MIN_ZOOM
  readonly maxZoom = MAX_ZOOM
  fitPadding = 64
  /** Section or frame id to open on when the URL has no #hash (instead of fitting everything). */
  initialFocus: string | undefined = undefined

  private t: Transform = { x: 0, y: 0, z: 1 }
  private mode: CanvasMode = "unbound"
  private snapshot: CanvasSnapshot = { zoom: 1, mode: "unbound" }
  private listeners = new Set<() => void>()

  private viewport: HTMLElement | null = null
  private board: HTMLElement | null = null
  private cleanup: (() => void) | null = null
  private resizeObserver: ResizeObserver | null = null

  private content = { w: 0, h: 0 }
  /** True until the user pans/zooms: resizes and late layout (fonts) re-fit. */
  private autoFit = true
  private hashHandled = false
  private listGuardCleanup: (() => void) | null = null

  private raf = 0
  private anim: Animation | null = null
  private animRaf = 0
  private willChangeTimer: ReturnType<typeof setTimeout> | undefined

  private pointers = new Map<number, { x: number; y: number }>()
  private hovered = false
  private spaceDown = false
  private pannedDuringSpace = false
  private wheelGesture = { t: 0, native: false }
  private gestureStartZ: number | null = null

  // ---------------------------------------------------------------------------
  // External store
  // ---------------------------------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  get zoom() {
    return this.t.z
  }

  /** Where the zoom is heading (so repeated clicks during an animation keep stepping). */
  private targetZoom() {
    return this.anim ? this.anim.to.z : this.t.z
  }

  get currentMode() {
    return this.mode
  }

  private updateSnapshot() {
    if (this.snapshot.zoom === this.t.z && this.snapshot.mode === this.mode) return
    this.snapshot = { zoom: this.t.z, mode: this.mode }
    this.listeners.forEach((l) => l())
  }

  // ---------------------------------------------------------------------------
  // Public commands
  // ---------------------------------------------------------------------------

  zoomIn = (opts?: ZoomOptions) => this.zoomTo(nextZoomStep(this.targetZoom(), 1), opts)
  zoomOut = (opts?: ZoomOptions) => this.zoomTo(nextZoomStep(this.targetZoom(), -1), opts)
  reset = (opts?: ZoomOptions) => this.zoomTo(1, opts)

  /** Zoom to `z` around the viewport center. */
  zoomTo = (z: number, opts?: ZoomOptions) => {
    const { vw, vh } = this.viewportSize()
    this.autoFit = false
    this.zoomAt(z, vw / 2, vh / 2, opts?.animate ?? true)
  }

  /** Fit all content with padding; never zooms above 100%. */
  fit = (opts?: ZoomOptions) => {
    if (this.mode !== "canvas") return
    this.measure()
    const target = this.fitRect(0, 0, this.content.w, this.content.h)
    if (!target) return
    this.autoFit = true
    this.setTransform(target, opts?.animate ?? true)
  }

  /** Pan/zoom so the element with this DOM id (a section or frame) is in view. */
  reveal = (id: string, opts?: ZoomOptions): boolean => {
    const board = this.board
    if (!board || this.mode !== "canvas") return false
    this.absorbScroll()
    const el = board.querySelector(`#${CSS.escape(id)}`)
    if (!el) return false
    const r = el.getBoundingClientRect()
    const b = board.getBoundingClientRect()
    const { z } = this.t
    const target = this.fitRect((r.left - b.left) / z, (r.top - b.top) / z, r.width / z, r.height / z)
    if (!target) return false
    this.autoFit = false
    this.setTransform(target, opts?.animate ?? true)
    return true
  }

  // ---------------------------------------------------------------------------
  // Binding (called by <Canvas>)
  // ---------------------------------------------------------------------------

  attach(viewport: HTMLElement, board: HTMLElement) {
    this.detach()
    this.viewport = viewport
    this.board = board

    const opts = { passive: false } as const
    viewport.addEventListener("pointerdown", this.onPointerDown)
    viewport.addEventListener("pointermove", this.onPointerMove)
    viewport.addEventListener("pointerup", this.onPointerUp)
    viewport.addEventListener("pointercancel", this.onPointerUp)
    viewport.addEventListener("lostpointercapture", this.onPointerUp)
    viewport.addEventListener("pointerenter", this.onPointerEnter)
    viewport.addEventListener("pointerleave", this.onPointerLeave)
    viewport.addEventListener("mousedown", this.onMouseDown)
    viewport.addEventListener("wheel", this.onWheel, opts)
    viewport.addEventListener("gesturestart", this.onGestureStart as EventListener, opts)
    viewport.addEventListener("gesturechange", this.onGestureChange as EventListener, opts)
    viewport.addEventListener("gestureend", this.onGestureEnd as EventListener, opts)
    viewport.addEventListener("scroll", this.onScroll)
    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("keyup", this.onKeyUp)
    window.addEventListener("blur", this.onBlur)
    window.addEventListener("hashchange", this.onHashChange)

    const ro = new ResizeObserver(this.onResize)
    ro.observe(viewport)
    ro.observe(board)
    this.resizeObserver = ro

    this.cleanup = () => {
      viewport.removeEventListener("pointerdown", this.onPointerDown)
      viewport.removeEventListener("pointermove", this.onPointerMove)
      viewport.removeEventListener("pointerup", this.onPointerUp)
      viewport.removeEventListener("pointercancel", this.onPointerUp)
      viewport.removeEventListener("lostpointercapture", this.onPointerUp)
      viewport.removeEventListener("pointerenter", this.onPointerEnter)
      viewport.removeEventListener("pointerleave", this.onPointerLeave)
      viewport.removeEventListener("mousedown", this.onMouseDown)
      viewport.removeEventListener("wheel", this.onWheel)
      viewport.removeEventListener("gesturestart", this.onGestureStart as EventListener)
      viewport.removeEventListener("gesturechange", this.onGestureChange as EventListener)
      viewport.removeEventListener("gestureend", this.onGestureEnd as EventListener)
      viewport.removeEventListener("scroll", this.onScroll)
      window.removeEventListener("keydown", this.onKeyDown)
      window.removeEventListener("keyup", this.onKeyUp)
      window.removeEventListener("blur", this.onBlur)
      window.removeEventListener("hashchange", this.onHashChange)
      ro.disconnect()
    }
  }

  detach() {
    this.listGuardCleanup?.()
    this.listGuardCleanup = null
    this.cleanup?.()
    this.cleanup = null
    this.resizeObserver = null
    this.cancelAnimation()
    cancelAnimationFrame(this.raf)
    this.raf = 0
    clearTimeout(this.willChangeTimer)
    this.pointers.clear()
    this.endSpace()
    this.viewport = null
    this.board = null
    this.mode = "unbound"
    this.hashHandled = false
    this.updateSnapshot()
  }

  setMode(mode: "canvas" | "list") {
    const { viewport, board } = this
    if (!viewport || !board) return
    const prev = this.mode
    this.mode = mode
    this.listGuardCleanup?.()
    this.listGuardCleanup = null
    if (mode === "list") {
      this.listGuardCleanup = this.guardListScroll(viewport)
      this.cancelAnimation()
      board.style.transform = ""
      board.style.willChange = ""
      viewport.style.backgroundSize = ""
      viewport.style.backgroundPosition = ""
      this.pointers.clear()
      this.endSpace()
      delete viewport.dataset.panning
    } else if (prev !== "canvas") {
      viewport.scrollTop = 0
      viewport.scrollLeft = 0
      this.measure()
      if (this.autoFit) this.fit({ animate: false })
      this.applyNow()
      if (!this.hashHandled) {
        this.hashHandled = true
        const id = decodeURIComponent(window.location.hash.slice(1)) || this.initialFocus
        if (id) this.reveal(id, { animate: false })
      }
    }
    board.dataset.ready = ""
    this.updateSnapshot()
  }

  // ---------------------------------------------------------------------------
  // Transform plumbing
  // ---------------------------------------------------------------------------

  private viewportSize() {
    return { vw: this.viewport?.clientWidth ?? 0, vh: this.viewport?.clientHeight ?? 0 }
  }

  private measure() {
    const b = this.board
    if (!b) return
    // scrollWidth/Height include frames that overflow a wrapping row.
    this.content = { w: Math.max(b.offsetWidth, b.scrollWidth), h: Math.max(b.offsetHeight, b.scrollHeight) }
  }

  /** Transform that fits a board-space rect into the viewport (max 100%), centered. */
  private fitRect(x: number, y: number, w: number, h: number): Transform | null {
    const { vw, vh } = this.viewportSize()
    if (!vw || !vh || !w || !h) return null
    const pad = Math.min(this.fitPadding, vw * 0.08, vh * 0.08)
    const z = clampZoom(Math.min((vw - 2 * pad) / w, (vh - 2 * pad) / h, 1))
    const tx = w * z <= vw - 2 * pad ? (vw - w * z) / 2 : pad
    const ty = h * z <= vh - 2 * pad ? (vh - h * z) / 2 : pad
    return { x: tx - x * z, y: ty - y * z, z }
  }

  /** Keep at least KEEP_VISIBLE px of content on screen. */
  private constrain(t: Transform): Transform {
    const { vw, vh } = this.viewportSize()
    const { w, h } = this.content
    if (!vw || !vh || !w || !h) return t
    const mx = Math.min(KEEP_VISIBLE, vw / 2)
    const my = Math.min(KEEP_VISIBLE, vh / 2)
    return {
      z: t.z,
      x: clamp(t.x, mx - w * t.z, vw - mx),
      y: clamp(t.y, my - h * t.z, vh - my),
    }
  }

  private setTransform(next: Transform, animate: boolean) {
    const to = this.constrain({ ...next, z: clampZoom(next.z) })
    this.cancelAnimation()
    if (animate && !prefersReducedMotion() && this.mode === "canvas") {
      this.anim = { from: { ...this.t }, to, start: performance.now() }
      this.animRaf = requestAnimationFrame(this.stepAnimation)
    } else {
      this.t = to
      this.schedule()
    }
  }

  private stepAnimation = (now: number) => {
    const a = this.anim
    if (!a) return
    const p = Math.min(1, (now - a.start) / ANIMATION_MS)
    const e = easeOut(p)
    const { from, to } = a
    const z = from.z * Math.pow(to.z / from.z, e)
    // Interpolate around each axis' fixed point so zooms don't swing sideways.
    const axis = (f: number, t: number) => {
      if (Math.abs(to.z - from.z) < 1e-6) return f + (t - f) * e
      const p0 = (f - t) / (to.z - from.z) // board coordinate that stays put
      const s = f + p0 * from.z
      return s - p0 * z
    }
    this.t = { x: axis(from.x, to.x), y: axis(from.y, to.y), z }
    if (p >= 1) {
      this.t = to
      this.anim = null
    } else {
      this.animRaf = requestAnimationFrame(this.stepAnimation)
    }
    this.applyNow()
  }

  private cancelAnimation() {
    if (this.anim) cancelAnimationFrame(this.animRaf)
    this.anim = null
  }

  private zoomAt(z: number, sx: number, sy: number, animate = false) {
    const { x, y, z: z0 } = this.anim ? this.anim.to : this.t
    const z1 = clampZoom(z)
    const px = (sx - x) / z0
    const py = (sy - y) / z0
    this.setTransform({ x: sx - px * z1, y: sy - py * z1, z: z1 }, animate)
  }

  private panBy(dx: number, dy: number) {
    this.cancelAnimation()
    this.autoFit = false
    this.t = this.constrain({ x: this.t.x + dx, y: this.t.y + dy, z: this.t.z })
    this.schedule()
  }

  private schedule() {
    if (!this.raf) this.raf = requestAnimationFrame(() => this.applyNow())
  }

  private applyNow() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    const { viewport, board } = this
    if (!viewport || !board || this.mode !== "canvas") return
    const { x, y, z } = this.t
    board.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${z})`

    // Dot grid follows the board. Keep the on-screen spacing between 12 and 48px.
    let s = GRID * z
    while (s < 12) s *= 2
    while (s > 48) s /= 2
    viewport.style.backgroundSize = `${s}px ${s}px`
    viewport.style.backgroundPosition = `${mod(Math.round(x), s)}px ${mod(Math.round(y), s)}px`

    // Promote only while moving: a permanent will-change keeps text rasterized
    // at the old scale (blurry) after zooming in.
    board.style.willChange = "transform"
    clearTimeout(this.willChangeTimer)
    this.willChangeTimer = setTimeout(() => {
      if (this.board) this.board.style.willChange = ""
    }, 180)

    this.updateSnapshot()
  }

  private toLocal(clientX: number, clientY: number) {
    const r = this.viewport!.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  private onResize = () => {
    if (this.mode !== "canvas") return
    this.measure()
    if (this.autoFit && !this.anim) this.fit({ animate: false })
    else this.schedule()
  }

  /**
   * Focus and anchor navigation can scroll the overflow:hidden viewport. Undo
   * the scroll and turn it into a pan instead (ignored while an animation such
   * as reveal() is in charge).
   */
  /**
   * List mode is a plain scroller, so content that scrolls itself into view on
   * mount (e.g. cmdk's selected item) would drag the whole list down. Until the
   * visitor interacts, undo those programmatic scrolls (unless a #hash asked
   * for a position).
   */
  private guardListScroll(viewport: HTMLElement) {
    if (window.location.hash) return null
    viewport.scrollTop = 0
    let userActive = false
    const markActive = () => {
      userActive = true
      stop()
    }
    const onScroll = () => {
      if (!userActive) viewport.scrollTop = 0
    }
    const events = ["pointerdown", "wheel", "touchstart", "keydown"] as const
    events.forEach((e) => viewport.addEventListener(e, markActive, { capture: true, passive: true }))
    viewport.addEventListener("scroll", onScroll, { passive: true })
    function stop() {
      events.forEach((e) => viewport.removeEventListener(e, markActive, { capture: true }))
      viewport.removeEventListener("scroll", onScroll)
    }
    return stop
  }

  private absorbScroll() {
    const vp = this.viewport
    if (!vp || this.mode !== "canvas") return false
    const { scrollLeft, scrollTop } = vp
    if (!scrollLeft && !scrollTop) return false
    vp.scrollLeft = 0
    vp.scrollTop = 0
    if (!this.anim) {
      this.autoFit = false
      this.t = this.constrain({ x: this.t.x - scrollLeft, y: this.t.y - scrollTop, z: this.t.z })
    }
    return true
  }

  private onScroll = () => {
    if (this.absorbScroll()) this.applyNow()
  }

  private onHashChange = () => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    // Next frame: let the browser's own anchor scroll (turned into a pan) land first.
    if (id) requestAnimationFrame(() => this.reveal(id))
  }

  private onPointerEnter = () => {
    this.hovered = true
  }

  private onPointerLeave = () => {
    this.hovered = false
  }

  /** Stop middle-click autoscroll. */
  private onMouseDown = (e: MouseEvent) => {
    if (this.mode === "canvas" && e.button === 1) e.preventDefault()
  }

  private onPointerDown = (e: PointerEvent) => {
    const vp = this.viewport
    if (!vp || this.mode !== "canvas") return
    const target = e.target as Element | null
    const onContent = !!target?.closest?.(FRAME_BODY_SELECTOR)

    if (e.pointerType === "touch") {
      if (onContent && !this.pointers.size) return
    } else {
      const pans = e.button === 1 || (e.button === 0 && (this.spaceDown || !onContent))
      if (!pans) return
    }

    e.preventDefault() // no text selection, no focus change on content
    if (!onContent) {
      vp.focus({ preventScroll: true })
      const sel = window.getSelection()
      if (sel && sel.anchorNode && vp.contains(sel.anchorNode)) sel.removeAllRanges()
    }
    this.cancelAnimation()
    try {
      vp.setPointerCapture(e.pointerId)
    } catch {
      // pointer already gone
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    vp.dataset.panning = ""
  }

  private onPointerMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId)
    if (!prev || !this.viewport) return
    const next = { x: e.clientX, y: e.clientY }

    if (this.pointers.size >= 2) {
      // Two-finger pinch + pan (touch screens).
      const others = [...this.pointers.entries()].filter(([id]) => id !== e.pointerId)
      const o = others[0][1]
      const d0 = Math.hypot(prev.x - o.x, prev.y - o.y)
      const d1 = Math.hypot(next.x - o.x, next.y - o.y)
      const m0 = this.toLocal((prev.x + o.x) / 2, (prev.y + o.y) / 2)
      const m1 = this.toLocal((next.x + o.x) / 2, (next.y + o.y) / 2)
      const { x, y, z } = this.t
      const z1 = clampZoom(d0 > 0 ? z * (d1 / d0) : z)
      const px = (m0.x - x) / z
      const py = (m0.y - y) / z
      this.autoFit = false
      this.t = this.constrain({ x: m1.x - px * z1, y: m1.y - py * z1, z: z1 })
      this.schedule()
    } else {
      const dx = next.x - prev.x
      const dy = next.y - prev.y
      if (dx || dy) {
        if (this.spaceDown) this.pannedDuringSpace = true
        this.panBy(dx, dy)
      }
    }
    this.pointers.set(e.pointerId, next)
  }

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointers.delete(e.pointerId)) return
    if (!this.pointers.size && this.viewport) delete this.viewport.dataset.panning
  }

  /** Is there an element between `target` and the viewport that can still scroll this way? */
  private canScrollNative(target: EventTarget | null, dx: number, dy: number) {
    const vertical = Math.abs(dy) >= Math.abs(dx)
    const delta = vertical ? dy : dx
    if (!delta) return false
    let el = target instanceof Element ? target : null
    while (el && el !== this.viewport) {
      if (el instanceof HTMLElement) {
        const style = getComputedStyle(el)
        const overflow = vertical ? style.overflowY : style.overflowX
        if (/(auto|scroll|overlay)/.test(overflow)) {
          const pos = vertical ? el.scrollTop : el.scrollLeft
          const max = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
          if (max > 1 && (delta > 0 ? pos < max - 1 : pos > 0)) return true
        }
      }
      el = el.parentElement
    }
    return false
  }

  private onWheel = (e: WheelEvent) => {
    const vp = this.viewport
    if (!vp || this.mode !== "canvas") return
    let dx = e.deltaX
    let dy = e.deltaY
    if (e.deltaMode === 1) {
      dx *= 16
      dy *= 16
    } else if (e.deltaMode === 2) {
      dx *= vp.clientWidth
      dy *= vp.clientHeight
    }

    // Pinch on trackpads arrives as ctrl+wheel; ctrl/cmd+wheel zooms too.
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (this.gestureStartZ !== null) return // Safari gesture events are handling it
      const p = this.toLocal(e.clientX, e.clientY)
      this.autoFit = false
      this.cancelAnimation()
      this.zoomAt(this.t.z * Math.exp(-clamp(dy, -30, 30) * 0.01), p.x, p.y)
      return
    }

    if (e.shiftKey && !dx) {
      dx = dy
      dy = 0
    }

    // Decide once per wheel gesture whether it scrolls an inner element or pans.
    const now = performance.now()
    if (now - this.wheelGesture.t > WHEEL_GESTURE_MS) {
      this.wheelGesture.native = this.canScrollNative(e.target, dx, dy)
    }
    this.wheelGesture.t = now
    if (this.wheelGesture.native) {
      if (!this.canScrollNative(e.target, dx, dy)) e.preventDefault() // hit the end: don't chain to the page
      return
    }
    e.preventDefault()
    this.panBy(-dx, -dy)
  }

  private onGestureStart = (e: GestureEvent) => {
    if (this.mode !== "canvas") return
    e.preventDefault()
    this.gestureStartZ = this.t.z
  }

  private onGestureChange = (e: GestureEvent) => {
    if (this.mode !== "canvas" || this.gestureStartZ === null) return
    e.preventDefault()
    const p = this.toLocal(e.clientX, e.clientY)
    this.autoFit = false
    this.zoomAt(this.gestureStartZ * e.scale, p.x, p.y)
  }

  private onGestureEnd = (e: GestureEvent) => {
    e.preventDefault()
    this.gestureStartZ = null
  }

  private isActive() {
    const vp = this.viewport
    if (!vp || this.mode !== "canvas") return false
    return this.hovered || vp.contains(document.activeElement)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive() || e.defaultPrevented) return
    if (isEditable(e.target) || isEditable(document.activeElement)) return
    const vp = this.viewport!

    if (e.code === "Space") {
      if (!this.spaceDown) {
        this.spaceDown = true
        this.pannedDuringSpace = false
        vp.dataset.space = ""
      }
      // Avoid page scroll; leave Space alone for a focused control inside a frame
      // (it activates on keyup, which we only cancel if the user actually panned).
      const focusedControl = document.activeElement !== vp && vp.contains(document.activeElement)
      if (!focusedControl) e.preventDefault()
      return
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return

    const key = e.key
    const isDigit = (n: number) => key === String(n) || (e.shiftKey && e.code === `Digit${n}`)
    let handled = true
    if (key === "+" || key === "=") this.zoomIn()
    else if (key === "-" || key === "_") this.zoomOut()
    else if (isDigit(0)) this.reset()
    else if (isDigit(1)) this.fit()
    else if (document.activeElement === vp && key.startsWith("Arrow")) {
      const step = e.shiftKey ? 240 : 48
      const dx = key === "ArrowLeft" ? step : key === "ArrowRight" ? -step : 0
      const dy = key === "ArrowUp" ? step : key === "ArrowDown" ? -step : 0
      this.panBy(dx, dy)
    } else handled = false
    if (handled) e.preventDefault()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== "Space" || !this.spaceDown) return
    if (this.pannedDuringSpace) e.preventDefault() // don't activate a focused button after a space-pan
    this.endSpace()
  }

  private onBlur = () => this.endSpace()

  private endSpace() {
    this.spaceDown = false
    this.pannedDuringSpace = false
    if (this.viewport) delete this.viewport.dataset.space
  }
}
