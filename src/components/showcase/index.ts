// Design-engineering showcase frame (site chrome). Generic: knows nothing about
// what it shows. The canvas engine lives in ./canvas.
export { ShowcaseShell } from './ShowcaseShell'
export type {
  ShowcaseShellProps,
  ShowcaseComponentRenderArgs,
  ShowcaseLink,
  ShowcaseCanvasRenderArgs,
  ShowcaseViewTransition,
  ShowcasePreset,
  ShowcaseView,
  ShowcaseViewport,
} from './ShowcaseShell'
export { Segmented, BarButton, BarSelect, ThemeSwitch } from './ShowcaseControls'
export type { SegmentOption } from './ShowcaseControls'
export { useExplodedViewTransition } from './useExplodedViewTransition'
