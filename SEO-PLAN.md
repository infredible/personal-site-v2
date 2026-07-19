# SEO Audit & Plan — fredz.website

**Audited:** 2026-07-19 · Live site + repo at `main` (c8fcf33)

**Goal:** be findable by people hiring product designers / design engineers — especially those searching for AI, generalist, and spatial/AR/XR/VR experience.

---

## Headline finding

Google has indexed **2 of your ~13 pages**. A `site:fredz.website` query returns only the homepage and one post. Everything else — all three project case studies, the about page, six of seven posts — is invisible to search.

The cause is mechanical, not editorial: there is **no sitemap and no robots.txt** (both 404 in production), and the only internal links to deep pages are on the homepage and in "more like this" footers. Google has almost nothing to crawl with.

The second finding is positioning: the word "**design engineer**" appears nowhere on the site, "**AR**"/"**XR**"/"**VR**" appear only inside prose, and the homepage `<h1>` is just your name. Even once indexed, nothing on the site targets the queries you want to win.

---

## What's already good

Worth stating, because it means the fixes are additive rather than a rebuild:

- Per-page `title` + `description` on every route, correctly server-rendered
- Full Open Graph + Twitter card coverage with dynamic OG images (`/api/og` returns 200, absolute URLs resolve correctly in prod — `NEXT_PUBLIC_APP_URL` is set)
- `article:published_time` and `article:author` on posts and projects
- Real SSR HTML — content is in the initial payload, not client-only
- Apex → www 307 redirect is in place; one canonical host
- Clean semantic heading structure and alt text on MDX images
- Fast: static params, font preloading, image optimization, long cache headers

---

## Findings, ranked

### P0 — Discovery is broken

| # | Finding | Evidence |
|---|---|---|
| 1 | **No `sitemap.xml`** | `https://www.fredz.website/sitemap.xml` → 404. No `src/app/sitemap.ts`. |
| 2 | **No `robots.txt`** | `https://www.fredz.website/robots.txt` → 404. No `src/app/robots.ts`. |
| 3 | **No `metadataBase`** | Absent from `src/app/layout.tsx`. Works today only because every page builds absolute URLs by hand — fragile. |
| 4 | **No canonical URLs** | No `alternates.canonical` anywhere. |
| 5 | **Stale index** | Google's snippet still says "Designer at Uniswap Labs." You joined Clay in 2026. |
| 6 | **Dummy page is live** | `/projects/template` returns **200** and is publicly reachable. It's excluded from listings but not from crawlers. |

### P1 — Positioning: you don't rank for what you do

| # | Finding | Detail |
|---|---|---|
| 7 | **"Design engineer" appears nowhere** | Not in any title, description, heading, or body copy. This is your highest-intent target term. |
| 8 | **Spatial/AR/XR/VR is buried** | "spatial computing" appears in prose; "AR", "XR", "VR", "3D", "computer vision" never appear in a title or description. Your Matterport and Effect House work is genuinely rare and completely untargeted. |
| 9 | **Homepage `<h1>` is bare** | `<h1>Fred Zaw</h1>` (`src/components/HomeContent.tsx:65`). No role, no discipline. |
| 10 | **Title has no template** | About page `<title>` is literally `"About"`. Posts have no site suffix. No `title.template` in the root layout. |
| 11 | **About page is under-optimized** | `<title>About</title>`, description `"About Fred Zaw"`, `<h1>About Me</h1>`. This is your strongest keyword page — a decade of history, seven named companies — described in three words. |
| 12 | **No structured data** | No `Person` / `WebSite` / `BlogPosting` JSON-LD. This is what powers knowledge panels and AI-search citation. |

### P2 — Architecture & long-tail

| # | Finding | Detail |
|---|---|---|
| 13 | **No `/projects` or `/posts` index pages** | Every deep page hangs off the homepage. No hub pages to rank for category queries. |
| 14 | **No tag pages** | Posts carry `tags` but they're display-only — no `/tags/[tag]` routes. |
| 15 | **Two thin posts** | `gorpcore-analysis` (118 words), `thoughts-on-the-brutalist` (257). Thin pages dilute site quality signals. |
| 16 | **No `llms.txt`** | AI assistants are increasingly how people research candidates. You already ship `/api/markdown` — you're most of the way there. |
| 17 | **No RSS feed** | Costs you subscribers and the syndication links that drive authority. |
| 18 | **Weather fetch on homepage** | `getWeather()` on every render risks making the homepage dynamic and slowing TTFB. Verify it's cached. |

---

## The plan

### Phase 1 — Get indexed (highest leverage, ~2 hours)

Nothing else matters until crawlers can find the pages.

