// Search and answer-engine step, run on the built site (apps/web/dist) after the static check.
//
// Why (2026-11-27): a check of our customers' sites found pages titled "Home page", no search
// descriptions, photos without descriptions, multi-megabyte images, no /llms.txt, and nothing telling
// search engines when a page changed. This step makes those things automatic on every Stoin Site:
//   1. Publish checks. A page without a title or description, with a "Home page" title, with a photo
//      that has no alt text, with broken JSON-LD, or using an image over 1 MB stops the build, so it
//      never goes live. Smaller problems are printed as warnings.
//   2. /llms.txt, written from src/seo/facts.json and the built pages, unless the site has its own.
//   3. IndexNow. On a production build of a live domain, tells Bing (which feeds ChatGPT search and
//      Copilot), Yandex, Seznam and Naver which pages exist, so they recrawl within minutes. It never
//      fails the build.
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const web = join(root, "apps", "web");
const dist = join(web, "dist");
const env = process.env;
const failures = [];
const warnings = [];
const MAX_IMAGE = 1024 * 1024;
const BIG_IMAGE = 400 * 1024;

const exists = (path) => access(path).then(() => true, () => false);
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;|&rsquo;/g, "’").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"))?.slice(2).find((v) => v !== undefined);

async function files(directory, test) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await files(path, test)));
    else if (test(entry.name)) found.push(path);
  }
  return found;
}

let facts = {};
try {
  facts = JSON.parse(await readFile(join(web, "src", "seo", "facts.json"), "utf8"));
} catch {
  // A site without a facts file still gets the checks and IndexNow.
}

// ---- 1. Publish checks -------------------------------------------------------------------------
const pages = new Map();
for (const path of await files(dist, (name) => name.endsWith(".html"))) {
  const name = relative(dist, path).replaceAll("\\", "/");
  const html = await readFile(path, "utf8");
  const head = html.split(/<\/head>/i)[0];
  const title = text(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const metaDescription = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((tag) => attr(tag, "name")?.toLowerCase() === "description");
  const description = metaDescription ? (attr(metaDescription, "content") ?? "").trim() : "";
  const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(head);
  const notFound = name === "404.html" || name.startsWith("404/");
  // A redirect page (an old address that forwards to a new one) has nothing to describe.
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(head)) continue;
  pages.set(name, { title, description, noindex });

  if (!title) failures.push(`${name}: the page has no title.`);
  else if (/^\s*home(\s*page)?\s*($|[|\-–—:])/i.test(title)) failures.push(`${name}: the title "${title}" says nothing about the business. Give it a real title.`);
  else if (title.length > 70) warnings.push(`${name}: the title is ${title.length} characters; search results cut it near 60.`);
  if (!description) failures.push(`${name}: the page has no search description.`);
  else if (description.length < 50 || description.length > 170) warnings.push(`${name}: the search description is ${description.length} characters; 50 to 160 reads best.`);

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (attr(tag, "alt") === undefined) failures.push(`${name}: a photo has no alt text (${attr(tag, "src") ?? "no src"}). Describe it, or give it alt="" if it is only decoration.`);
  }
  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(block[1]);
    } catch {
      failures.push(`${name}: the structured data (JSON-LD) is broken.`);
    }
  }
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  if (!notFound && h1 !== 1) warnings.push(`${name}: ${h1} main headings (H1); one reads best.`);
}
const seenTitles = new Map();
for (const [name, page] of pages) if (!page.noindex && page.title) seenTitles.set(page.title, [...(seenTitles.get(page.title) ?? []), name]);
for (const [title, names] of seenTitles) if (names.length > 1) warnings.push(`${names.length} pages share the title "${title}": ${names.join(", ")}.`);

// Images the pages actually use: src, srcset, share images and CSS url(...).
const references = new Set();
const sources = [...(await files(dist, (name) => name.endsWith(".html") || name.endsWith(".css")))];
for (const path of sources) {
  const body = await readFile(path, "utf8");
  for (const m of body.matchAll(/(?:src|href|content|poster)=["']([^"']+)["']/gi)) references.add(m[1]);
  for (const m of body.matchAll(/srcset=["']([^"']+)["']/gi)) for (const part of m[1].split(",")) references.add(part.trim().split(/\s+/)[0]);
  for (const m of body.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) references.add(m[1]);
}
for (const ref of references) {
  let path = ref;
  try {
    path = new URL(ref, "https://site.invalid").pathname;
  } catch {
    continue;
  }
  if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(path)) continue;
  const file = join(dist, decodeURIComponent(path));
  if (!(await exists(file))) continue;
  const size = (await stat(file)).size;
  const kb = Math.round(size / 1024);
  if (size > MAX_IMAGE) failures.push(`${path}: the image is ${kb} KB. Over 1 MB slows the page on phones; save it as WebP under 400 KB.`);
  else if (size > BIG_IMAGE) warnings.push(`${path}: the image is ${kb} KB; under 400 KB loads faster.`);
}

