'use client'

import * as React from 'react'
import type { ShowcaseView, ShowcaseViewTransition } from './ShowcaseShell'

/*
 * Exploded-view transition between a showcase's Component and Canvas views.
 *
 * Component → Canvas: each part of the live component (marked `data-explode="id"`)
 * flies from where it sits in the assembled component to its frame on the
 * canvas (marked `data-explode-target="id"`), staggered top to bottom. The
 * canvas around the parts (dot grid, frame cards, labels, other sections)
 * fades in as they land.
 *
 * Canvas → Component: the surroundings fade out, then the parts fly back and
 * reassemble.
 *
 * It's FLIP: measure where a part was (First), let the new view mount (Last),
 * then animate a transform from the old position to none (Invert, Play). The
 * canvas board is itself scaled by the zoom, so offsets are converted into the
 * board's local units. All animations are WAAPI (off the main thread) and
 * start in the shell's layout effect, before the new view's first paint.
 *
 * Markup contract:
 *   data-explode="id"         a part in the Component view
 *   data-explode-target="id"  the same part on the canvas
 *   data-explode-card         canvas surface behind a part: only its background fades
 * Everything else in a canvas section that holds targets (header, frame labels,
 * frames without targets) and every other section fades as a whole.
 */

// Strong ease-in-out for on-screen movement; strong ease-out for fades
const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)'
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

// Stagger leads from the free side so paths never cross: exploding, the bottom
// part leaves first (each lower part travels further); assembling, the top leads.
const EXPLODE = { duration: 640, stagger: 30, fadeDelay: 420, fadeDuration: 320 }
const ASSEMBLE = { duration: 560, stagger: 30, fadeOut: 150 }

interface Snapshot {
  to: ShowcaseView
  rects: Map<string, DOMRect>
}

// Above the dot grid, below every piece of content (the viewport is isolated during a transition)
const VEIL_CSS = 'position:absolute;inset:0;z-index:-1;pointer-events:none;background:var(--background)'

const viewRoot = (view: ShowcaseView) => document.querySelector<HTMLElement>(`[data-showcase-view="${view}"]`)

function collect(root: ParentNode | null, attr: 'data-explode' | 'data-explode-target') {
  const map = new Map<string, HTMLElement>()
  root?.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
    const id = el.getAttribute(attr)
    if (id && !map.has(id)) map.set(id, el)
  })
  return map
}

/** Canvas content that isn't a part: fades instead of flying. */
function surroundings(viewport: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = []
  viewport.querySelectorAll<HTMLElement>('[data-canvas-section]').forEach((section) => {
    if (!section.querySelector('[data-explode-target]')) return void out.push(section)
    const header = section.querySelector<HTMLElement>(':scope > header')
    if (header) out.push(header)
    section.querySelectorAll<HTMLElement>('[data-canvas-frame]').forEach((frame) => {
      if (!frame.querySelector('[data-explode-target]')) out.push(frame)
      else frame.querySelectorAll<HTMLElement>('[data-canvas-frame-label]').forEach((label) => out.push(label))
    })
  })
  return out
}

function onScreen(rect: DOMRect) {
  return rect.width > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
}

/** Plays `el` from `first` (a viewport rect) to where it is now. */
function flip(el: HTMLElement, first: DOMRect, timing: KeyframeAnimationOptions) {
  const last = el.getBoundingClientRect()
  if (!last.width || !el.offsetWidth) return null
  // Screen px per layout px: the canvas zoom on the board, 1 in the Component view
  const unit = last.width / el.offsetWidth
  const dx = (first.left - last.left) / unit
  const dy = (first.top - last.top) / unit
  const scale = first.width / last.width
  const prev = { origin: el.style.transformOrigin, position: el.style.position, zIndex: el.style.zIndex }
  el.style.transformOrigin = '0 0'
  // Fly above neighbouring frames and cards
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  el.style.zIndex = '10'
  const animation = el.animate(
    [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: 'none' }],
    { easing: EASE_MOVE, fill: 'backwards', ...timing },
  )
  const restore = () => {
    el.style.transformOrigin = prev.origin
    el.style.position = prev.position
    el.style.zIndex = prev.zIndex
  }
  animation.addEventListener('finish', restore)
  animation.addEventListener('cancel', restore)
  return animation
}

const fadeIn = (el: HTMLElement, delay: number, duration: number) =>
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: EASE_OUT, fill: 'backwards' })

