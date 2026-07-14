# Emphasis design delta — color roles, focal points, landing hero

Design-layer only (freely changeable per CONTRACTS.md features-vs-designs). No derive
shapes, routes, or frozen interfaces move. Motivation: user feedback that pages read as
uniform texture — one accent (oxblood) marks everything, the type scale is narrow, and
no page has a single "start here" element.

## 1. Color roles (the core fix)

One color, one job:

| token | role | light | dark |
|---|---|---|---|
| `--oxblood` | brand + interactive ONLY (links, CTAs, hovers, stamps) | `#7A2E3A` | `#C25B69` |
| `--verified` | evidence ONLY (replication counts, seals, verified labels) | `#2F6B4A` | `#7CC29A` |
| `--t-finding` | tier identity: finding | `#A05A2C` | `#D08A55` |
| `--t-report` | tier identity: technical-report | `#3D5A80` | `#7FA3C8` |
| `--t-paper` | tier identity: research-paper | `#5B3A6E` | `#A984C0` |
| `--t-tutorial` | tier identity: tutorial | `#33707A` | `#6FB3BF` |
| `--t-note` | tier identity: note | `#5B6470` | `#98A0AB` |

Tier hues appear ONLY as: card spine (3px left border), tier word in eyebrows, result-band
top rule, toolkit gallery group rules. Never body text, never backgrounds. Mechanism:
`[data-tier="X"] { --tier: var(--t-X) }` set once in global.css; components read `var(--tier)`.

Consequential de-emphasis: article-body `h2` drops from oxblood to slate (section labels
are wayfinding, not content); Card eyebrows keep only the tier word colored.

## 2. One focal element per page

- **Card**: `result` leaves the 12px metadata row and becomes `.card-result` — display
  serif, 18px, ink — directly under the title. Replication count turns `--verified` when > 0.
- **Contribution page**: ResultBand top rule becomes 3px `var(--tier)`; band unchanged
  otherwise (it is already the focal element once eyebrow/h2 noise drops).
- **Home**: hero becomes a landing moment (below).
- **Arena**: leader callout in the header — current #1 name + score in display scale.
- **Toolkit**: install command promoted to 14px; gallery group rules take tier hues.

## 3. Landing hero (home)

Two-column hero: left = selling message + CTA row + statline; right = featured proof
(top verified contribution with a result: its result in display scale, title, evidence line,
links to the page). CTAs: primary filled `.abtn-primary` "Read a verified finding" →
featured page; secondary "Contribute in 15 minutes" → /contribute; "Install the toolkit"
→ /toolkit. Dashboard sections unchanged below. Statline numbers 22 → 30px.

## 4. Type ladder

Key numbers gain a display tier (statline 30px, leader/featured numbers 32-36px);
body and card text unchanged. The ladder, not decoration, carries reading order.
