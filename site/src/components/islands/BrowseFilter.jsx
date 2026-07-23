import { useMemo, useRef, useState } from "react";
import { applyFilter } from "./filter-logic.mjs";
import { parseIntent, askEngine } from "./ask-logic.mjs";
import { tierLabel } from "../../lib/format.mjs";

function Chip({ label, active, onClick }) {
  return (
    <button type="button" className="fchip" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

export default function BrowseFilter({ cards, filters, initial = {} }) {
  const [tier, setTier] = useState(initial.tier ?? "all");
  const [category, setCategory] = useState(initial.category ?? "all");
  const [tag, setTag] = useState(initial.tag ?? null);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState([]);
  const [reply, setReply] = useState(null);
  const [rankedSlugs, setRankedSlugs] = useState([]);
  const indexRef = useRef(null); // fetched qa-index, cached across turns
  const failedRef = useRef(false);

  const filtered = useMemo(() => applyFilter(cards, { tier, category, tag }), [cards, tier, category, tag]);
  const shown = useMemo(() => {
    if (turns.length === 0 || rankedSlugs.length === 0) return filtered;
    // Ranked order, constrained by the live chip state so hand edits win
    // immediately; empty intersection falls back to the chip-filtered set.
    const bySlug = new Map(filtered.map((c) => [c.slug, c]));
    const ranked = rankedSlugs.map((s) => bySlug.get(s)).filter(Boolean);
    return ranked.length > 0 ? ranked : filtered;
  }, [turns, rankedSlugs, filtered]);

  async function ensureIndex() {
    if (indexRef.current || failedRef.current) return indexRef.current;
    try {
      const res = await fetch("/qa-index.json");
      if (!res.ok) throw new Error(String(res.status));
      indexRef.current = await res.json();
    } catch {
      failedRef.current = true;
    }
    return indexRef.current;
  }

  async function submit(e) {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    // Hand-set chips are ground truth; the latest message only adds newly
    // detected facets on top of them (spec UX item 3).
    const { detected } = parseIntent(message, filters);
    const nextChips = {
      tier: detected.tier ?? tier,
      category: detected.category ?? category,
      tag: detected.tag ?? tag
    };
    if (detected.tier) setTier(detected.tier);
    if (detected.category) setCategory(detected.category);
    if (detected.tag) setTag(detected.tag);
    const nextTurns = [...turns, message];
    setTurns(nextTurns);
    const index = await ensureIndex();
    if (!index) {
      setRankedSlugs([]);
      setReply("Ranked recommendations are unavailable - the search index could not be loaded. Any filters I detected are still applied.");
      return;
    }
    const out = askEngine(nextTurns, nextChips, { index, cards, filters });
    setReply(out.reply);
    setRankedSlugs(out.rankedSlugs);
  }

  function startOver() {
    setTurns([]);
    setReply(null);
    setRankedSlugs([]);
    setTier("all");
    setCategory("all");
    setTag(null);
  }

  return (
    <div>
      <form className="ask-bar" onSubmit={submit}>
        <input
          className="ask-input"
          value={draft}
          placeholder="Describe what you are working on..."
          aria-label="Describe what you are working on"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="ask-send" type="submit">Ask</button>
      </form>
      <div aria-live="polite">
        {reply && (
          <div className="ask-band">
            <p>{reply}</p>
            <button type="button" className="ask-reset" onClick={startOver}>Start over</button>
          </div>
        )}
      </div>
      <div className="bf-row">
        <Chip label="All tiers" active={tier === "all"} onClick={() => setTier("all")} />
        {filters.tiers.map((t) => (
          <Chip key={t.value} label={tierLabel(t.value)} active={tier === t.value}
                onClick={() => setTier(tier === t.value ? "all" : t.value)} />
        ))}
        <span className="bf-sep" aria-hidden="true" />
        <Chip label="All categories" active={category === "all"} onClick={() => setCategory("all")} />
        {filters.categories.map((c) => (
          <Chip key={c.value} label={c.value} active={category === c.value}
                onClick={() => setCategory(category === c.value ? "all" : c.value)} />
        ))}
        {tag && <Chip label={`# ${tag} ×`} active onClick={() => setTag(null)} />}
      </div>
      <p className="caps bf-count" aria-live="polite">
        {shown.length} contribution{shown.length === 1 ? "" : "s"}
      </p>
      <div className="bf-grid">
        {shown.map((c) => (
          <a key={c.slug} className="card" href={`/contributions/${c.slug}`}>
            <span className="caps" style={{ color: "var(--oxblood)" }}>
              {tierLabel(c.tier)} · {c.category}
            </span>
            <h3>{c.title}</h3>
            <p className="card-summary">{c.summary}</p>
            <div className="card-ev">
              <span className={c.replications > 0 ? "ev-verified" : ""}><b>{c.replications}</b> replication{c.replications === 1 ? "" : "s"}</span>
              <span><b>{c.teams}</b> team{c.teams === 1 ? "" : "s"}</span>
              {c.reviewStatus === "human" && <span className="ev-verified">peer-reviewed</span>}
              {c.reviewStatus === "machine" && <span>machine-reviewed</span>}
              {c.result && <span><b>{c.result}</b></span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