for (const warning of warnings) console.warn(`SEO warning: ${warning}`);
if (failures.length > 0) {
  console.error(`Search check failed, so this version will not go live:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Search check passed: ${pages.size} pages, ${warnings.length} warnings.`);

// ---- 2. /llms.txt ------------------------------------------------------------------------------
async function sitemapUrls() {
  const urls = [];
  for (const name of ["sitemap-0.xml", "sitemap.xml"]) {
    const path = join(dist, name);
    if (!(await exists(path))) continue;
    for (const m of (await readFile(path, "utf8")).matchAll(/<loc>([^<]+)<\/loc>/g)) if (!m[1].endsWith(".xml")) urls.push(m[1].trim());
    if (urls.length) break;
  }
  return urls;
}
const urls = await sitemapUrls();
const origin = (env.PUBLIC_SITE_URL || (urls[0] ? new URL(urls[0]).origin : "")).replace(/\/$/, "");

function pageFor(url) {
  const path = new URL(url).pathname.replace(/^\/|\/$/g, "");
  for (const name of path ? [`${path}/index.html`, `${path}.html`] : ["index.html"]) if (pages.has(name)) return pages.get(name);
  return undefined;
}

if (await exists(join(dist, "llms.txt"))) {
  console.log("llms.txt: the site writes its own.");
} else if (origin) {
  const siteName = facts.name || pages.get("index.html")?.title || "";
  const lines = [`# ${siteName}`, ""];
  const description = facts.description || pages.get("index.html")?.description;
  if (description) lines.push(`> ${description}`, "");
  if (facts.summary?.length) lines.push("## Key facts", "", ...facts.summary.map((s) => `- ${s}`), "");
  const a = facts.address;
  const contact = [
    a && [a.street, a.city, [a.region, a.postalCode].filter(Boolean).join(" "), a.country].filter(Boolean).join(", "),
    facts.telephone && `Phone: ${facts.telephone}`,
    facts.email && `Email: ${facts.email}`,
  ].filter(Boolean);
  if (contact.length) lines.push("## Contact", "", ...contact.map((c) => `- ${c}`), "");
  if (facts.people?.length) lines.push(facts.type === "Person" ? "## Roles" : "## People", "", ...facts.people.map((p) => `- ${[p.name, p.jobTitle].filter(Boolean).join(", ")}`), "");
  if (facts.listsFrom) {
    try {
      const source = JSON.parse(await readFile(join(web, facts.listsFrom.file), "utf8"));
      const items = Object.values(source[facts.listsFrom.items] ?? {});
      const rows = items.map((item) => facts.listsFrom.fields.map((field) => item[field]).filter(Boolean).join(", ")).filter(Boolean);
      if (rows.length) lines.push(`## ${facts.listsFrom.title}`, "", ...rows.map((r) => `- ${r}`), "");
    } catch {
      warnings.push(`llms.txt: could not read ${facts.listsFrom.file}.`);
    }
  }
  const pageLines = [];
  for (const url of urls) {
    const page = pageFor(url);
    if (!page || page.noindex && env.PUBLIC_ENVIRONMENT === "production") continue;
    const absolute = origin + new URL(url).pathname;
    pageLines.push(`- [${page.title || absolute}](${absolute})${page.description ? `: ${page.description}` : ""}`);
  }
  if (pageLines.length) lines.push("## Pages", "", ...pageLines, "");
  if (facts.notice) lines.push("## Note", "", facts.notice, "");
  await writeFile(join(dist, "llms.txt"), lines.join("\n"), "utf8");
  console.log(`llms.txt: written with ${pageLines.length} pages.`);
}

// ---- 3. IndexNow -------------------------------------------------------------------------------
const keyFile = join(dist, "indexnow-key.txt");
const host = origin ? new URL(origin).host : "";
const live =
  env.VERCEL_ENV === "production" &&
  env.PUBLIC_ENVIRONMENT === "production" &&
  env.PUBLIC_EDIT_MODE !== "1" &&
  host &&
  !/(\.vercel\.app|localhost|127\.0\.0\.1)$/.test(host.split(":")[0]);
if (!live) {
  console.log("IndexNow: skipped (not a production build of a live domain).");
} else if (!(await exists(keyFile))) {
  console.warn("IndexNow: skipped, apps/web/public/indexnow-key.txt is missing.");
} else {
  const key = (await readFile(keyFile, "utf8")).trim();
  const urlList = [...new Set([...urls.map((u) => origin + new URL(u).pathname), `${origin}/llms.txt`])];
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${origin}/indexnow-key.txt`, urlList }),
      signal: AbortSignal.timeout(10_000),
    });
    console.log(`IndexNow: sent ${urlList.length} addresses for ${host}, answer ${response.status}.`);
  } catch (error) {
    console.warn(`IndexNow: could not reach the service (${error.message}); the site still goes live.`);
  }
}
