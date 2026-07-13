import test from "node:test";
import assert from "node:assert/strict";
import rehypeSections from "../src/lib/rehype-sections.mjs";

const h2 = (text) => ({ type: "element", tagName: "h2", properties: {}, children: [{ type: "text", value: text }] });
const p = (text) => ({ type: "element", tagName: "p", properties: {}, children: [{ type: "text", value: text }] });

test("wraps h2 regions into sections with data-section slugs", () => {
  const tree = { type: "root", children: [p("lede"), h2("You'll need"), p("a"), h2("Steps"), p("b"), p("c")] };
  rehypeSections()(tree);
  assert.equal(tree.children.length, 3);
  assert.equal(tree.children[0].tagName, "p");
  const [, s1, s2] = tree.children;
  assert.equal(s1.tagName, "section");
  assert.equal(s1.properties.dataSection, "youll-need");
  assert.deepEqual(s1.children.map((n) => n.tagName), ["h2", "p"]);
  assert.equal(s2.properties.dataSection, "steps");
  assert.deepEqual(s2.children.map((n) => n.tagName), ["h2", "p", "p"]);
});

test("tree without h2s is untouched", () => {
  const tree = { type: "root", children: [p("only")] };
  rehypeSections()(tree);
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].tagName, "p");
});
