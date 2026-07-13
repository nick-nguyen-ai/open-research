import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import rehypeSections from "./src/lib/rehype-sections.mjs";

export default defineConfig({
  site: "https://openresearch.example.internal",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  markdown: { rehypePlugins: [rehypeSections] }
});
