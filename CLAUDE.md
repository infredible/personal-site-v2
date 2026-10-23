# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server  
- `npm run lint` - Run ESLint

## Architecture Overview

This is a Next.js 15 personal portfolio built with the App Router pattern, featuring a unique content management system and custom interactive components.

### Content Architecture

**Static Content System**: Content is managed through separate `.mdx` and `.metadata.ts` file pairs rather than frontmatter:

- Posts: `src/app/content/posts/[slug].mdx` + `src/app/content/posts/[slug].metadata.ts`
- Projects: `src/app/content/projects/[slug].mdx` + `src/app/content/projects/[slug].metadata.ts`

**Content Registration**: New content must be manually registered in the data files:
- Posts: Add to `metadataLookup` and `postSlugs` array in `src/app/lib/posts.ts`
- Projects: Add to `metadataLookup` and `projectSlugs` array in `src/app/lib/projects.ts`

### Key Components Architecture

**Stories Component** (`src/components/Stories.tsx`): Instagram-style video stories with sophisticated video playback handling, hover/touch detection, and progress tracking. Uses refs for safe DOM manipulation and promise management for video playback.

**Page Transitions** (`src/components/page-transition.tsx`): Framer Motion-based transitions with different animations for homepage vs other pages. Wrapped by `PageTransitionWrapper` in layout.

**Theme System**: System-aware dark/light mode with `ThemeProvider` context and `SafariThemeUpdater` for browser chrome theming.

**Comparison Slider** (`src/components/ComparisonSlider.tsx`): Interactive before/after image slider with drag functionality and toggle buttons.

### Routing & Dynamic Pages

- `/posts/[slug]` - Dynamic blog posts with metadata generation and static params
- `/projects/[slug]` - Dynamic project pages with rich media support
- API routes in `src/app/api/` for OG image generation and markdown processing

### Styling System

- Tailwind CSS 4 with custom CSS variables in `globals.css`
- Custom fonts: UntitledSans (primary), Family (serif), loaded via `localFont`
- Responsive design with mobile-first approach
- Custom prose styling for MDX content

### External Integrations

- Weather API integration (`src/app/lib/weather.ts`) for Oakland, CA display
- Vercel Analytics via `@vercel/analytics/next`
- Dynamic OG image generation via `/api/og` route

## Content Management

### Adding New Posts
1. Create `src/app/content/posts/[slug].mdx`
2. Create `src/app/content/posts/[slug].metadata.ts` with required fields
3. Add slug to `postSlugs` array in `src/app/lib/posts.ts`
4. Add metadata import and entry in `metadataLookup` in `src/app/lib/posts.ts`

### Adding New Projects
1. Create `src/app/content/projects/[slug].mdx`
2. Create `src/app/content/projects/[slug].metadata.ts` with required fields including `index` for ordering
3. Add assets to `public/projects/[slug]/`
4. Add slug to `projectSlugs` array in `src/app/lib/projects.ts`
5. Add metadata import and entry in `metadataLookup` in `src/app/lib/projects.ts`

### Stories Configuration
Stories are configured in the `storiesData` array in `src/app/page.tsx` with video URLs, object-fit settings, and optional padding.

## Technical Notes

- Uses React 19 features and Next.js 15 App Router
- MDX compilation via `@next/mdx` with custom page extensions in `next.config.ts`
- TypeScript strict mode with custom interfaces for content metadata
- Custom font loading with fallbacks and display swap optimization
- Responsive image handling via Next.js Image component

## Uniswap Showcase

Design engineering recreations of Uniswap UIs. Shared code lives in `src/components/uniswap/` so it can be used both on showcase pages (`src/app/showcase/uniswap/`) and inline in project MDX.

