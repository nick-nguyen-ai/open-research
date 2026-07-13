import { slugifyHeading } from "./format.mjs";

function textOf(node) {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

export default function rehypeSections() {
  return (tree) => {
    const out = [];
    let current = null;
    for (const node of tree.children) {
      if (node.type === "element" && node.tagName === "h2") {
        current = {
          type: "element",
          tagName: "section",
          properties: { dataSection: slugifyHeading(textOf(node)) },
          children: [node]
        };
        out.push(current);
      } else if (current) {
        current.children.push(node);
      } else {
        out.push(node);
      }
    }
    tree.children = out;
  };
}
