import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const contributions = defineCollection({
  loader: glob({ pattern: "*/index.md", base: "../content/contributions" })
});

export const collections = { contributions };