- **Tokens**: `src/components/uniswap/theme.css` (imported by `globals.css`) holds Uniswap's tokens, ported from `Uniswap/interface` `packages/ui/src/theme`. Values are scoped to `.uniswap`; light on `.uniswap`, dark on `.dark .uniswap`.
- **Utilities**: Uniswap names are used directly, e.g. `bg-surface2`, `text-neutral2`, `hover:bg-accent1Hovered`, `text-body3`, `text-buttonLabel2`. Radius, spacing, and shadow are px-based and prefixed: `rounded-uni-20`, `p-uni-16`, `gap-uni-8`, `shadow-uni-medium`.
- **Scope**: wrap usage in `<UniswapScope>` (`fullPage` on showcase pages; without it for inline embeds). Radix portal content renders outside the wrapper, so it must carry `uniswapScopeClassName`; the `Uni*` components already do.
- **Forced theme**: `<UniswapScope theme="light" | "dark">` (renders `data-theme`) overrides the site theme for a subtree, including Tailwind's `dark:` variant; used for side-by-side light/dark canvas frames. Portal content doesn't inherit it.
- **Embeds in MDX**: import directly in the `.mdx` file and wrap in `<UniswapScope>`. `theme.css` resets `.prose` element styles (margins, bullets, serif headings, link underlines) inside the scope.
- **shadcn bridge**: inside the scope, shadcn variables (`--primary`, `--muted`, `--border`, ...) map to Uniswap tokens. Keep `components/ui/*` stock; Uniswap components compose shadcn primitives when their styling is a usable base, or the underlying Radix primitive when Uniswap's styling replaces it entirely (e.g. `UniButton`, `SegmentedControl`).
- **Components**: `UniButton` (variant × emphasis × size, from Uniswap's button tables), `SegmentedControl`, `Pill`, `SearchInput`, `UniModal` / `ModalSurface` / `PopoverSurface`, `UniTooltip`, and loaders (`Shimmer`, `TextSkeleton`, `BlockSkeleton`, `TokenListSkeleton`). Skeleton rule, from Uniswap: first load shows skeletons sized to the text they replace; a refetch keeps old values on screen and pulses them. Export new ones from `src/components/uniswap/index.ts`.
- **tailwind-merge**: new custom text/radius/spacing/shadow scales must be registered in `src/lib/utils.ts`, or `cn()` will drop them as conflicts.
- **Catalog**: `/showcase/uniswap/system` renders every token and component; add new tokens to `_lib/tokens.ts` and component demos to `_components/ComponentGallery.tsx`.
- **Showcase pages**: built with `ShowcaseShell` (`src/components/showcase/`): a site-styled controls bar (Component | Canvas, presets, Desktop/Mobile, Reset, theme) with URL state (`?view=canvas`, `?viewport=mobile`, `?preset=<id>`). The shell needs render props, so `page.tsx` stays a server component (metadata) and renders a client child. In the 375px mobile frame, viewport media queries don't change: use container queries on `@container/viewport`.
- **Canvas**: `src/components/showcase/canvas/` is a generic Figma-like board (`Canvas`, `CanvasSection`, `CanvasFrame`, `useCanvasController`, `CanvasZoomControls`). Auto-layout, live frame content, deep links via `#frame-id`, `initialFocus` for the opening view; below 768px it becomes a scrolling list. It's site chrome: frame content brings its own `<UniswapScope>`.
- **Exploded-view transition**: `useExplodedViewTransition()` (`src/components/showcase/`) passed as the shell's `viewTransition`. Parts in the Component view carry `data-explode="id"` (SwapFormView adds them); the canvas anatomy section carries matching `data-explode-target="id"` inside `data-explode-card` surfaces. FLIP + WAAPI; reduced motion gets a crossfade. `useSwapFormParts` renders the same parts one by one for the anatomy.
- **Swap**: `src/components/uniswap/swap/`: display-only `parts/` and inline `overlays/` (render from props, no business state), `presets.ts` (named `SwapFormState`s shared by the canvas and the preset menu), `getSwapAction.ts` (main button state), `SwapFormView` (composition), and `SwapBox` (stateful: mock quotes, token selector, settings popover, review flow). Use `SwapBox` for embeds. Showcase page: `src/app/showcase/uniswap/swap/`.
- **Showcase pages**: index at `/showcase` (`src/app/showcase/page.tsx`; add new showcases there). Pages: `swap`, `token-selector`, `review` (redesigned one-surface review flow in `src/components/uniswap/swap/review/`, compared with the production-style `SwapReviewPanel`), `sparkline` (`src/components/uniswap/chart/`, also shown beside the swap box), `system`.
- **shadcn CLI**: if `npx shadcn@latest add` can't reach the registry, write the stock new-york v4 source by hand and install its Radix dependency from npm.

## Important Conventions

- Use 'shadcn' package instead of deprecated 'shadcn-ui' (e.g., `npx shadcn@latest add popover`)
- All media assets stored in `public/` with organized subdirectories
- Component exports consolidated through `src/components/index.ts`
- Site configuration centralized in `src/app/config/site.ts`