#!/usr/bin/env node
// Publishing adapter for the Stoin Sites editor. Reads {"edits":[{source,previous,value}]} on stdin.
// Either every edit is applied or nothing changes. Only the edited values change in each file.
//
// Kinds of source (the manifest's `source`, opaque to Stoin):
// - JSON wording: {file, pointer} in apps/web/src/site-content/*.json
// - markdown: {file, kind: "markdown", start, end} an article or legal paragraph, written as is
// - frontmatter: {file, kind: "frontmatter", field} a one-line quoted article value
// - layout: {file: ".../layout.json", kind: "layout", page} a page's section order, hidden sections
//   and added sections, as JSON text
// - order: {file: ".../lists.json", kind: "order", list} the ids a list shows, in order, as JSON text
// - new_article: {file: ".../thinking/<slug>.md", kind: "new_article"} a new post; previous is "" and
//   value is the post as JSON {slug, title, subtitle, summary, type, published_at, tags, photo,
//   blocks: [{kind: p|h2|h3|quote|li, text}]}. This file decides the article's front matter.

import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const contentDirectory = join(root, "apps", "web", "src", "site-content");
const articleDirectory = join(root, "apps", "web", "src", "content", "thinking");
const photoPath = /^\/images\/[\w\-./]+\.(?:jpe?g|png|webp)$/;
const blockSyntax = /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\s)/;
const legalFiles = new Set(["privacy.md", "terms.md"]);
const articleFields = new Set(["title", "subtitle", "summary", "social_image", "founder_vision_pull_quote", "cta_title", "cta_copy", "cta_label"]);

function finish(result, exitCode) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCode;
}

/** Returns the file's full path and what it is, or throws a plain reason. */
function resolveFile(file) {
  if (typeof file !== "string" || file === "") throw new Error("source.file is missing");
  if (isAbsolute(file) || file.includes("\\")) throw new Error("source.file must be a path inside the repository");
  const fullPath = resolve(root, file);
  let realPath;
  try {
    realPath = realpathSync(fullPath);
  } catch {
    throw new Error("file does not exist");
  }
  const folder = dirname(realPath);
  const name = basename(realPath);
  if (folder === realpathSync(contentDirectory)) {
    if (name === "private.json") throw new Error("private-area wording cannot be edited");
    if (name === "layout.json") return { fullPath, type: "layout" };
    if (name === "lists.json") return { fullPath, type: "lists" };
    if (name.endsWith(".json")) return { fullPath, type: "json" };
    if (legalFiles.has(name)) return { fullPath, type: "legal" };
  }
  if (folder === realpathSync(articleDirectory) && /^[^_].*\.mdx?$/.test(name)) {
    return { fullPath, type: name.endsWith(".mdx") ? "mdx" : "md" };
  }
  const inside = relative(root, fullPath);
  if (inside.startsWith("..")) throw new Error("file is outside the repository");
  throw new Error("only site wording, articles, and the Privacy and Terms pages can be edited");
}

/** Finds where the string at `pointer` sits in the file's text, as [start, end] offsets. */
function locateString(text, pointer) {
  let index = 0;
  let found = null;

  const skipSpace = () => {
    while (" \t\r\n".includes(text[index]) && index < text.length) index += 1;
  };
  const readString = () => {
    const start = index;
    index += 1;
    while (text[index] !== '"') index += text[index] === "\\" ? 2 : 1;
    index += 1;
    return [start, index];
  };
  const readValue = (depth, onPath) => {
    skipSpace();
    const character = text[index];
    if (character === "{") {
      index += 1;
      skipSpace();
      while (text[index] !== "}") {
        skipSpace();
        const [start, end] = readString();
        const name = JSON.parse(text.slice(start, end));
        skipSpace();
        index += 1;
        readValue(depth + 1, onPath && depth < pointer.length && pointer[depth] === name);
        skipSpace();
        if (text[index] === ",") index += 1;
        skipSpace();
      }
      index += 1;
    } else if (character === "[") {
      index += 1;
      skipSpace();
      let position = 0;
      while (text[index] !== "]") {
        readValue(depth + 1, onPath && depth < pointer.length && pointer[depth] === position);
        position += 1;
        skipSpace();
        if (text[index] === ",") index += 1;
        skipSpace();
      }
      index += 1;
    } else if (character === '"') {
      const span = readString();
      if (onPath && depth === pointer.length) found = span;
    } else {
      while (index < text.length && !",]} \t\r\n".includes(text[index])) index += 1;
    }
  };

  readValue(0, true);
  return found;
}

