import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import rehypeSections from "./src/lib/rehype-sections.mjs";

export default defineConfig({
  site: "https://openresearch.example.internal",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Pagefind's runtime is emitted into dist/pagefind/ by the `pagefind` CLI
    // *after* this build step, so it never exists on disk at bundle time —
    // tell Rollup not to try to resolve/bundle the dynamic import in
    // SearchOverlay.jsx and leave it as a runtime browser import instead.
    build: { rollupOptions: { external: ["/pagefind/pagefind.js"] } }
  },
  markdown: { rehypePlugins: [rehypeSections] }
});
