# Ask-on-Browse: conversational document recommender - Design

Date: 2026-07-23
Status: approved (brainstormed with Nick; placement and engine decided via Q&A)

## Goal

Let a visitor describe what they are working on in natural language and get the
matching OpenResearch contributions recommended to them, conversationally, on
the existing `/browse` page. Phase 1 ships entirely client-side on the static
site: real retrieval, template-composed replies, no LLM and no backend. Phase 2
(out of scope here) swaps a backend LLM engine behind the same interface with
zero UI change.

## Decisions taken during brainstorming

- Engine: client-side retrieval (BM25 over the committed `qa-index.json`), not
  an LLM. The conversational layer is template text over real ranking data.
- Placement: integrated into `/browse`, not a dedicated `/ask` page. The
  recommendations ARE browse cards; the chat drives the existing filter chips
  and reorders the existing grid. A dedicated page remains an option for
  phase 2 if replies become prose answers.
- Mock depth: phase 1 must genuinely work as a recommender on GitHub Pages -
  no canned conversations.

## UX behavior (phase 1)

All on `/browse`, rendered by the existing `BrowseFilter` island.

1. **Ask bar.** A text input above the filter chip row: placeholder
   "Describe what you are working on...". Submit on Enter or a Send button.
   Empty or whitespace-only input is ignored.
2. **Assistant band.** After a submit, a band renders between the ask bar and
   the chip row containing:
   - what was understood: the extracted search terms and any detected filters;
   - the match count ("4 contributions match");
   - why the top match ranks first: its title, the section headings that
     matched, and its `result` metric when present;
   - a "Start over" action that clears the conversation, detected chips, and
     restores the full date-ordered grid.
   The band has `aria-live="polite"` so screen readers announce new replies.
3. **Chips stay the single source of truth for filters.** Tier, category, and
   tag mentions detected in the message are applied by setting the existing
   chip state (`tier`, `category`, `tag`) - visibly active, hand-removable as
   always. If the user hand-edits chips mid-conversation, the hand edit wins:
   the next turn treats current chip state as ground truth and only applies
   newly detected mentions from that latest message.
4. **Grid reorders by relevance.** With an active conversation, the grid shows
   only matching cards (BM25 doc score > 0 after chip filtering), ordered by
   score descending. "Start over" restores the default full grid. The count
   line ("N contributions") keeps working over the shown set.
5. **Follow-up turns refine in place.** The bar stays after a reply. A new
   message accumulates: its terms are appended to the terms of earlier turns
   in the same conversation, so "something about latency" then "for batch
   inference" narrows rather than restarts. Detected chips from the new
   message are applied on top of current chip state.
6. **No-match state.** If nothing scores above zero, the band says so and
   suggests removing active chips or rephrasing; the grid falls back to
   showing the chip-filtered (unranked) set so the page is never empty while
   chips alone still match something.
7. **Failure state.** If `/qa-index.json` cannot be fetched, the band explains
   that ranked recommendations are unavailable and detected chips still apply
   (filtering degrades gracefully to what the page already does today).
8. **Mobile.** Single column as today; bar, band, chips, grid stack in that
   order. No separate layout work beyond existing responsive styles.

## Architecture

### New pure module: `site/src/components/islands/ask-logic.mjs`

Mirror of `filter-logic.mjs`: pure functions, zero dependencies, imported by
both the island and `node --test` tests.

- `parseIntent(message, filters)` ->
  `{ terms: string[], detected: { tier, category, tag } }`
  Lowercases the message, matches whole-word occurrences of tier values
  (including the human label forms, e.g. "technical report" for
  `technical-report`), category values, and tag values from the `filters.json`
  vocabulary. Matched words are removed from the term list; remaining tokens
  (tokenized like `bm25.mjs` `tokenize`, stopwords dropped) become search
  terms. First match wins per facet within one message.
- `accumulateTerms(turns)` -> `string[]`
  Deduplicated union of `terms` across the conversation's user turns, in
  first-seen order.