1. **`src/app/sitemap.ts`** — generate from `getAllProjects()` / `getAllPosts()` so it stays current automatically. Include `/`, `/about`, all posts, all projects. Set `lastModified` from post dates.
2. **`src/app/robots.ts`** — allow all, disallow `/api/`, point to the sitemap.
3. **`metadataBase: new URL(siteConfig.url)`** in `src/app/layout.tsx`.
4. **`alternates: { canonical: ... }`** on every route.
5. **Delete or noindex `/projects/template`** — remove the files, or return `notFound()`.
6. **Google Search Console** — verify the domain, submit the sitemap, request re-indexing of the homepage to clear the stale Uniswap snippet. Also do Bing Webmaster Tools (it feeds ChatGPT search).

*Expected result: 13 indexed pages instead of 2 — a ~6x increase in surface area, from plumbing alone.*

### Phase 2 — Say what you are (~3 hours)

7. **Rewrite the site description** to lead with roles you want to be found for. Something like:

   > Fred Zaw — product designer and design engineer in Oakland, CA. Currently at Clay building AI and agentic interfaces. Previously Uniswap Labs, TikTok Effect House (AR), and Matterport (3D/spatial capture).

   That single sentence carries *product designer*, *design engineer*, *AI*, *agentic*, *AR*, *3D/spatial* — the full target set — and every claim in it is true. Update `src/app/config/site.ts`, which propagates to the homepage `<meta>`, OG, and Twitter cards.

8. **`title.template: "%s — Fred Zaw"`** in the root layout, with `title.default` set to the full positioning string.

9. **Homepage `<h1>`** → `Fred Zaw` with a visible subtitle line reading "Product Designer & Design Engineer." Keeps the minimal look, adds the words that matter.

10. **Rewrite the about page's title, description, and `<h1>`.** Title: `About — Fred Zaw`. Description should be a dense, honest career summary naming the disciplines and companies. `<h1>`: something like "About Fred Zaw — Product Designer & Design Engineer."

11. **Project metadata rewrite** — the three case-study descriptions are currently one-liners. Rewrite each to name the discipline and technology:
    - `tiktok`: currently *"A desktop design tool for creators using spatial computing"* → work in AR authoring, computer vision, 0→1 founding design, design systems.
    - `swap` / `lp-redesign`: name the AI, prototyping, and design-engineering angles explicitly.

12. **JSON-LD.** A `Person` schema on the homepage (`name`, `jobTitle`, `knowsAbout: ["Product Design", "Design Engineering", "AI", "Augmented Reality", "Spatial Computing"]`, `sameAs` linking Twitter/LinkedIn/Dribbble/Are.na/read.cv) plus `BlogPosting` on posts. This is the single strongest lever for both knowledge panels and AI-assistant citation.

### Phase 3 — Build surface area (~4 hours)

13. **`/projects` index page** — `<h1>Product Design & Design Engineering Work</h1>`, with each case study summarized. A real landing page for portfolio queries.
14. **`/posts` index page** — same pattern for writing.
15. **`/tags/[tag]` routes** from existing post tags. Free pages from data you already have.
16. **Add a `/uses` or `/stack` page** — reliably well-indexed for this audience, cheap to write, and signals design-engineering fluency.
17. **`llms.txt`** at the root, listing your pages with descriptions. You already have `/api/markdown` producing clean text — this is a small step.
18. **RSS feed** at `/rss.xml`.

### Phase 4 — Authority (ongoing, not a code change)

19. **Consolidate your identity graph.** You have profiles on read.cv, LinkedIn, Dribbble, about.me, Are.na, theorg.com. Make sure every one links to `fredz.website` and uses the same role wording. Consistent cross-linking is what teaches Google these are one person, and it's what feeds the `sameAs` in your JSON-LD.
20. **Write to your differentiators.** Your rarest, most defensible angle is the *intersection*: someone who shipped AR authoring tools at TikTok, 3D capture at Matterport, and is now building agentic AI interfaces. Almost nobody has that combination. Posts on "designing for spatial computing," "what AR taught me about AI interfaces," or "design engineering with LLMs" would rank in low-competition territory *and* be exactly what your target audience is searching for.
21. **Flesh out or consolidate the two thin posts** (`gorpcore-analysis`, `thoughts-on-the-brutalist`).

---

## Suggested order

| Phase | Effort | Impact |
|-------|--------|--------|
| 1 — Get indexed | ~2h | **Critical.** Unblocks everything. |
| 2 — Positioning | ~3h | **High.** Decides *what* you rank for. |
| 3 — Surface area | ~4h | Medium. Compounds over time. |
| 4 — Authority | Ongoing | Highest long-term ceiling. |

Phases 1 and 2 together are about a day of work and address every structural problem found. Phase 1 alone is the difference between 2 and 13 indexed pages.

---

## Honest caveat

SEO for a personal site is a slow instrument. Even done perfectly, expect 4–12 weeks before ranking changes show up, and personal sites rarely outrank LinkedIn for a name query. The realistic wins here are: (a) ranking for **your own name** across all pages instead of two, (b) appearing for long-tail role queries like *"design engineer AR spatial computing portfolio"* where competition is thin and your background is genuinely unusual, and (c) being **citable by AI assistants**, which is increasingly how recruiters and founders actually research people — and which the JSON-LD, `llms.txt`, and clean semantic HTML directly serve.
