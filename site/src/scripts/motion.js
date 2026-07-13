function init() {}
document.addEventListener("astro:page-load", init);
document.addEventListener("astro:after-swap", () => {
  const t = localStorage.getItem("theme");
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
});
init();
