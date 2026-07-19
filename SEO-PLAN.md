# SEO Audit & Plan — fredz.website

**Audited:** 2026-07-19 · Live site + repo at `main` (c8fcf33)

**Goal:** be findable by people hiring product designers / design engineers — especially those searching for AI, generalist, and spatial/AR/XR/VR experience. "Findable" means both classic search *and* being citable by AI assistants, which is increasingly how recruiters and founders actually research people.

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

## Agent optimization: how it changes the above

Agents retrieve and *cite*; search engines rank. Those reward different things, and the difference reshapes the plan in three places.

**1. Extractability beats keyword placement.** A search engine ranks a page. An assistant pulls a chunk and then has to be confident enough to assert something. The about page currently says you were "brought to spatial computing, computer vision, and AI at Ebay, Matterport, and TikTok" — good prose, but an agent asked *"does Fred Zaw have AR experience?"* has to link three companies to three technologies across a subordinate clause, and models hedge when they infer. The sentence that would settle it — "I've shipped AR authoring tools, 3D capture, and agentic AI interfaces" — appears nowhere.

So the Phase 2 brief is not "add keywords." It's **state your capabilities once, explicitly, in a self-contained sentence that survives being ripped out of context.** Keep the narrative; add an extractable spine. The rewrite that ranks and the rewrite that gets quoted are nearly the same rewrite.

**2. Structured data is near-top priority, not a Phase 2 afterthought.** JSON-LD is the one place you can assert `jobTitle` and `knowsAbout` as machine-readable fact rather than prose requiring inference.

**3. Corroboration is the real ranking factor, so Phase 4 stops being last.** Models assert what they see confirmed across independent sources. Your site saying "design engineer" once is weak evidence; your site *plus* LinkedIn *plus* read.cv *plus* Are.na saying it is what makes a model state it flatly. Identity-graph cleanup is a **companion to Phase 2, not a follow-up** — and it's free, just profile edits.

**What doesn't change:** Phase 1 stands. Assistants largely retrieve through search backends that need your sitemap — uncrawlable is uncitable.

**Already in your favor:** the site is genuinely server-rendered. Most AI crawlers don't execute JavaScript, so many React portfolios are blank pages to them. Yours isn't. You also already ship `/api/markdown`, which serves clean source MDX per page — unusually good agent affordance for a personal site.

### Honest caveat on "GEO/AEO"

Much of the advice circulating is vendor-invented and unevidenced. Worth separating:

- **Well-supported:** be crawlable, render server-side, use `Person`/`BlogPosting` schema, state facts explicitly, get corroborated off-site.
- **Cheap but speculative:** `llms.txt` — no major crawler is confirmed to consume it. ~20 minutes of work, might pay off. Don't sequence anything behind it.

---

## The plan

### Phase 1 — Get indexed (highest leverage, ~2 hours) — **shipped in PR #15**

Nothing else matters until crawlers can find the pages.

1. ✅ **`src/app/sitemap.ts`** — generated from `getAllProjects()` / `getAllPosts()`, so it stays current automatically. Project entries omit `lastModified` (their dates are ranges like `"Ongoing"`, not timestamps).
2. ✅ **`src/app/robots.ts`** — allows all, disallows only `/api/og` and `/api/explain`, points to the sitemap. **`/api/markdown` is deliberately left crawlable** — it serves clean source MDX and is the most agent-useful endpoint on the site. An earlier blanket `Disallow: /api/` would have blocked it.
3. ✅ **AI crawler consent stated explicitly** — GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot et al. are allowed by an explicit rule block rather than by silence, since assistant citation is a goal here.
4. ✅ **`metadataBase`** in `src/app/layout.tsx`, with title/description sourced from `siteConfig` (they had drifted apart).
5. ✅ **`alternates.canonical`** on all four routes.
6. ✅ **`/projects/template` no longer public** — `dynamicParams = false` on both dynamic routes, so unregistered slugs 404 while the authoring scaffold stays in the repo.
7. ⬜ **Google Search Console** — verify the domain, submit the sitemap, request re-indexing of the homepage to clear the stale Uniswap snippet. Also Bing Webmaster Tools (it feeds ChatGPT search). *Manual — must happen after deploy.*

*Expected result: 13 indexed pages instead of 2 — a ~6x increase in surface area, from plumbing alone.*

### Phase 2 — Say what you are (~4 hours, incl. off-site profiles)

Copy, structured data, and profile consistency ship **together** — see the agent-optimization section above for why the off-site half can't be deferred.

7. **Rewrite the site description** to lead with roles you want to be found for. Something like:

   > Fred Zaw — product designer and design engineer in Oakland, CA. Currently at Clay building AI and agentic interfaces. Previously Uniswap Labs, TikTok Effect House (AR), and Matterport (3D/spatial capture).

   That single sentence carries *product designer*, *design engineer*, *AI*, *agentic*, *AR*, *3D/spatial* — the full target set — and every claim in it is true. Update `src/app/config/site.ts`, which propagates to the homepage `<meta>`, OG, and Twitter cards.