export function useExplodedViewTransition(): ShowcaseViewTransition {
  const snapshot = React.useRef<Snapshot | null>(null)
  const running = React.useRef<Animation[]>([])
  const pendingRelease = React.useRef<(() => void) | null>(null)

  return React.useMemo<ShowcaseViewTransition>(() => {
    const track = (animation: Animation | null) => animation && running.current.push(animation)
    const settle = () => {
      pendingRelease.current?.()
      pendingRelease.current = null
      running.current.forEach((a) => a.finish())
      running.current = []
    }
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const flag = (on: boolean) => {
      if (on) document.documentElement.dataset.viewTransition = ''
      else delete document.documentElement.dataset.viewTransition
    }

    return {
      before: async (_from, to) => {
        settle()
        snapshot.current = null
        if (reduced()) return

        if (to === 'canvas') {
          const parts = collect(viewRoot('component'), 'data-explode')
          snapshot.current = { to, rects: new Map([...parts].map(([id, el]) => [id, el.getBoundingClientRect()])) }
          flag(true)
          return
        }

        // Canvas → Component: clear the canvas around the parts, then measure them
        const root = viewRoot('canvas')
        const viewport = root?.querySelector<HTMLElement>('[data-canvas-viewport]')
        const targets = collect(root, 'data-explode-target')
        if (!viewport || targets.size === 0) return
        flag(true)
        const timing: KeyframeAnimationOptions = { duration: ASSEMBLE.fadeOut, easing: EASE_OUT, fill: 'forwards' }
        const fades = [
          ...surroundings(viewport).map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], timing)),
          ...[...viewport.querySelectorAll<HTMLElement>('[data-explode-card]')].map((card) =>
            card.animate([{ backgroundColor: getComputedStyle(card).backgroundColor }, { backgroundColor: 'transparent' }], timing),
          ),
        ]
        // Hide the dot grid behind a veil the color of the Component view's page
        const veil = document.createElement('div')
        veil.style.cssText = VEIL_CSS
        viewport.prepend(veil)
        fades.push(veil.animate([{ opacity: 0 }, { opacity: 1 }], timing))
        await Promise.all(fades.map((a) => a.finished.catch(() => {})))
        snapshot.current = { to, rects: new Map([...targets].map(([id, el]) => [id, el.getBoundingClientRect()])) }
      },

      after: (_from, to) => {
        const snap = snapshot.current
        snapshot.current = null
        if (!snap || snap.to !== to) {
          flag(false)
          // Reduced motion (or nothing to match): a plain, quick crossfade
          const root = viewRoot(to)
          if (root && reduced()) root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: EASE_OUT })
          return
        }

        const done = () => flag(false)

        if (to === 'canvas') {
          const root = viewRoot('canvas')
          const viewport = root?.querySelector<HTMLElement>('[data-canvas-viewport]')
          const targets = collect(root, 'data-explode-target')
          if (!viewport) return done()

          // The dot grid starts hidden under a veil matching the Component page, then clears
          const veil = document.createElement('div')
          veil.style.cssText = VEIL_CSS
          viewport.prepend(veil)
          const veilFade = veil.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 480,
            delay: 160,
            easing: EASE_OUT,
            fill: 'both',
          })
          veilFade.addEventListener('finish', () => veil.remove())
          track(veilFade)

          // The canvas settles its opening pan/zoom a frame or two after mounting.
          // Hold everything hidden (under the veil) until the board transform is
          // stable, then measure and play, so parts land where they really end up.
          const board = viewport.querySelector<HTMLElement>('[data-canvas-board]')
          const held = [...targets.values(), ...surroundings(viewport)]
          held.forEach((el) => (el.style.opacity = '0'))
          const release = () => held.forEach((el) => (el.style.opacity = ''))

          const play = () => {
            release()
            const flying = [...targets].filter(([id]) => {
              const first = snap.rects.get(id)
              return first && onScreen(first)
            }).length
            let i = 0
            let last = 0
            for (const [id, el] of targets) {
              const first = snap.rects.get(id)
              if (first && onScreen(first)) {
                const delay = (flying - 1 - i++) * EXPLODE.stagger
                track(flip(el, first, { duration: EXPLODE.duration, delay }))
                last = Math.max(last, delay + EXPLODE.duration)
              } else {
                track(fadeIn(el, EXPLODE.fadeDelay, EXPLODE.fadeDuration))
              }
            }
            // Cards, labels and the rest of the canvas arrive as the parts land
            viewport.querySelectorAll<HTMLElement>('[data-explode-card]').forEach((card) => {
              const color = getComputedStyle(card).backgroundColor
              track(
                card.animate([{ backgroundColor: 'transparent' }, { backgroundColor: color }], {
                  duration: EXPLODE.fadeDuration,
                  delay: EXPLODE.fadeDelay,
                  easing: EASE_OUT,
                  fill: 'backwards',
                }),
              )
            })
            surroundings(viewport).forEach((el) => track(fadeIn(el, EXPLODE.fadeDelay + 60, EXPLODE.fadeDuration)))
            window.setTimeout(done, Math.max(last, EXPLODE.fadeDelay + EXPLODE.fadeDuration + 60))
          }

          let frames = 0
          let prev = board?.style.transform
          const waitForBoard = () => {
            const now = board?.style.transform
            // Stable for one frame (and ready), or give up waiting after ~8 frames
            if ((board?.hasAttribute('data-ready') && now === prev && frames > 0) || frames >= 8) return play()
            prev = now
            frames++
            requestAnimationFrame(waitForBoard)
          }
          requestAnimationFrame(waitForBoard)
          // An interrupting switch before play() starts must not leave parts hidden
          pendingRelease.current = release
          return
        }

        // → Component: parts fly back into the assembled component
        const parts = collect(viewRoot('component'), 'data-explode')
        let i = 0
        let last = 0
        for (const [id, el] of parts) {
          const first = snap.rects.get(id)
          if (first && onScreen(first)) {
            const delay = i++ * ASSEMBLE.stagger
            track(flip(el, first, { duration: ASSEMBLE.duration, delay }))
            last = Math.max(last, delay + ASSEMBLE.duration)
          } else {
            track(fadeIn(el, 200, 240))
          }
        }
        window.setTimeout(done, last)
      },
    }
  }, [])
}
