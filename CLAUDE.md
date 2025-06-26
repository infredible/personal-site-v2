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

## Important Conventions

- Use 'shadcn' package instead of deprecated 'shadcn-ui' (e.g., `npx shadcn@latest add popover`)
- All media assets stored in `public/` with organized subdirectories
- Component exports consolidated through `src/components/index.ts`
- Site configuration centralized in `src/app/config/site.ts`