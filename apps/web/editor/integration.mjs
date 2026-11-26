import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { itemKey, stripMarkers } from "./markers.mjs";
import { stoinBlocks } from "./remark-blocks.mjs";
import { decodeEntities, sha256, transformHtml } from "./transform-html.mjs";

// Finishes the edit build after Astro writes its pages: makes wording clickable, removes every marker,
// takes out what a private editing copy must not have, and writes the manifest and the bridge.

const site = "utopiahomes.com";
const contentFolder = "apps/web/src/site-content";
const contentDirectory = fileURLToPath(new URL("../src/site-content/", import.meta.url));
const bridgeSource = fileURLToPath(new URL("./bridge.js", import.meta.url));
const markdownSource = fileURLToPath(new URL("./markdown-inline.js", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const articleDirectory = fileURLToPath(new URL("../src/content/thinking/", import.meta.url));
const articleFolder = "apps/web/src/content/thinking";
// Front matter the owner can edit: one-line quoted values only (lib/thinking.ts marks the same ones).
const articleFields = ["title", "subtitle", "summary", "social_image", "founder_vision_pull_quote", "cta_title", "cta_copy", "cta_label"];
// Legal pages and the fund page (offering wording) need the owner's explicit confirmation before they publish.
const heldMarkdown = /\/site-content\/(?:privacy|terms)\.md$/;
const reportFile = fileURLToPath(new URL("../dist-edit.report.json", import.meta.url));

// Private-area wording never enters the manifest, and these pages never enter the edit deployment.
const excludedContent = new Set(["private", "layout", "lists"]);
// Utopia Homes has no held wording yet (its legal pages aren't editable).
const heldContent = new Set([]);
const removedPaths = ["blocks", "llms.txt", "lucy-knowledge"];

const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".mjs", ".svg", ".txt", ".webmanifest", ".xml"]);
// Markers in a URL would be percent-encoded, so the final check looks for that form as well.
const leftoverMarker = /[--]|%EE%80%8[0-2]|%EE%8[45]%[89AB][0-9A-F]/i;

const talkBlock = /<div data-stoin-block="talk-to-lucy"[^>]*><\/div>\s*<script src="\/blocks\/talk-to-lucy\.js" defer><\/script>/;
const contactScript = /<script type="module">((?:(?!<\/script>)[\s\S])*?#inquiry-form(?:(?!<\/script>)[\s\S])*?)<\/script>/;

/** A photo file's width and height from its header (PNG, JPEG, WebP), or zeros. */
function imageSize(bytes) {
  if (bytes.length > 24 && bytes.toString("ascii", 1, 4) === "PNG") return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let at = 2;
    while (at + 9 < bytes.length && bytes[at] === 0xff) {
      const marker = bytes[at + 1];
      const length = bytes.readUInt16BE(at + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
      at += 2 + length;
    }
  }
  if (bytes.length > 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const chunk = bytes.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (chunk === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") { const b = bytes.readUInt32LE(21); return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) }; }
  }
  return { width: 0, height: 0 };
}

/** Every photo file the site has (2026-11-24): the ones Lucy may put in a spot, used or not, and the
 * list Stoin checks a chosen photo against, so a draft never points at a file that isn't there. */
async function photoFiles(dist) {
  const folder = join(dist, "images");
  const photos = [];
  for (const file of await filesIn(folder).catch(() => [])) {
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(extname(file).toLowerCase())) continue;
    photos.push({ path: `/${relative(dist, file).split(sep).join("/")}`, ...imageSize(await readFile(file)) });
  }
  return photos.sort((a, b) => (a.path < b.path ? -1 : 1));
}

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else files.push(path);
  }
  return files;
}

/** Every string in the JSON wording files, in file order. */
export async function readContentItems(directory = contentDirectory) {
  const items = new Map();
  for (const fileName of (await readdir(directory)).filter((name) => name.endsWith(".json")).sort()) {
    const file = fileName.replace(/\.json$/, "");
    if (excludedContent.has(file)) continue;
    const walk = (value, pointer) => {
      if (typeof value === "string") {
        items.set(itemKey(file, pointer), {
          key: itemKey(file, pointer),
          value,
          class: heldContent.has(file) ? "held" : "wording",
          source: { file: `${contentFolder}/${fileName}`, pointer },
        });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, [...pointer, index]));
      } else if (value && typeof value === "object") {
        for (const [name, item] of Object.entries(value)) walk(item, [...pointer, name]);
      }
    };
    walk(JSON.parse(await readFile(join(directory, fileName), "utf8")), []);
  }
  if (directory === contentDirectory) for (const item of await readArticleItems()) items.set(item.key, item);
  return items;
}

