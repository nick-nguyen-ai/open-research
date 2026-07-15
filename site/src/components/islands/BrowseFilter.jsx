import { useMemo, useState } from "react";
import { applyFilter } from "./filter-logic.mjs";
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
  const shown = useMemo(() => applyFilter(cards, { tier, category, tag }), [cards, tier, category, tag]);

  return (
    <div>
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