function checkWording(value, previous) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("new wording must not be empty");
  if (/[<>]/.test(value)) throw new Error("new wording must not contain < or >");
  if (photoPath.test(previous) && !photoPath.test(value)) throw new Error("a photo must stay a photo in /images");
}

/** The [start, end] of the published wording and what to write there, for one text edit. */
function textSpan(edit, file, text) {
  const { source, previous, value } = edit;
  if (typeof previous !== "string") throw new Error("previous wording is missing");

  if (file.type === "json") {
    const validPointer =
      Array.isArray(source.pointer) &&
      source.pointer.length > 0 &&
      source.pointer.every((part) => typeof part === "string" || (Number.isInteger(part) && part >= 0));
    if (!validPointer) throw new Error("source.pointer must be a list of names and positions");
    const span = locateString(text, source.pointer);
    if (!span) throw new Error("no wording at this pointer");
    if (JSON.parse(text.slice(span[0], span[1])) !== previous) throw new Error("the published wording has changed");
    checkWording(value, previous);
    return { span, replacement: JSON.stringify(value) };
  }

  if (source.kind === "frontmatter") {
    if (file.type !== "md" && file.type !== "mdx") throw new Error("only articles have front matter");
    if (!articleFields.has(source.field)) throw new Error("this article value cannot be edited");
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!front) throw new Error("the article has no front matter");
    const lineStart = front[0].indexOf(`\n${source.field}: "`);
    if (lineStart === -1) throw new Error("the article value is not a one-line quoted value");
    const start = lineStart + 1;
    const end = front[0].indexOf("\n", start);
    const line = front[0].slice(start, end).replace(/\r$/, "");
    const quoted = line.slice(source.field.length + 2).trim();
    if (!/^"(?:[^"\\]|\\.)*"$/.test(quoted) || JSON.parse(quoted) !== previous) throw new Error("the published wording has changed");
    checkWording(value, previous);
    if (/[\r\n]/.test(value)) throw new Error("new wording must be one line");
    return { span: [start, start + line.length], replacement: `${source.field}: ${JSON.stringify(value)}` };
  }

  if (source.kind === "markdown") {
    if (file.type === "json" || file.type === "layout") throw new Error("this file has no paragraphs");
    let start = source.start;
    let end = source.end;
    if (!Number.isInteger(start) || !Number.isInteger(end) || text.slice(start, end) !== previous) {
      // The file moved since the edit copy was built: use the paragraph if it appears exactly once.
      const first = text.indexOf(previous);
      if (first === -1 || text.indexOf(previous, first + 1) !== -1 || previous === "") throw new Error("the published wording has changed");
      start = first;
      end = first + previous.length;
    }
    checkWording(value, previous);
    if (/[\r\n]/.test(value)) throw new Error("a paragraph must stay one paragraph");
    if (blockSyntax.test(value)) throw new Error("a paragraph cannot start with a heading, list or quote mark");
    if (file.type === "mdx" && /[{}]/.test(value)) throw new Error("article wording must not contain { or }");
    return { span: [start, end], replacement: value };
  }

  throw new Error("unknown kind of source");
}

const sortedJson = (value) => JSON.stringify(value);

// ---- A new article (the owner's editor, 2026-11-19) ----------------------------------------------
// The editor sends the post as data; this site decides how an article file looks.
const postKinds = { p: "", h2: "## ", h3: "### ", quote: "> ", li: "- " };
const postTypes = new Set(["story", "take", "learn"]);
const unsafeText = /[<>\r\n]|!\[|javascript:|\bon[a-z]+\s*=/i;
const lineStarts = /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\s|`{3}|~{3}|-{3}|={3})/;

function postText(value, name, { required = true, max = 600 } = {}) {
  if (typeof value !== "string") throw new Error(`${name} must be text`);
  if (required && value.trim() === "") throw new Error(`${name} must not be empty`);
  if (value.length > max) throw new Error(`${name} is too long`);
  if (unsafeText.test(value)) throw new Error(`${name} has characters an article can't hold`);
  return value.trim();
}