/** Article front matter values, keyed article.<slug>.<field>. */
export async function readArticleItems(directory = articleDirectory) {
  const items = [];
  // Utopia Homes has no articles (2026-11-25): no folder, no article items.
  if (!(await readdir(directory).catch(() => null))) return items;
  for (const fileName of (await readdir(directory)).filter((name) => /\.mdx?$/.test(name) && !name.startsWith("_")).sort()) {
    const text = (await readFile(join(directory, fileName), "utf8")).replace(/\r\n/g, "\n");
    const front = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
    if (!front) continue;
    const field = (name) => {
      const line = front.split("\n").find((row) => row.startsWith(`${name}: "`));
      const quoted = line?.slice(name.length + 2).trim();
      return quoted && /^"(?:[^"\\]|\\.)*"$/.test(quoted) ? quoted : undefined;
    };
    const slug = field("slug");
    if (!slug) continue;
    for (const name of articleFields) {
      const quoted = field(name);
      if (!quoted) continue;
      const key = `article.${JSON.parse(slug)}.${name}`;
      items.push({ key, value: JSON.parse(quoted), class: "wording", source: { file: `${articleFolder}/${fileName}`, kind: "frontmatter", field: name } });
    }
  }
  return items;
}

/** What the editor needs to write a new article: its kinds, the tags in use, and the addresses taken.
 * The adapter (scripts/apply-site-edits.mjs, kind "new_article") writes the file itself. */
export async function postSettings(directory = articleDirectory) {
  // No blog on this site: the editor shows no Posts tab.
  if (!(await readdir(directory).catch(() => null))) return null;
  const thinking = JSON.parse(await readFile(join(contentDirectory, "thinking.json"), "utf8"));
  const tags = new Map();
  const slugs = [];
  for (const fileName of (await readdir(directory)).filter((name) => /\.mdx?$/.test(name)).sort()) {
    const front = (await readFile(join(directory, fileName), "utf8")).replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
    const slug = front.match(/^slug: "([^"]+)"$/m)?.[1];
    if (slug) slugs.push(slug);
    for (const [, raw] of (front.split(/^tags:/m)[1] ?? "").matchAll(/^ {2}- (.+)$/gm)) {
      const tag = raw.startsWith('"') ? JSON.parse(raw) : raw;
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }
  return {
    preview: "/_stoin/post",
    url: "/blog/{slug}",
    file: `${articleFolder}/{slug}.md`,
    types: Object.entries(thinking.types).map(([value, label]) => ({ value, label })),
    tags: [...tags].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([tag]) => tag),
    slugs: slugs.sort(),
    byline: "Utopia Homes",
    timezone: "America/New_York",
  };
}

/** A Markdown block's item, read from the file at the place the page named. */
async function blockItem(key, src, cache) {
  const match = src.match(/^(.+):(\d+):(\d+)$/);
  if (!match) return null;
  const [, file, start, end] = match;
  if (!cache.has(file)) cache.set(file, await readFile(join(repositoryRoot, file), "utf8"));
  const value = cache.get(file).slice(Number(start), Number(end));
  const legal = heldMarkdown.test(file);
  return {
    key,
    value,
    format: "markdown",
    marks: legal ? "links" : "inline",
    class: legal ? "held" : "wording",
    source: { file, kind: "markdown", start: Number(start), end: Number(end) },
  };
}

function pagePath(relativeFile) {
  if (relativeFile === "index.html") return "/";
  return `/${relativeFile.replace(/(?:\/index)?\.html$/, "")}`;
}

/** Adjusts one page's security policy: nothing leaves the page, no form can post anywhere. */
function editPolicy(html, hashes, removedHashes) {
  return html.replace(/(http-equiv="content-security-policy" content=")([^"]*)(")/, (_, before, policy, after) => {
    let next = policy
      .replace(/connect-src [^;]*/, "connect-src 'self'")
      .replace(/form-action [^;]*/, "form-action 'none'");
    for (const [from, to] of hashes) next = next.replaceAll(`'${from}'`, `'${to}'`);
    for (const hash of removedHashes) next = next.replaceAll(` '${hash}'`, "");
    return `${before}${next}${after}`;
  });
}

function finishPage(html, hashes, bridgeTag) {
  const removedHashes = [];
  const page = html
    .replace(talkBlock, "")
    .replace(contactScript, (_, body) => {
      removedHashes.push(sha256(body));
      return "";
    })
    .replace('<form id="inquiry-form"', '<form id="inquiry-form" data-delivery-disabled="true"')
    .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex,nofollow">')
    .replace("</head>", `${bridgeTag}</head>`);
  return editPolicy(page, hashes, removedHashes);
}