8. **`title.template: "%s — Fred Zaw"`** in the root layout, with `title.default` set to the full positioning string.

9. **Homepage `<h1>`** → `Fred Zaw` with a visible subtitle line reading "Product Designer & Design Engineer." Keeps the minimal look, adds the words that matter.

10. **Rewrite the about page's title, description, and `<h1>`.** Title: `About — Fred Zaw`. Description should be a dense, honest career summary naming the disciplines and companies. `<h1>`: something like "About Fred Zaw — Product Designer & Design Engineer."

11. **Project metadata rewrite** — the three case-study descriptions are currently one-liners. Rewrite each to name the discipline and technology:
    - `tiktok`: currently *"A desktop design tool for creators using spatial computing"* → work in AR authoring, computer vision, 0→1 founding design, design systems.
    - `swap` / `lp-redesign`: name the AI, prototyping, and design-engineering angles explicitly.

12. **JSON-LD.** A `Person` schema on the homepage (`name`, `jobTitle`, `knowsAbout: ["Product Design", "Design Engineering", "AI", "Augmented Reality", "Spatial Computing"]`, `sameAs` linking Twitter/LinkedIn/Dribbble/Are.na/read.cv) plus `BlogPosting` on posts. The single strongest lever for both knowledge panels and AI-assistant citation — the one place capability is asserted as machine-readable fact rather than inferred from prose.

13. **Add an extractable capability sentence** to the about page — one self-contained line that answers "what has this person actually shipped" without requiring inference across clauses. e.g. *"I've shipped AR authoring tools (TikTok Effect House), 3D capture and spatial UX (Matterport), trading interfaces (Uniswap Labs), and agentic AI product work (Clay)."* Keep the existing narrative; this sits alongside it. This is the single highest-value edit for agent citation.

14. **Consolidate the identity graph** *(off-site, no code)*. Profiles exist on read.cv, LinkedIn, Dribbble, about.me, Are.na, theorg.com. Every one should link to `fredz.website` and use the **same role wording as item 7**. Consistent cross-linking teaches Google these are one person, feeds the `sameAs` above, and — most importantly — provides the multi-source corroboration that makes assistants willing to state your role as fact.

### Phase 3 — Build surface area (~4 hours)

15. **`/projects` index page** — `<h1>Product Design & Design Engineering Work</h1>`, with each case study summarized. A real landing page for portfolio queries.
16. **`/posts` index page** — same pattern for writing.
17. **`/tags/[tag]` routes** from existing post tags. Free pages from data you already have.
18. **Add a `/uses` or `/stack` page** — reliably well-indexed for this audience, cheap to write, and signals design-engineering fluency.
19. **`.md` variants of each page** — you're most of the way there with `/api/markdown`. Exposing a stable, linkable plain-text URL per page (e.g. `/posts/[slug].md`) is the substantive version of the `llms.txt` idea, and unlike `llms.txt` it works with crawlers that exist today.
20. **`llms.txt`** at the root, listing your pages with descriptions. ~20 min. Speculative — no major crawler is confirmed to consume it — so don't sequence anything behind it.
21. **RSS feed** at `/rss.xml`.

### Phase 4 — Authority (ongoing, not a code change)

22. **Write to your differentiators.** Your rarest, most defensible angle is the *intersection*: someone who shipped AR authoring tools at TikTok, 3D capture at Matterport, and is now building agentic AI interfaces. Almost nobody has that combination. Posts on "designing for spatial computing," "what AR taught me about AI interfaces," or "design engineering with LLMs" would rank in low-competition territory *and* be exactly what your target audience is searching for. They also give assistants something specific to cite you *for*, beyond your job title.
23. **Flesh out or consolidate the two thin posts** (`gorpcore-analysis`, `thoughts-on-the-brutalist`).

---

## Suggested order

| Phase | Effort | Impact |
|-------|--------|--------|
| 1 — Get indexed | ~2h | **Critical.** Unblocks everything. *(shipped)* |
| 2 — Positioning + schema + profiles | ~4h | **High.** Decides what you rank for *and* what assistants will say about you. |
| 3 — Surface area | ~4h | Medium. Compounds over time. |
| 4 — Authority | Ongoing | Highest long-term ceiling. |

Phases 1 and 2 together are about a day of work and address every structural problem found. Phase 1 alone is the difference between 2 and 13 indexed pages.

Note that Phase 2 absorbed the identity-graph work that was previously Phase 4. It's off-site profile editing rather than code, but it's load-bearing for agent citation and shouldn't trail the copy changes.

---

## Honest caveat

SEO for a personal site is a slow instrument. Even done perfectly, expect 4–12 weeks before ranking changes show up, and personal sites rarely outrank LinkedIn for a name query. The realistic wins here are: (a) ranking for **your own name** across all pages instead of two, (b) appearing for long-tail role queries like *"design engineer AR spatial computing portfolio"* where competition is thin and your background is genuinely unusual, and (c) being **citable by AI assistants**, which is increasingly how recruiters and founders actually research people — and which the JSON-LD, `llms.txt`, and clean semantic HTML directly serve.