/** The whole article file for a post, or throws a plain reason. */
function articleFile(post) {
  if (!post || typeof post !== "object") throw new Error("the post is missing");
  const slug = post.slug;
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw new Error("the post's address is not valid");
  if (!postTypes.has(post.type)) throw new Error("the post's kind is not valid");
  if (typeof post.published_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(post.published_at)) throw new Error("the post's date is not valid");
  const title = postText(post.title, "the title", { max: 200 });
  const subtitle = postText(post.subtitle ?? "", "the subtitle", { required: false, max: 400 });
  const summary = postText(post.summary, "the summary", { max: 500 });
  const tags = Array.isArray(post.tags) ? post.tags.map((tag) => postText(tag, "a tag", { max: 60 })) : [];
  if (tags.length > 12) throw new Error("a post has at most 12 tags");
  let photo = "";
  if (post.photo) {
    if (typeof post.photo !== "string" || !photoPath.test(post.photo)) throw new Error("the post's photo must be in /images");
    photo = post.photo;
  }
  if (!Array.isArray(post.blocks) || post.blocks.length === 0 || post.blocks.length > 200) throw new Error("the post needs between 1 and 200 paragraphs");
  const body = [];
  let previous = "";
  for (const block of post.blocks) {
    if (!block || !Object.hasOwn(postKinds, block.kind)) throw new Error("a paragraph has an unknown kind");
    const text = postText(block.text, "a paragraph", { max: 5000 });
    if (lineStarts.test(text)) throw new Error("a paragraph cannot start with a heading, list or quote mark");
    if (/[{}]/.test(text)) throw new Error("article wording must not contain { or }");
    // List items sit together; everything else is a paragraph of its own.
    body.push(block.kind === "li" && previous === "li" ? "\n" : body.length ? "\n\n" : "", `${postKinds[block.kind]}${text}`);
    previous = block.kind;
  }
  const front = [
    "---",
    `title: ${JSON.stringify(title)}`,
    ...(subtitle ? [`subtitle: ${JSON.stringify(subtitle)}`] : []),
    `slug: ${JSON.stringify(slug)}`,
    `summary: ${JSON.stringify(summary)}`,
    `type: ${post.type}`,
    `published_at: ${post.published_at}`,
    "status: published",
    "featured: false",
    "author: CB Wilkinson",
    ...(photo ? [`social_image: ${JSON.stringify(photo)}`] : []),
    ...(tags.length ? ["tags:", ...tags.map((tag) => `  - ${JSON.stringify(tag)}`)] : ["tags: []"]),
    "---",
  ];
  return `${front.join("\n")}\n${body.join("")}\n`;
}

/** Refuses an address any article already uses, by its file name or its slug. */
function checkFreeSlug(slug, fileName) {
  const names = readdirSync(articleDirectory);
  if (names.includes(fileName)) throw new Error("an article with this address already exists");
  for (const name of names.filter((entry) => /\.mdx?$/.test(entry))) {
    const text = readFileSync(join(articleDirectory, name), "utf8");
    if (new RegExp(`^slug: "?${slug}"?\\s*$`, "m").test(text)) throw new Error("an article with this address already exists");
  }
}

function newArticle(edit, files) {
  const { source } = edit;
  if (typeof source.file !== "string" || !/^apps\/web\/src\/content\/thinking\/[a-z0-9-]+\.md$/.test(source.file)) throw new Error("a new article goes in the articles folder");
  if (edit.previous !== "") throw new Error("a new article replaces nothing");
  let post;
  try {
    post = JSON.parse(edit.value);
  } catch {
    throw new Error("the post is not valid JSON");
  }
  const fileName = basename(source.file);
  if (fileName !== `${post?.slug}.md`) throw new Error("the file name must be the post's address");
  const created = articleFile(post);
  checkFreeSlug(post.slug, fileName);
  const fullPath = resolve(root, source.file);
  if (files.has(fullPath)) throw new Error("this article is written more than once");
  files.set(fullPath, { file: { fullPath, type: "new" }, text: null, created, changes: [], layout: null });
}

// A page the owner added (2026-11-27): one new draft entry in pages.json. Its address must be free:
// not another added page (even a removed one), a page in src/pages, a project, or a reserved name.
const reservedPages = new Set(["_stoin", "_astro", "api", "index", "404", "500", "rss", "robots", "favicon", "assets", "images", "blocks", "brand", "fonts", "sitemap", "llms"]);
// Every address a new page or project can't take: reserved names, src/pages, projects, and every
// added page's address now and before (a moved page keeps its old ones as redirects).
function takenAddresses(pagesList) {
  const taken = new Set(reservedPages);
  for (const page of pagesList ?? []) {
    taken.add(page.slug);
    for (const old of page.moved ?? []) taken.add(old);
  }
  for (const name of readdirSync(join(root, "apps/web/src/pages"))) taken.add(name.replace(/\.(astro|ts|js|md|mdx)$/, ""));
  for (const { file, itemsKey } of Object.values(collections)) {
    try {
      for (const id of Object.keys(JSON.parse(readFileSync(join(root, file), "utf8"))[itemsKey ?? "items"] ?? {})) taken.add(id);
    } catch {
      // A site without this list.
    }
  }
  return taken;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pagesFile = "apps/web/src/site-content/pages.json";
const listsFile = "apps/web/src/site-content/lists.json";
const layoutFile = "apps/web/src/site-content/layout.json";

function jsonEntry(files, path) {
  const file = resolveFile(path);
  if (!files.has(file.fullPath)) files.set(file.fullPath, { file, text: readFileSync(file.fullPath, "utf8"), changes: [], layout: null });
  const entry = files.get(file.fullPath);
  entry.layout ??= JSON.parse(entry.text);
  entry.changes.push({ layout: true });
  return entry.layout;
}

function parsed(edit, what) {
  try {
    return JSON.parse(edit.value) ?? {};
  } catch {
    throw new Error(`the ${what} is not valid JSON`);
  }
}

function plainWords(...values) {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim() || /[<>]/.test(value)) throw new Error("use plain words, with no < or >");
  }
}

