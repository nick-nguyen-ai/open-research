export function applyFilter(cards, { tier = "all", category = "all", tag = null } = {}) {
  return cards.filter((c) =>
    (tier === "all" || c.tier === tier) &&
    (category === "all" || c.category === category) &&
    (!tag || c.tags.includes(tag))
  );
}
