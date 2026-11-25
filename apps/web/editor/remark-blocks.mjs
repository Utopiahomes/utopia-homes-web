import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import "./markdown-inline.js";

// Edit build only: tags each article paragraph, heading and one-paragraph list item so the owner can
// edit it on the page. A block is tagged only when writing it back gives exactly the text it came
// from, so an edit never disturbs formatting the editor doesn't understand (Fable review, 2026-11-19).
// Written for Sätteri, Astro 7's Markdown processor (plugins see mdast nodes through a context).

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const { parse, toMarkdown } = globalThis.StoinMarkdown;

/** The one way the editor writes each inline mark, or null for anything it doesn't write. */
function canonical(nodes) {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") out += node.value.replace(/[\\*`[\]]/g, "\\$&");
    else if (node.type === "strong" || node.type === "emphasis") {
      const inner = canonical(node.children ?? []);
      if (inner === null) return null;
      out += node.type === "strong" ? `**${inner}**` : `*${inner}*`;
    } else if (node.type === "inlineCode" && !node.value.includes("`")) out += `\`${node.value}\``;
    else if (node.type === "link" && !node.title) {
      const inner = canonical(node.children ?? []);
      if (inner === null) return null;
      out += `[${inner}](${node.url})`;
    } else return null;
  }
  return out;
}

const documents = new WeakMap();

/** Where this document sits in its file, worked out once per document. */
function documentOf(context) {
  const cached = documents.get(context.data);
  if (cached !== undefined) return cached;
  let found = null;
  const slug = context.data?.astro?.frontmatter?.slug;
  if (typeof slug === "string" && context.fileURL) {
    const path = fileURLToPath(context.fileURL);
    const body = context.source;
    const base = readFileSync(path, "utf8").indexOf(body);
    if (base !== -1) {
      const name = relative(repositoryRoot, path).split(sep).join("/");
      found = { slug, name, base, body, mdx: name.endsWith(".mdx") };
    }
  }
  documents.set(context.data, found);
  return found;
}

function tag(context, target, id, inline) {
  const document = documentOf(context);
  if (!document) return;
  const children = inline.children ?? [];
  const start = children[0]?.position?.start?.offset;
  const end = children.at(-1)?.position?.end?.offset;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return;
  const source = document.body.slice(start, end);
  if (/[\n<>]/.test(source) || (document.mdx && /[{}]/.test(source))) return;
  if (canonical(children) !== source) return;
  const nodes = parse(source, "inline");
  if (nodes === null || toMarkdown(nodes, "inline") !== source) return;
  const data = { ...(target.data ?? {}) };
  data.hProperties = {
    ...(data.hProperties ?? {}),
    "data-stoin-key": `article.${document.slug}.${id}`,
    "data-stoin-format": "markdown",
    "data-stoin-src": `${document.name}:${document.base + start}:${document.base + end}`,
  };
  context.setProperty(target, "data", data);
}

const atTop = (context, node) => context.parent(node)?.type === "root";

export const stoinBlocks = {
  name: "stoin-edit-blocks",
  options: { position: true },
  paragraph(node, context) {
    if (atTop(context, node)) tag(context, node, `b${context.indexOf(node)}`, node);
  },
  heading(node, context) {
    if (atTop(context, node)) tag(context, node, `b${context.indexOf(node)}`, node);
  },
  listItem(node, context) {
    const list = context.parent(node);
    if (!list || !atTop(context, list)) return;
    const children = node.children ?? [];
    if (children.length !== 1 || children[0].type !== "paragraph") return;
    tag(context, node, `b${context.indexOf(list)}.${context.indexOf(node)}`, children[0]);
  },
};