function newPage(edit, files) {
  const { source } = edit;
  if (source.file !== pagesFile) throw new Error("a new page is listed in pages.json");
  if (edit.previous !== "") throw new Error("a new page replaces nothing");
  const { slug, title, description, menu } = parsed(edit, "page");
  if (typeof slug !== "string" || !slugPattern.test(slug) || slug.length < 2 || slug.length > 60) throw new Error("the page address must be like our-team");
  plainWords(title, description);
  if (menu !== "yes" && menu !== "no") throw new Error("say whether the page is in the menu");
  const pagesJson = jsonEntry(files, pagesFile);
  if (takenAddresses(pagesJson.pages).has(slug)) throw new Error("a page with this address already exists");
  pagesJson.pages = [...(pagesJson.pages ?? []), { slug, title: title.trim(), description: description.trim(), status: "draft", menu }];
  // In the menu: its id ("p<index>", lib/menu.ts) goes at the end of the menu list.
  if (menu === "yes") {
    const lists = jsonEntry(files, listsFile);
    lists.menu = [...(lists.menu ?? []), `p${pagesJson.pages.length - 1}`];
  }
}

// A new address for a page the owner added (2026-11-27). The old one is kept as a redirect, and
// the page's sections move with it in layout.json.
function pageAddress(edit, files) {
  if (edit.source.file !== pagesFile) throw new Error("a page address is changed in pages.json");
  const { from, to } = parsed(edit, "address change");
  if (typeof to !== "string" || !slugPattern.test(to) || to.length < 2 || to.length > 60) throw new Error("the page address must be like our-team");
  const pagesJson = jsonEntry(files, pagesFile);
  const page = (pagesJson.pages ?? []).find((existing) => existing.slug === from);
  if (!page) throw new Error("that page isn't in pages.json");
  const taken = takenAddresses(pagesJson.pages);
  if (taken.has(to) && !(page.moved ?? []).includes(to)) throw new Error("a page with this address already exists");
  page.slug = to;
  page.moved = [...(page.moved ?? []).filter((old) => old !== to), from].slice(-10);
  const layout = jsonEntry(files, layoutFile);
  if (layout[`page-${from}`] !== undefined) {
    layout[`page-${to}`] = layout[`page-${from}`];
    delete layout[`page-${from}`];
  }
}

// The site's collections (2026-11-27, "Add a project"): lists of things that each have their own
// page. A new one starts with sample wording and is shown last in its list.
const collections = {};

function newItem(edit, files) {
  const collection = collections[edit.source.collection];
  if (!collection || edit.source.file !== collection.file) throw new Error("this site has no such list");
  if (edit.previous !== "") throw new Error("a new item replaces nothing");
  const { slug, name } = parsed(edit, "item");
  if (typeof slug !== "string" || !slugPattern.test(slug) || slug.length < 2 || slug.length > 60) throw new Error("the address must be like our-team");
  plainWords(name);
  const pagesJson = JSON.parse(readFileSync(join(root, pagesFile), "utf8"));
  if (takenAddresses(pagesJson.pages).has(slug)) throw new Error("a page with this address already exists");
  const data = jsonEntry(files, collection.file);
  const key = collection.itemsKey ?? "items";
  data[key] = { ...(data[key] ?? {}), [slug]: collection.sample(name.trim()) };
  const lists = jsonEntry(files, listsFile);
  lists[collection.list] = [...(lists[collection.list] ?? []), slug];
}

