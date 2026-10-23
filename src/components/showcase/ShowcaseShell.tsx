'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Component, Frame, Monitor, RotateCcw, Smartphone } from 'lucide-react'
import { UniswapScope } from '@/components/uniswap/UniswapScope'
import { cn } from '@/lib/utils'
import { BarButton, BarSelect, Segmented, ThemeSwitch } from './ShowcaseControls'

/*
 * ShowcaseShell: the frame around a design-engineering showcase page.
 *
 *   ┌ controls bar (site chrome) ───────────────────────────────────────┐
 *   │ ← Back │ eyebrow / title │ Component|Canvas │ …view controls │ ☀☾ │
 *   ├───────────────────────────────────────────────────────────────────┤
 *   │ view area: fills the rest of the viewport                         │
 *   │  Component → <UniswapScope> stage, renderComponent() centered     │
 *   │              near the top; Desktop, or a 375px Mobile frame       │
 *   │  Canvas    → renderCanvas(), filling the area (no page scroll)    │
 *   └───────────────────────────────────────────────────────────────────┘
 *
 * The shell is generic: it knows nothing about what it shows. Render props
 * are functions, so the page that uses it must be a client component (keep
 * page.tsx a server component for metadata and render a client child).
 *
 * URL state (shareable, survives reload): ?view=canvas, ?viewport=mobile,
 * ?preset=<id>. Params equal to their default are omitted. Updates go through
 * window.history.replaceState, which Next.js syncs with useSearchParams: no
 * history entries, no scroll, and no server round trip on each toggle.
 */

export type ShowcaseView = 'component' | 'canvas'
export type ShowcaseViewport = 'desktop' | 'mobile'

export interface ShowcasePreset {
  id: string
  label: string
}

export interface ShowcaseComponentRenderArgs {
  /** Width being simulated. Mobile renders into a 375px-wide container named `viewport`. */
  viewport: ShowcaseViewport
  /** Selected preset id, or undefined when the page passes no presets. */
  preset: string | undefined
  /** Increments on Reset. Use as a `key` to remount the component with fresh state. */
  resetKey: number
}

export interface ShowcaseCanvasRenderArgs {
  /** Selected preset id, or undefined when the page passes no presets. */
  preset: string | undefined
}

/**
 * Hooks for animating between views (e.g. the exploded-view transition).
 * `before` runs while the old view is still mounted and may delay the switch by
 * returning a promise; `after` runs synchronously after the new view mounts,
 * before it paints. Providing one turns off the shell's default crossfade.
 */
export interface ShowcaseViewTransition {
  before?: (from: ShowcaseView, to: ShowcaseView) => void | Promise<void>
  after?: (from: ShowcaseView, to: ShowcaseView) => void
}

export interface ShowcaseLink {
  href: string
  label: string
  /** Icon; on mobile only the icon shows. */
  icon?: React.ReactNode
}

export interface ShowcaseShellProps {
  title: string
  /** Small label above the title, e.g. "Uniswap recreation". */
  eyebrow?: string
  /** Back link target. Default "/". */
  backHref?: string
  /** Back link text. Default "Back". */
  backLabel?: string
  /** Related pages, shown at the end of the bar in both views (e.g. the design system). */
  links?: ShowcaseLink[]
  /** Shows a preset select in the Component view. */
  presets?: ShowcasePreset[]
  /** Default preset id. Defaults to the first preset. */
  defaultPreset?: string
  /** Extra controls shown in the Component view, after the built-in ones. */
  componentControls?: React.ReactNode
  /** Controls shown in the Canvas view (e.g. zoom controls bound to the canvas controller). */
  canvasControls?: React.ReactNode
  /** Content of the Component view, rendered inside a <UniswapScope> stage. */
  renderComponent: (args: ShowcaseComponentRenderArgs) => React.ReactNode
  /**
   * Content of the Canvas view. Rendered in an `absolute inset-0` box that
   * fills the area under the bar (not inside a .uniswap scope); fill it with
   * `h-full w-full` or `absolute inset-0`.
   */
  renderCanvas: (args: ShowcaseCanvasRenderArgs) => React.ReactNode
  /** Custom animation between Component and Canvas views. */
  viewTransition?: ShowcaseViewTransition
}

interface ShellState {
  view: ShowcaseView
  viewport: ShowcaseViewport
  preset: string | undefined
  resetKey: number
}

interface ShellActions {
  setView: (view: ShowcaseView) => void
  setViewport: (viewport: ShowcaseViewport) => void
  setPreset: (preset: string) => void
  reset: () => void
}

const VIEW_OPTIONS = [
  { value: 'component' as const, label: 'Component', icon: <Component /> },
  { value: 'canvas' as const, label: 'Canvas', icon: <Frame /> },
]