- `rankDocs(index, terms, activeChips, cards)` ->
  `[{ slug, score, sections: string[] }]`
  Runs `bm25.mjs` `search(index, terms.join(" "), k = index.chunks.length)`,
  keeps chunks whose card passes `applyFilter(cards, activeChips)`, and
  aggregates per document: doc score = max chunk score; tie-break by number of
  matching chunks, then slug. `sections` lists the matching chunk section
  headings in score order (max 3).
- `composeReply({ terms, detected, ranked, cards })` -> `string`
  The template text for the assistant band, per the UX spec above. Pure
  string composition so it is unit-testable.
- `askEngine(turns, activeChips, deps)` ->
  `{ reply, rankedSlugs, detectedChips }`
  Orchestrates the above. `deps` carries `{ index, cards, filters }` so tests
  inject fixtures. This signature is the phase 2 seam.

### Island changes: `BrowseFilter.jsx`

- New state: `turns` (user messages), `reply`, `rankedSlugs`, `indexStatus`
  (`idle | loading | ready | failed`).
- Lazily `fetch("/qa-index.json")` on the first submit only; cache in a ref.
- On submit: `parseIntent` -> apply `detected` to chip state ->
  `askEngine` -> render band, reorder/restrict grid by `rankedSlugs`.
- Rendering of cards, chips, and count is unchanged; the shown list is
  `rankedSlugs` mapped to cards while a conversation is active, otherwise the
  existing `applyFilter` result. When a conversation is active but ranking
  yields nothing (no-match state) or the index failed to load, the shown list
  falls back to the `applyFilter` result, matching the UX spec.
- The island stays the only React entry point; no new island.

### Data

- `/qa-index.json` is already built by `site/scripts/build-index.mjs`,
  committed, and served from `site/public/` - available in both dev and
  built site. No build changes.
- `cards` and `filters` are already props of the island. No derive changes.

## Phase 2 seam (defined now, built later)

`askEngine(turns, activeChips, deps)` is the swap point. Phase 2 adds a site
config value `askEndpoint` (default `null`, same pattern as
`platform.config.json` `repo`). When set, the island POSTs
`{ turns, activeChips }` to the endpoint and expects the same
`{ reply, rankedSlugs, detectedChips }` shape back; when `null`, the local
BM25 engine runs. UI, band, chips, and grid are identical either way.
Flipping `askEndpoint` is Nick's explicit call, like `repo`.

## Testing

`site/test/ask-logic.test.js`, bare `node --test`, fixture corpus built with
`bm25.mjs` `buildIndex` (no network, no DOM):

- `parseIntent`: detects tier by value and by label form; detects category and
  tag; strips detected words from terms; drops stopwords; returns empty
  detection for plain prose.
- `accumulateTerms`: union across turns, dedupe, order preserved.
- `rankDocs`: aggregates chunk scores to max-per-doc; respects active chips
  (a chip-excluded doc never appears); deterministic tie-break; `sections`
  capped at 3 and score-ordered.
- `composeReply`: names the top match and its sections; includes `result`
  metric when present; correct no-match text.
- `askEngine`: end-to-end over fixtures; chip-override semantics (hand-set
  chip survives a turn that detects nothing for that facet); multi-turn
  accumulation narrows results.

Island rendering follows the existing pattern of not being unit-tested
(consistent with `SearchOverlay.jsx`); the logic layer carries the coverage.

## Out of scope

- Any LLM call, API key handling, or backend service (phase 2).
- A dedicated `/ask` page.
- Conversation persistence (URL or localStorage); refresh starts clean.
- Changes to Pagefind search, `qa-index.json` build, or the MCP server.

## Files

- Create: `site/src/components/islands/ask-logic.mjs`
- Create: `site/test/ask-logic.test.js`
- Modify: `site/src/components/islands/BrowseFilter.jsx`
- Modify: `site/src/styles/global.css` (ask bar + assistant band styles)
