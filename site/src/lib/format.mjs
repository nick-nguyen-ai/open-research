const TIER_LABELS = {
  finding: "Finding",
  "technical-report": "Technical report",
  "research-paper": "Research paper",
  tutorial: "Tutorial",
  note: "Note"
};

export function tierLabel(tier) {
  return TIER_LABELS[tier] ?? tier;
}

// en-GB, not en-AU: on this Node/ICU (CLDR) build, en-AU's "short" month style
// renders the full month name ("30 June") instead of the abbreviation the spec
// requires ("30 Jun"). en-GB produces the same day/month order and abbreviates
// correctly, so it's used for both styles to keep formatting consistent.
export function fmtDate(d, style = "long") {
  const date = d instanceof Date ? d : new Date(`${d}T00:00:00Z`);
  if (style === "short") {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
  }
  if (style === "full") {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function readTime(body) {
  const words = body.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

export function firstSentence(text) {
  const t = text.trim().replace(/\s+/g, " ");
  const m = t.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : t).slice(0, 200);
}

// Mirrors github-slugger's output for the heading set our templates allow.
export function slugifyHeading(text) {
  return text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Lowercase-hyphenated person slug used for /people/<handle> routes and Arena handles.
export function slugifyName(name) {
  return name.toLowerCase().trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
