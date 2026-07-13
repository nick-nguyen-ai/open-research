# M2 — Site MVP: UX/UI + Technical Design

**Date:** 2026-07-13 · **Status:** Approved (mockups) — spec pending user review · **Parent:** [`2026-07-13-openresearch-prototype-design.md`](2026-07-13-openresearch-prototype-design.md) (M2: F2 static site, F3 PR-based publishing surface)

Approved visual mockups (v3, "Imprint + margin rail" with tier anatomies and replay button):
<https://claude.ai/code/artifact/50443974-20a9-4a8e-a233-0b2442b729c8>
The mockup is the visual source of truth; this spec records the system behind it.

## Locked decisions

| Decision | Choice |
|---|---|
| Identity | Own identity ("Imprint"), not CBA-branded; all colors/type as design tokens for one-file re-skin |
| Color mode | Light-first, fully designed dark mode; toggle persisted, default follows OS |
| Animation | Refined micro-interactions + signature moments; everything ≤700ms; `prefers-reduced-motion` disables all |
| Direction | Imprint identity everywhere + Margin's annotation rail on reading pages (user-selected mix) |
| Stack | Astro (Vite) + Tailwind CSS + React islands + Pagefind — aligns with CBA's Tailwind/React/Vite stack |
| Paper-page devices | Principal-result band, action row, numbered sections + mini-TOC, citation block (SkillOpt-inspired, all four adopted) |
| Tier anatomies | Four distinct article layouts (finding / technical-report / tutorial / note) under one identity |

## Visual system ("Imprint")

**Palette (tokens, light / dark):**

| Token | Light | Dark | Role |
|---|---|---|---|
| `paper` | `#FBFAF7` | `#151A21` | ground |
| `ink` | `#1E2A38` | `#E8E4DB` | text, strong rules |
| `oxblood` | `#7A2E3A` | `#C25B69` | accent: links, labels, stamps, seals |
| `slate` | `#5B6470` | `#98A0AB` | secondary text |
| `hairline` | `#DFDBD2` | `#2C333E` | rules, borders |
| `soft` | `#F5F3EC` | `#1B222B` | hover/soft surfaces |

Dark is a designed inversion (blue-black ground, oxblood lightened two steps), not a naive flip. Tokens are CSS custom properties consumed by Tailwind config; re-skinning at CBA = one token file.

**Type:**
- **Newsreader 600** (display) + **Newsreader italic 500** (emphasis/ledes) — self-hosted woff2 in `site/public/fonts/` (no CDN; required for GHE anyway).
- **Charter/Georgia stack** for prose (zero font payload, excellent on Windows).
- System sans for UI labels, set as spaced small caps (10–12px, letter-spacing ≥ .14em).
- Mono (`ui-monospace`/Consolas) only for code and keyboard hints.
- Measure 65ch; `text-wrap: balance` on headings; `font-variant-numeric: tabular-nums` wherever digits align.

**Voice:** masthead reads "Open*Research*" (italic half in oxblood). Verification is stamped, not badged — the oxblood "Verified" stamp (slight rotation, press-in animation) is the signature device.

## Page inventory

1. **Home `/`** — masthead + nav (Browse, Benchmarks, Arena, Toolkit, ⌘K hint); hero (caps kicker, Newsreader headline, standfirst, tick-up stats: contributions / replications / teams); "Verified this week" featured cards (earned visibility per P3); recent list.
2. **Browse `/browse`** — filter chips (tier, category, tag; active = ink-inverted), result count, card grid. Client-side filtering over build-time JSON (React island).
3. **Contribution `/contributions/<id>`** — per-tier anatomy (below) + evidence rail.
4. **Tag/category pages `/tags/<tag>`, `/categories/<cat>`** — thin wrappers pre-filtering the browse island.
5. **Contribute `/contribute`** — static page: PR flow, tier templates, pointer to toolkit (M3).
6. **Placeholders** — `/benchmarks`, `/arena`, `/toolkit` render a styled "coming in M3/M6" page so nav never reshuffles.
7. **404** — Imprint-styled, search prompt.

**Cards** (home/browse): caps tier·category label (oxblood), Newsreader title (hover → oxblood), one-line summary, evidence line (`N replications · N teams · headline delta`, tabular).

## Contribution page anatomy

**Common chrome (all tiers):** masthead; caps tier·category label; Newsreader title; byline (author bold, team, date, read time).

**Finding — result-first:**
- Action row: quiet pill buttons — `⇩ Replication bundle` · `⌗ <benchmark>` · `❝ Copy citation`.
- **Principal-result band**: 2px ink rule top, hairline bottom; headline measurement large in Newsreader (`−60% cost per run`), sub-line with detail (`$18.40 → $7.30 · 30 nightly runs · scores unchanged · internal-eval-suite`).
- Numbered sections `01 Summary … 05 How to replicate` (numbers small caps oxblood).
- **Citation block** at end: "Reference this contribution" header + Copy button; body = internal citation line + permalink + git revision (short hash of last commit touching the file).

**Technical report — long-form:** italic Newsreader abstract lede; contents list up front; numbered sections; sticky rail TOC tracks reading position; figures/tables full measure with `overflow-x:auto`; action row + citation block same as finding; result band only if `result` present.

**Tutorial — hands-on:** "You'll need / You'll build" twin box (soft-ground left cell); numbered step blocks (oxblood step dots, bold step title, one-line description); code/checkpoint blocks first-class (`soft` ground, hairline border); no result band; citation block rendered.

**Note — no ceremony:** single narrow column, no rail; caps label includes full date; italic lede; prose; closing bar: `0 replications yet · Tried it? Add evidence →`.