const VIEWPORT_OPTIONS = [
  { value: 'desktop' as const, label: 'Desktop', icon: <Monitor />, iconOnlyOnMobile: true },
  { value: 'mobile' as const, label: 'Mobile', icon: <Smartphone />, iconOnlyOnMobile: true },
]

function defaultPresetOf(props: ShowcaseShellProps) {
  return props.defaultPreset ?? props.presets?.[0]?.id
}

/** Generic showcase page frame. See the comment at the top of this file. */
export function ShowcaseShell(props: ShowcaseShellProps) {
  // useSearchParams opts the subtree out of static rendering up to the nearest
  // Suspense boundary. The fallback (in the static HTML) is the default state.
  const fallbackState: ShellState = {
    view: 'component',
    viewport: 'desktop',
    preset: defaultPresetOf(props),
    resetKey: 0,
  }
  return (
    <React.Suspense fallback={<ShellLayout {...props} state={fallbackState} actions={noopActions} />}>
      <ShellWithUrlState {...props} />
    </React.Suspense>
  )
}

const noop = () => {}
const noopActions: ShellActions = { setView: noop, setViewport: noop, setPreset: noop, reset: noop }

function ShellWithUrlState(props: ShowcaseShellProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [resetKey, setResetKey] = React.useState(0)

  const defaultPreset = defaultPresetOf(props)
  const presetParam = searchParams.get('preset')
  const state: ShellState = {
    view: searchParams.get('view') === 'canvas' ? 'canvas' : 'component',
    viewport: searchParams.get('viewport') === 'mobile' ? 'mobile' : 'desktop',
    preset: props.presets?.some((p) => p.id === presetParam) ? (presetParam ?? undefined) : defaultPreset,
    resetKey,
  }

  const setParam = React.useCallback(
    (key: 'view' | 'viewport' | 'preset', value: string, defaultValue: string | undefined) => {
      const params = new URLSearchParams(window.location.search)
      if (value === defaultValue) params.delete(key)
      else params.set(key, value)
      const query = params.toString()
      window.history.replaceState(null, '', `${pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    },
    [pathname],
  )

  const switching = React.useRef(false)
  const actions: ShellActions = {
    setView: (view) => {
      if (view === state.view || switching.current) return
      const before = props.viewTransition?.before?.(state.view, view)
      if (!before) return setParam('view', view, 'component')
      switching.current = true
      before
        .catch(() => {})
        .finally(() => {
          switching.current = false
          setParam('view', view, 'component')
        })
    },
    setViewport: (viewport) => setParam('viewport', viewport, 'desktop'),
    setPreset: (preset) => setParam('preset', preset, defaultPreset),
    reset: () => setResetKey((k) => k + 1),
  }

  return <ShellLayout {...props} state={state} actions={actions} />
}

function ShellLayout(props: ShowcaseShellProps & { state: ShellState; actions: ShellActions }) {
  const { state, renderComponent, renderCanvas, viewTransition } = props
  const reduceMotion = useReducedMotion()

  // Runs after the new view's own layout effects (children first), so it can
  // measure the mounted view and start animations before the first paint.
  const prevView = React.useRef(state.view)
  React.useLayoutEffect(() => {
    const from = prevView.current
    prevView.current = state.view
    if (from !== state.view) viewTransition?.after?.(from, state.view)
  }, [state.view, viewTransition])

  return (
    <div data-showcase-shell="" className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <ShowcaseBar {...props} />
      <div className="relative min-h-0 flex-1">
        <motion.div
          key={state.view}
          data-showcase-view={state.view}
          className="absolute inset-0"
          initial={reduceMotion || viewTransition ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {state.view === 'component' ? (
            <ComponentStage viewport={state.viewport}>
              {renderComponent({ viewport: state.viewport, preset: state.preset, resetKey: state.resetKey })}
            </ComponentStage>
          ) : (
            <div className="absolute inset-0 overflow-hidden">{renderCanvas({ preset: state.preset })}</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function ShowcaseBar({
  title,
  eyebrow,
  backHref = '/',
  backLabel = 'Back',
  links,
  presets,
  componentControls,
  canvasControls,
  state,
  actions,
}: ShowcaseShellProps & { state: ShellState; actions: ShellActions }) {
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background">
      {/*
        Wide (xl+): one row (identity, view switch, view controls, theme).
        Narrower: identity + view switch, then view controls + theme.
      */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-5 xl:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 xl:flex-none">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="-ml-1.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-1.5 text-xs font-medium tracking-wide text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="max-sm:hidden">{backLabel}</span>
          </Link>
          <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
          <div className="flex min-w-0 flex-col justify-center">
            {eyebrow && <span className="truncate text-[0.6875rem] leading-4 text-muted-foreground">{eyebrow}</span>}
            <h1 className="truncate text-sm leading-5 font-medium">{title}</h1>
          </div>
        </div>

        <Segmented
          aria-label="View"
          options={VIEW_OPTIONS}
          value={state.view}
          onValueChange={actions.setView}
          className="xl:ml-2"
        />

        <div className="flex w-full min-w-0 items-center gap-2 xl:w-auto xl:flex-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 xl:justify-end">
            {state.view === 'component' ? (
              <>
                {presets && presets.length > 0 && state.preset && (
                  <BarSelect
                    label="Preset"
                    options={presets}
                    value={state.preset}
                    onValueChange={actions.setPreset}
                    className="max-sm:min-w-0 max-sm:flex-1"
                  />
                )}
                <Segmented
                  aria-label="Viewport width"
                  options={VIEWPORT_OPTIONS}
                  value={state.viewport}
                  onValueChange={actions.setViewport}
                />
                <BarButton onClick={actions.reset} aria-label="Reset component" title="Reset component">
                  <RotateCcw aria-hidden />
                  <span className="max-sm:hidden">Reset</span>
                </BarButton>
                {componentControls}
              </>
            ) : (
              canvasControls
            )}
          </div>
          {links && links.length > 0 && (
            <nav aria-label="Related" className="flex shrink-0 items-center gap-2">
              <span aria-hidden className="h-6 w-px bg-border max-sm:hidden" />
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={cn(
                    'inline-flex h-[calc(2rem+2px)] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium tracking-wide text-muted-foreground',
                    'outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:size-3.5 [&_svg]:shrink-0',
                  )}
                >
                  {link.icon}
                  <span className={cn(link.icon && 'max-sm:sr-only')}>{link.label}</span>
                </Link>
              ))}
            </nav>
          )}
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}

/* Component view stage ---------------------------------------------------- */

const MOBILE_WIDTH = 375
const MOBILE_MAX_HEIGHT = 812
const frameSpring = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const

/**
 * Uniswap-scoped stage. The frame is measured against the stage and animated
 * between full size (Desktop) and a 375px phone column (Mobile), so the
 * component genuinely reflows to mobile width. The frame's scroller is a
 * container named `viewport`: components can respond to it with container
 * queries (e.g. `@sm/viewport:`), since viewport media queries don't change.
 */
function ComponentStage({ viewport, children }: { viewport: ShowcaseViewport; children: React.ReactNode }) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null)
  const reduceMotion = useReducedMotion()

  const left = useMotionValue(0)
  const top = useMotionValue(0)
  const width = useMotionValue(0)
  const height = useMotionValue(0)
  const borderRadius = useMotionValue(0)

  React.useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const mobile = viewport === 'mobile'
  const frame = size ? frameGeometry(size, mobile) : null

  // Only viewport toggles animate; first layout and stage resizes apply instantly.
  const lastViewport = React.useRef(viewport)
  React.useLayoutEffect(() => {
    if (!frame) return
    const animateIt = lastViewport.current !== viewport && !reduceMotion
    lastViewport.current = viewport
    const targets = [
      [left, frame.left],
      [top, frame.top],
      [width, frame.width],
      [height, frame.height],
      [borderRadius, frame.borderRadius],
    ] as const
    if (!animateIt) {
      targets.forEach(([value, target]) => value.set(target))
      return
    }
    const controls = targets.map(([value, target]) => animate(value, target, frameSpring))
    return () => controls.forEach((c) => c.stop())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the geometry numbers
  }, [viewport, frame?.left, frame?.top, frame?.width, frame?.height, frame?.borderRadius, reduceMotion])

  return (
    <UniswapScope
      ref={stageRef}
      className={cn('absolute inset-0 overflow-hidden', mobile ? 'bg-surface2' : 'bg-surface1')}
    >
      <motion.div
        className={cn(
          'absolute overflow-hidden bg-surface1',
          !frame && 'inset-0',
          mobile && 'shadow-uni-medium ring-1 ring-surface3',
        )}
        style={frame ? { left, top, width, height, borderRadius } : undefined}
      >
        <div
          data-showcase-viewport={viewport}
          className="@container/viewport h-full overflow-y-auto overscroll-contain"
        >
          <div className={cn('flex justify-center px-uni-8 pb-uni-60', mobile ? 'pt-uni-24' : 'pt-[68px]')}>
            {children}
          </div>
        </div>
      </motion.div>
    </UniswapScope>
  )
}

function frameGeometry(size: { w: number; h: number }, mobile: boolean) {
  if (!mobile) return { left: 0, top: 0, width: size.w, height: size.h, borderRadius: 0 }
  const pad = size.w < 640 ? 12 : 24
  const width = Math.min(MOBILE_WIDTH, size.w - pad * 2)
  const height = Math.min(MOBILE_MAX_HEIGHT, size.h - pad * 2)
  return { left: (size.w - width) / 2, top: pad, width, height, borderRadius: 36 }
}
