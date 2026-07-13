const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let observers = [];

function revealAll() {
  document.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
  document.querySelectorAll("[data-count-to]").forEach((el) => { el.textContent = el.dataset.countTo; });
}

function initReveals() {
  const els = document.querySelectorAll(".rv:not(.on)");
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      const sibs = el.parentElement ? [...el.parentElement.children].filter((s) => s.classList.contains("rv")) : [];
      const idx = sibs.indexOf(el);
      el.style.transitionDelay = `${idx > 0 ? idx * 110 : 0}ms`;
      el.classList.add("on");
      io.unobserve(el);
    }
  }, { threshold: 0.18 });
  els.forEach((el) => io.observe(el));
  observers.push(io);
}

function animNum(el, to, dur = 900) {
  let t0 = null;
  const fr = (t) => {
    if (!t0) t0 = t;
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(fr);
  };
  requestAnimationFrame(fr);
}

function initCounts() {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      animNum(en.target, Number(en.target.dataset.countTo));
      io.unobserve(en.target);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count-to]").forEach((el) => io.observe(el));
  observers.push(io);
}

function initScrollSpy() {
  const toc = document.querySelector(".rail-toc");
  if (!toc) return;
  const links = new Map(
    [...toc.querySelectorAll("a[href^='#']")].map((a) => [a.getAttribute("href").slice(1), a])
  );
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const id = en.target.querySelector("h2")?.id;
      if (!id || !links.has(id)) continue;
      links.forEach((a) => a.removeAttribute("aria-current"));
      links.get(id).setAttribute("aria-current", "true");
    }
  }, { rootMargin: "-20% 0px -60% 0px" });
  document.querySelectorAll("[data-section]").forEach((s) => io.observe(s));
  observers.push(io);
}

function init() {
  observers.forEach((o) => o.disconnect());
  observers = [];
  if (reduced() || !("IntersectionObserver" in window)) { revealAll(); return; }
  initReveals();
  initCounts();
  initScrollSpy();
}

document.addEventListener("click", async (e) => {
  const toggle = e.target.closest("[data-theme-toggle]");
  if (toggle) {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" ||
      (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("theme", root.dataset.theme);
    return;
  }
  const copy = e.target.closest("[data-copy]");
  if (copy) {
    const target = document.querySelector(copy.dataset.copy);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      const prev = copy.textContent;
      copy.textContent = "Copied";
      setTimeout(() => { copy.textContent = prev; }, 1500);
    } catch { /* clipboard unavailable (http/no permission) — leave button as-is */ }
  }
});

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:after-swap", () => {
  const t = localStorage.getItem("theme");
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
});
init();