**Evidence rail (finding, technical-report, and tutorial — every tier that can carry evidence; note is excluded. Right column ≥760px, stacks below content on mobile):**
- Mini-TOC (numbered links, current section highlighted).
- **Verified seal**: `✓ Verified × N` (oxblood box) — N = replication count; hidden when 0.
- Replication annotations: oxblood caps key (`Replication · <team>`), bold delta + benchmark, date + Verified stamp. Anchor dots sit on the rail's hairline.
- Endorsement annotations: italic Georgia quote + attribution.
- Rail footer: `Tried it on your workflow? Submit a replication →` (links to /contribute; M3 rewires to skill flow).

M2 renders replications/endorsements that already exist in `content/records/` (M1 loader parses them). Full evidence-trail features (adoptions, changelogs, per-claim anchoring) remain M5 — the rail is the architecture they slot into.

## Motion system

One dependency-free module (`site/src/scripts/motion.js` + a React hook for islands):
- **Reveal**: IntersectionObserver, rise 14px + fade, 700ms `cubic-bezier(.2,.6,.2,1)`, 110ms sibling stagger, fire-once.
- **Count-up**: cubic ease-out, 900ms, fires at 60% visibility (hero stats).
- **Stamp press**: scale 1.6→0.94→1 with −2° rotation, 450ms, delayed 350ms after its annotation reveals.
- **Signature 1 (home load)**: stats tick up; masthead rule draws in.
- **Signature 2 (reading)**: rail annotations settle in beside the prose as the reader scrolls; seal stamps last.
- **Signature 3 (navigation)**: Astro view transitions — card title morphs into article title.
- Micro: hover warms titles/links to oxblood; nav underline draws; ⌘K panel scales from 98% + backdrop fade.
- **Reduced motion**: `prefers-reduced-motion: reduce` disables everything (CSS media query + JS check); content never hidden without JS (reveal classes applied only when JS runs).

## Search (F2)

Pagefind indexes built HTML post-build. UI is a custom overlay (React island) on Pagefind's JS API, not the default widget:
- Open via ⌘K / Ctrl+K / masthead field; close on Esc.
- Panel: caps "Search" label, Newsreader query line with oxblood caret; hits show title (match underlined in oxblood) + meta line (tier · category · evidence). Keyboard-first: ↑↓ navigate, ↵ open.
- Footer: hint row + `N documents indexed at build`.

## Architecture & data flow

```
content/  ──(loadContent from @openresearch/validator)──►  site/scripts/derive.js
                                                              ├─ src/data/cards.json      (browse/home cards)
                                                              ├─ src/data/filters.json    (tiers/categories/tags + counts)
                                                              └─ src/data/stats.json      (hero counters)
Astro pages/layouts (static)  +  React islands: SearchOverlay, BrowseFilter
astro build ──► dist/ ──► pagefind --site dist
```

- **One parser**: derive scripts import the M1 validator's `loadContent` (add a package export to `@openresearch/validator`) — the site can never render what CI wouldn't validate.
- Derive runs as an npm script before `astro build`; it **fails loudly** (non-zero exit, file+field message) on malformed content — no silent drops.
- Contribution bodies render through Astro's markdown pipeline from `content/contributions/*/index.md`; replication bundles are linked as repo paths (raw file links), not copied into the site.
- Evidence is joined by `contribution_id` at derive time; git revision for citations read via `git log -1 --format=%h -- <file>` at build (the CI site-build job checks out with `fetch-depth: 0`; when history is unavailable — e.g. a tarball checkout — the citation omits the revision rather than failing).
- **Workspaces**: `site/` joins the root npm workspace list.
- **CI**: `site-build` job appended to `.github/workflows/validate.yml` (blocking): `npm ci → derive → astro build → pagefind → smoke checks`.

## Schema & template evolutions (M1 assets, updated in M2)

1. `contribution.schema.json`: optional `result` (string, e.g. `"−60% cost per run"`) and `result_detail` (string). Band renders only when `result` exists.
2. Tutorial template + `REQUIRED_HEADINGS`: `["What you'll learn", "Prerequisites", "Steps", "Wrap-up"]` becomes `["You'll need", "You'll build", "Steps", "Wrap-up"]` — the twin box supersedes the first two headings (validator + template + fixtures updated together).
3. Seed content updated to exercise both (prompt-cache-evals gains `result`/`result_detail`).

## Error handling

- Derive: malformed record → exit 1 with `file · field · expected vs found` (mirrors validator output style).
- Build: missing bundle path or broken internal link → build fails (reuse validator link containment rules against built routes).
- Site runtime: no JS = fully readable static pages (islands and motion are progressive enhancement); search unavailable message if Pagefind assets missing.

## Testing

- **Derive scripts**: `node:test` units — content fixtures → expected JSON (including: no records → seal hidden, note → no rail).
- **Build smoke (CI, blocking)**: `astro build` succeeds on real `content/`; key routes exist in `dist/` (`/`, `/browse`, contribution page per tier once seeded, 404); Pagefind index files present.
- **Link check**: built HTML internal hrefs resolve within `dist/`.
- **Motion QA checklist** (manual, in plan's final task): signature moments per spec; reduced-motion renders everything visible and static.
- Visual reference: the v3 mockup artifact.

## Out of scope (deferred)

- Marketplace page content, "Open in Claude Code" action (M3).
- Adoption records, changelogs, per-claim anchoring, discussions (M5, M8).
- Arena/benchmarks pages beyond styled placeholders (M6, M8).
- OG/social images, print styles, non-English content.