function checkEdit(edit, files) {
  if (!edit || typeof edit !== "object") throw new Error("edit must be an object");
  const { source } = edit;
  if (!source || typeof source !== "object") throw new Error("source is missing");
  if (source.kind === "new_article") return newArticle(edit, files);
  if (source.kind === "new_page") return newPage(edit, files);
  if (source.kind === "page_address") return pageAddress(edit, files);
  if (source.kind === "new_item") return newItem(edit, files);
  const file = resolveFile(source.file);
  if (!files.has(file.fullPath)) {
    const text = readFileSync(file.fullPath, "utf8");
    if (file.type === "json" || file.type === "layout" || file.type === "lists") JSON.parse(text);
    files.set(file.fullPath, { file, text, changes: [], layout: null });
  }
  const entry = files.get(file.fullPath);

  if (file.type === "layout") {
    if (source.kind !== "layout" || typeof source.page !== "string" || !/^[\w-]+$/.test(source.page)) throw new Error("a layout edit names one page");
    entry.layout ??= JSON.parse(entry.text);
    if (sortedJson(entry.layout[source.page] ?? null) !== edit.previous) throw new Error("the published layout has changed");
    let next;
    try {
      next = JSON.parse(edit.value);
    } catch {
      throw new Error("the new layout is not valid JSON");
    }
    if (!next || typeof next !== "object" || !Array.isArray(next.order)) throw new Error("the new layout must list the page's sections");
    if (/[<>]/.test(edit.value)) throw new Error("new wording must not contain < or >");
    entry.layout[source.page] = next;
    entry.changes.push({ layout: true });
    return;
  }

  if (file.type === "lists") {
    if (source.kind !== "order" || typeof source.list !== "string" || !/^[\w-]+$/.test(source.list)) throw new Error("an order edit names one list");
    entry.layout ??= JSON.parse(entry.text);
    if (JSON.stringify(entry.layout[source.list] ?? []) !== edit.previous) throw new Error("the published order has changed");
    let next;
    try {
      next = JSON.parse(edit.value);
    } catch {
      throw new Error("the new order is not valid JSON");
    }
    // An empty list is fine (the footer's links start empty); the editor keeps each list's minimum.
    if (!Array.isArray(next) || next.some((id) => typeof id !== "string" || !/^[\w-]+$/.test(id)) || new Set(next).size !== next.length) {
      throw new Error("the new order must list each item once");
    }
    entry.layout[source.list] = next;
    entry.changes.push({ layout: true });
    return;
  }

  const { span, replacement } = textSpan(edit, file, entry.text);
  if (entry.changes.some((change) => change.span && change.span[0] < span[1] && span[0] < change.span[1])) {
    throw new Error("this wording is edited more than once");
  }
  entry.changes.push({ span, replacement, unchanged: edit.value === edit.previous });
}

function applyChanges({ text, changes, layout, created }) {
  if (typeof created === "string") return created;
  if (layout) return `${JSON.stringify(layout, null, 2)}\n`;
  let next = text;
  // From the end of the file backwards, so earlier places keep their offsets.
  const ordered = changes.filter((change) => !change.unchanged).sort((a, b) => b.span[0] - a.span[0]);
  for (const { span, replacement } of ordered) next = `${next.slice(0, span[0])}${replacement}${next.slice(span[1])}`;
  return next;
}

function writeAll(contents) {
  const temporary = contents.map(([path]) => `${path}.${randomBytes(6).toString("hex")}.tmp`);
  try {
    contents.forEach(([, text], index) => writeFileSync(temporary[index], text));
    contents.forEach(([path], index) => renameSync(temporary[index], path));
  } finally {
    for (const path of temporary) rmSync(path, { force: true });
  }
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;

  let edits;
  try {
    edits = JSON.parse(input).edits;
  } catch {
    return finish({ ok: false, failed: [{ index: null, reason: "input is not valid JSON" }] }, 1);
  }
  if (!Array.isArray(edits) || edits.length === 0) {
    return finish({ ok: false, failed: [{ index: null, reason: "edits must be a non-empty list" }] }, 1);
  }

  const files = new Map();
  const failed = [];
  edits.forEach((edit, index) => {
    try {
      checkEdit(edit, files);
    } catch (error) {
      failed.push({ index, file: edit?.source?.file ?? null, pointer: edit?.source?.pointer ?? null, reason: error.message });
    }
  });
  if (failed.length > 0) return finish({ ok: false, failed }, 1);

  const contents = [...files].map(([path, entry]) => [path, applyChanges(entry)]).filter(([path, text]) => text !== files.get(path).text);
  try {
    writeAll(contents);
  } catch (error) {
    return finish({ ok: false, failed: [{ index: null, reason: `could not write the files: ${error.code ?? "unknown error"}` }] }, 1);
  }

  const changed = edits.filter((edit) => edit.value !== edit.previous).map((edit) => edit.source);
  return finish({ ok: true, changed }, 0);
}

await main();