function bridgeScriptTag() {
  const parent = process.env.PUBLIC_EDIT_PARENT;
  if (!parent) return '<script src="/_stoin/bridge.js"></script>';
  const { origin } = new URL(parent);
  if (origin !== parent) throw new Error("PUBLIC_EDIT_PARENT must be an origin, like http://127.0.0.1:4332.");
  return `<script src="/_stoin/bridge.js" data-parent="${origin}"></script>`;
}

/** Runs the whole step on a finished Astro output folder. Throws if any marker survives. */
export async function finishEditBuild(dist) {
  const items = await readContentItems();
  const siteName = items.get("site.name")?.value ?? "";
  const bridgeTag = bridgeScriptTag();
  const uses = new Map();
  const lost = [];
  const pages = [];
  const sources = new Map();
  const blocks = new Map();
  const layouts = [];
  const lists = new Map();
  const linkTargets = new Set();
  const photoSpots = new Map();

  for (const path of removedPaths) await rm(join(dist, path), { recursive: true, force: true });

  for (const file of await filesIn(dist)) {
    if (!textExtensions.has(extname(file))) continue;
    const name = relative(dist, file).split(sep).join("/");
    const original = await readFile(file, "utf8");

    if (extname(file) !== ".html") {
      const clean = stripMarkers(original);
      if (clean !== original) await writeFile(file, clean);
      continue;
    }

    const path = pagePath(name);
    // The editor's own pages (the new-post page) hold no site wording of their own.
    const redirect = original.includes('http-equiv="refresh"') || path.startsWith("/_stoin/");
    const { html, hashes } = transformHtml(original, {
      valueOf: (key) => items.get(key)?.value,
      onUse: (key, kind) => {
        if (redirect) return;
        const use = uses.get(key) ?? { kinds: new Set(), pages: new Set() };
        use.kinds.add(kind);
        use.pages.add(path);
        uses.set(key, use);
      },
      onLost: (key, reason) => lost.push({ key, path, reason }),
      onPhoto: (key, spot) => {
        if (!redirect && !photoSpots.has(key)) photoSpots.set(key, spot);
      },
      onBlock: (key, src) => {
        if (redirect) return;
        blocks.set(key, src);
        const use = uses.get(key) ?? { kinds: new Set(), pages: new Set() };
        use.kinds.add("text");
        use.pages.add(path);
        uses.set(key, use);
      },
    });
    await writeFile(file, redirect && !path.startsWith("/_stoin/") ? html : finishPage(html, hashes, bridgeTag));
    if (!redirect) {
      // Pages with sections the owner can move describe them in a template the bridge also reads.
      const outline = html.match(/<template data-stoin-layout="([^"]*)"/)?.[1];
      if (outline) layouts.push({ path, outline: JSON.parse(decodeEntities(outline)) });
      // Ordered lists (lists.json): the page describes each in a template next to its items.
      for (const [, meta] of html.matchAll(/<template data-stoin-list-meta="([^"]*)"/g)) {
        const found = JSON.parse(decodeEntities(meta));
        const entry = lists.get(found.list) ?? { ...found, pages: new Set() };
        entry.pages.add(path);
        lists.set(found.list, entry);
      }
      for (const [, target] of html.matchAll(/href="[^"#]*#([^"]+)"/g)) linkTargets.add(decodeEntities(target));
    }

    if (!redirect) {
      const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? path);
      pages.push({ path, title: title.endsWith(` | ${siteName}`) ? title.slice(0, -` | ${siteName}`.length) : title });
    }
  }

  await writeFile(join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");

  const pageOrder = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  pages.sort((a, b) => pageOrder(a.path, b.path));
  for (const [key, src] of blocks) {
    const item = await blockItem(key, src, sources);
    if (item && !items.has(key)) items.set(key, item);
  }
  const kindOf = ({ kinds }) => (kinds.has("choice") ? "choice" : kinds.has("order") ? "order" : kinds.has("layout") ? "layout" : kinds.has("image") ? "image" : kinds.has("text") ? "text" : kinds.has("attribute") ? "attribute" : "meta");
  const savedLayout = JSON.parse(await readFile(join(contentDirectory, "layout.json"), "utf8"));
  let catalog = [];
  for (const { path, outline } of layouts) {
    catalog = outline.blocks;
    const key = `layout.${outline.page}`;
    items.set(key, {
      key,
      value: JSON.stringify(savedLayout[outline.page] ?? null),
      class: "wording",
      format: "layout",
      default: outline.default,
      // A hidden section breaks links that point into it, so the editor warns first.
      sections: outline.sections.map(({ anchors, ...section }) => ({ ...section, linked: anchors.some((anchor) => linkTargets.has(anchor)) })),
      source: { file: `${contentFolder}/layout.json`, kind: "layout", page: outline.page },
    });
    uses.set(key, { kinds: new Set(["layout"]), pages: new Set([path]) });
  }
  const savedLists = JSON.parse(await readFile(join(contentDirectory, "lists.json"), "utf8"));
  for (const [list, { label, min, max, choices, pages: listPages }] of lists) {
    const key = `list.${list}`;
    items.set(key, {
      key,
      value: JSON.stringify(savedLists[list] ?? []),
      class: "wording",
      format: "order",
      order: { label, min, max, choices },
      source: { file: `${contentFolder}/lists.json`, kind: "order", list },
    });
    uses.set(key, { kinds: new Set(["order"]), pages: listPages });
  }
  // Where the synth's box sits (Ray, 2026-11-26: "make the location of the box editable"): a
  // setting with fixed options, on every page, in the editor's Page details tab.
  const position = items.get("site.talkPosition");
  if (position) {
    position.format = "choice";
    position.label = "Where the synth's box sits";
    position.options = [{ value: "top-right", label: "Top right" }, { value: "bottom-right", label: "Bottom right" }];
    uses.set("site.talkPosition", { kinds: new Set(["choice"]), pages: new Set(pages.map((page) => page.path)) });
  }
  const manifestItems = [...items.values()]
    .filter((item) => uses.has(item.key))
    .map((item) => ({
      key: item.key,
      value: item.value,
      kind: kindOf(uses.get(item.key)),
      class: item.class,
      ...(item.format === "markdown" ? { format: item.format, marks: item.marks } : {}),
      ...(item.format === "layout" ? { default: item.default, sections: item.sections } : {}),
      ...(item.format === "choice" ? { label: item.label, options: item.options } : {}),
      ...(item.format === "order" ? item.order : {}),
      ...(photoSpots.has(item.key) && kindOf(uses.get(item.key)) === "image" ? { photo: photoSpots.get(item.key) } : {}),
      pages: [...uses.get(item.key).pages].sort(pageOrder),
      source: item.source,
    }));

  await mkdir(join(dist, "_stoin"), { recursive: true });
  const posts = await postSettings();
  await writeFile(join(dist, "_stoin", "manifest.json"), `${JSON.stringify({ version: 1, site, pages, blocks: catalog, posts, photos: await photoFiles(dist), items: manifestItems }, null, 2)}\n`);
  // The bridge carries the Markdown helper with it, so the page loads one script.
  await writeFile(join(dist, "_stoin", "bridge.js"), `${await readFile(markdownSource, "utf8")}
${await readFile(bridgeSource, "utf8")}`);

  const leftovers = [];
  for (const file of await filesIn(dist)) {
    if (textExtensions.has(extname(file)) && leftoverMarker.test(await readFile(file, "utf8"))) {
      leftovers.push(relative(dist, file));
    }
  }
  if (leftovers.length > 0) throw new Error(`Edit build left markers in: ${leftovers.join(", ")}`);

  const notOnAnyPage = [...items.keys()].filter((key) => !uses.has(key));
  const report = { pages: pages.length, items: manifestItems.length, notOnAnyPage, lost };
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function stoinEditBuild() {
  return {
    name: "stoin-edit-build",
    hooks: {
      // Article paragraphs become editable. Straight quotes stay straight in the edit copy so an edited
      // paragraph is written back exactly as typed; the public build still curls them.
      "astro:config:setup": ({ config, injectRoute }) => {
        // The page a new post is written on (2026-11-19). It exists only in the edit copy.
        if (existsSync(articleDirectory)) injectRoute({ pattern: "/_stoin/post", entrypoint: fileURLToPath(new URL("./PostPreview.astro", import.meta.url)) });
        const options = config.markdown?.processor?.options;
        if (!options?.mdastPlugins || !options.features) throw new Error("The edit build needs Astro's Sätteri Markdown processor.");
        options.mdastPlugins.push(stoinBlocks);
        options.features.smartPunctuation = false;
      },
      "astro:build:done": async ({ dir, logger }) => {
        const report = await finishEditBuild(fileURLToPath(dir));
        logger.info(
          `${report.items} editable items on ${report.pages} pages; ${report.notOnAnyPage.length} strings are on no page; ${report.lost.length} places could not be mapped.`,
        );
      },
    },
  };
}
