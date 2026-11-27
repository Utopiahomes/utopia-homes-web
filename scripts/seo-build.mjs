// Search and answer-engine step, run on the built site (apps/web/dist) after the static check.
//
// Why (2026-11-27): a check of our customers' sites found pages titled "Home page", no search
// descriptions, photos without descriptions, multi-megabyte images, no /llms.txt, and nothing telling
// search engines when a page changed. This step makes those things automatic on every Stoin Site:
//   1. Publish checks. A page without a title or description, with a "Home page" title, with a photo
//      that has no alt text, with broken JSON-LD, or using an image over 1 MB stops the build, so it
//      never goes live. Smaller problems are printed as warnings.
//   2. A Markdown copy of every page for AI readers, and a /site-map page linked in every footer
//      (2026-11-27). Fonts loaded from Google's servers stop the build (GDPR).
//   3. /llms.txt, written from src/seo/facts.json and the built pages, unless the site has its own.
//   4. IndexNow. On a production build of a live domain, tells Bing (which feeds ChatGPT search and
//      Copilot), Yandex, Seznam and Naver which pages exist, so they recrawl within minutes. It never
//      fails the build.
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  // A Munich court fined a site for loading Google Fonts from Google's servers, which hands each
  // visitor's address to Google (GDPR). Fonts are served from the site itself (Ray, 2026-11-27).
  if (/fonts\.(googleapis|gstatic)\.com/.test(body)) failures.push(`${relative(dist, path).replaceAll("\\", "/")}: loads fonts from Google's servers. Serve them from the site instead (for example with @fontsource).`);
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

// The facts file counts only when it names this site (a site copied from another kept that
// company's file); otherwise Stoin's API has facts drafted from this site's own wording.
// Same rule as lib/seo.ts (Ray, 2026-11-28).
async function siteName() {
  try {
    return JSON.parse(await readFile(join(web, "src", "site-content", "site.json"), "utf8")).name ?? "";
  } catch {
    return "";
  }
}
const ownName = await siteName();
const same = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
if (ownName && !same(facts.name, ownName)) {
  facts = {};
  const host = origin ? new URL(origin).hostname : "";
  const api = env.PUBLIC_STOIN_API_URL || "https://utopia-studio-api.onrender.com";
  if (host && !/^(localhost|127\.0\.0\.1)$/.test(host)) {
    try {
      const response = await fetch(`${api}/api/studio/site-facts?site=${encodeURIComponent(host)}`, { signal: AbortSignal.timeout(8000) });
      if (response.ok) facts = await response.json();
    } catch (error) {
      warnings.push(`Company facts: Stoin's API didn't answer (${error.message}).`);
    }
  }
  if (!same(facts.name, ownName)) facts = {};
  console.log(facts.name ? "Company facts: from Stoin, drafted from this site." : "Company facts: none for this site yet.");
}

// ---- 2. Copies for AI readers and the site map page --------------------------------------------
// Why (Ray, 2026-11-27, after reading what worked for Ramp and Railway): AI assistants quote plain
// text far more reliably than pages full of layout code. Ramp tested the same offer as Markdown, as
// stripped HTML and as schema-heavy pages; only the Markdown showed up in AI answers. So every page
// of a live site gets a Markdown copy at the same address plus ".md" (/about -> /about.md, the home
// page -> /index.md), named in the page's <head> and listed in /llms.txt. A preview (noindex) gets
// none, so search engines never index a copy of an unfinished site.
// Every site also gets a plain page listing all its pages (/site-map), linked in every footer: a
// page nothing links to may never be found, and the list is a second way in besides sitemap.xml.
const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&hellip;/g, "…").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const inline = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const urlPathOf = (name) => (name === "index.html" ? "/" : "/" + name.replace(/\/index\.html$/, "").replace(/\.html$/, ""));
const mdPathOf = (name) => (name === "index.html" ? "index.md" : name.replace(/\/index\.html$/, "").replace(/\.html$/, "") + ".md");

function markdown(html, base) {
  const absolute = (href) => {
    try {
      return new URL(href, base).href;
    } catch {
      return href;
    }
  };
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|template|iframe|button|select|textarea|form)\b[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt = (attr(tag, "alt") ?? "").trim();
    const src = attr(tag, "src");
    return alt && src ? ` ![${alt}](${absolute(src)}) ` : "";
  });
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (whole, attrs, inner) => {
    const label = inline(inner);
    const href = attr(`<a${attrs}>`, "href");
    if (!label) return "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return label;
    return `[${label}](${absolute(href)})`;
  });
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => (inline(inner) ? `**${inline(inner)}**` : ""));
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => (inline(inner) ? `*${inline(inner)}*` : ""));
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${"#".repeat(Number(level))} ${inline(inner)}\n\n`);
  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => `\n\n> ${inline(inner)}\n\n`);
  s = s.replace(/<li\b[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n").replace(/<hr\b[^>]*>/gi, "\n\n---\n\n");
  s = s.replace(/<(td|th)\b[^>]*>/gi, " | ");
  s = s.replace(/<\/(p|div|section|article|header|footer|ul|ol|figure|figcaption|table|tr|dl|dt|dd|aside|details|summary|address)>/gi, "\n\n");
  s = decode(s.replace(/<[^>]+>/g, " "));
  return s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const mainOf = (html) => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
const shortTitle = (title) => title.split(/\s[|–—]\s/)[0].trim() || title;
const homeIndexable = pages.has("index.html") && !pages.get("index.html").noindex;
const preview = !homeIndexable;
// The business's name: from its facts, else the ending most page titles share ("About | Utopia Homes").
const endings = new Map();
for (const page of pages.values()) {
  const ending = page.title.split(/\s[|–—]\s/).slice(1).at(-1)?.trim();
  if (ending) endings.set(ending, (endings.get(ending) ?? 0) + 1);
}
const commonEnding = [...endings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
const brand = facts.name || commonEnding || ownName || shortTitle(pages.get("index.html")?.title ?? "");
const listed = [...pages.entries()]
  .filter(([name, page]) => !/^404(\.html|\/)/.test(name) && name !== "site-map/index.html" && (preview || !page.noindex))
  .sort(([a], [b]) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));

let copies = 0;
if (!preview && origin) {
  for (const [name, page] of listed) {
    const file = join(dist, name);
    const html = await readFile(file, "utf8");
    const url = origin + (urlPathOf(name) === "/" ? "/" : urlPathOf(name));
    const body = markdown(mainOf(html), url);
    const top = /^#\s/m.test(body) ? [] : [`# ${shortTitle(page.title) || brand}`, ""];
    const lines = [...top, ...(page.description ? [`> ${page.description}`, ""] : []), body, "", "---", "", `Source: ${url}`, ""];
    await writeFile(join(dist, mdPathOf(name)), lines.join("\n"), "utf8");
    const link = `<link rel="alternate" type="text/markdown" href="/${mdPathOf(name)}">`;
    if (!html.includes('type="text/markdown"')) await writeFile(file, html.replace(/<\/head>/i, `${link}</head>`), "utf8");
    page.markdown = `${origin}/${mdPathOf(name)}`;
    copies += 1;
  }
}
console.log(preview ? "AI copies: none on a preview." : `AI copies: ${copies} Markdown pages written.`);

// The site map page: the home page's own header, footer and styles, with the list in its <main>.
const siteMapFile = join(dist, "site-map", "index.html");
if (!(await exists(siteMapFile)) && pages.has("index.html")) {
  const home = await readFile(join(dist, "index.html"), "utf8");
  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const items = listed.map(([name, page]) => `<li><a href="${urlPathOf(name)}">${escape(shortTitle(page.title) || urlPathOf(name))}</a>${page.description ? `<span>${escape(page.description)}</span>` : ""}</li>`);
  const list = `<section class="stoin-site-map"><h1>Site map</h1><p>Every page on this website.</p><ul>${items.join("")}</ul></section>`;
  const title = `Site map | ${brand}`;
  // Sites forbid inline style attributes (their Content-Security-Policy lists allowed styles by
  // hash), so the page's few rules go in one <style> whose hash is added to this page's policy.
  const css = ".stoin-site-map{max-width:760px;margin:0 auto;padding:56px 20px 72px}.stoin-site-map ul{display:grid;gap:16px;padding-left:20px;margin-top:24px}.stoin-site-map li span{display:block;opacity:.75;margin-top:2px}";
  const cssHash = createHash("sha256").update(css).digest("base64");
  const page = home
    .replace(/\saria-current="page"/g, "")
    .replace(/(content-security-policy"\s+content="[^"]*?style-src\s)/i, `$1'sha256-${cssHash}' `)
    .replace(/<\/head>/i, `<style>${css}</style></head>`)
    .replace(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]+type="text\/markdown"[^>]*>/gi, "")
    .replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`)
    .replace(/(<meta[^>]+(?:name="description"|property="og:description"|name="twitter:description")[^>]+content=")[^"]*"/gi, `$1Every page on ${escape(brand)}'s website."`)
    .replace(/(<meta[^>]+(?:property="og:title"|name="twitter:title")[^>]+content=")[^"]*"/gi, `$1${escape(title)}"`)
    .replace(/(<link[^>]+rel="canonical"[^>]+href=")[^"]*"/i, `$1${origin}/site-map"`)
    .replace(/(<meta[^>]+property="og:url"[^>]+content=")[^"]*"/i, `$1${origin}/site-map"`)
    .replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/i, `$1${list}$2`);
  await mkdir(join(dist, "site-map"), { recursive: true });
  await writeFile(siteMapFile, page, "utf8");
  console.log(`Site map page: ${listed.length} pages listed at /site-map.`);
}
// Its link goes in every page's footer, right after the footer's privacy or terms link so it takes
// that row's look; a footer without one gets it at the end. A footer that links to it already is left.
let linked = 0;
for (const path of await files(dist, (name) => name.endsWith(".html"))) {
  const html = await readFile(path, "utf8");
  if (html.includes('href="/site-map"')) continue;
  const at = html.search(/<footer\b[^>]*class="[^"]*site-footer/i);
  if (at < 0) continue;
  const close = html.indexOf("</footer>", at);
  if (close < 0) continue;
  const footer = html.slice(at, close);
  const legal = [...footer.matchAll(/<a\b([^>]*)href="\/(privacy|terms)[^"]*"[^>]*>[\s\S]*?<\/a>/gi)].at(-1);
  let next;
  if (legal) {
    const end = at + legal.index + legal[0].length;
    const cls = legal[0].match(/class="([^"]*)"/)?.[1];
    // Links written as "Privacy · Terms" get the same separator.
    const separator = footer.slice(0, legal.index).match(/<\/a>(\s*[·|•]\s*)$/)?.[1] ?? "";
    next = html.slice(0, end) + `${separator}<a href="/site-map"${cls ? ` class="${cls}"` : ""}>Site map</a>` + html.slice(end);
  } else {
    // No legal links: inside the footer's last container, so it keeps the footer's colours and margins.
    const lastDiv = footer.lastIndexOf("</div>");
    const where = lastDiv >= 0 ? at + lastDiv : close;
    next = html.slice(0, where) + '<p class="stoin-site-map-link"><a href="/site-map">Site map</a></p>' + html.slice(where);
  }
  await writeFile(path, next, "utf8");
  linked += 1;
}
console.log(`Site map link: added to ${linked} footers.`);

// ---- 3. /llms.txt ------------------------------------------------------------------------------
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
    // On a live site, leave out pages that ask not to be indexed. A preview is noindex everywhere.
    if (!page || (page.noindex && !pages.get("index.html")?.noindex)) continue;
    const absolute = origin + new URL(url).pathname;
    pageLines.push(`- [${page.title || absolute}](${page.markdown ?? absolute})${page.description ? `: ${page.description}` : ""}`);
  }
  if (pageLines.length) lines.push("## Pages", "", ...pageLines, "");
  if (facts.notice) lines.push("## Note", "", facts.notice, "");
  await writeFile(join(dist, "llms.txt"), lines.join("\n"), "utf8");
  console.log(`llms.txt: written with ${pageLines.length} pages.`);
}

// ---- 4. IndexNow -------------------------------------------------------------------------------
const keyFile = join(dist, "indexnow-key.txt");
const host = origin ? new URL(origin).host : "";
// Live means a production deploy whose home page asks to be indexed (previews are noindex).
const live =
  env.VERCEL_ENV === "production" &&
  homeIndexable &&
  env.PUBLIC_EDIT_MODE !== "1" &&
  host &&
  !/(\.vercel\.app|localhost|127\.0\.0\.1)$/.test(host.split(":")[0]);
if (!live) {
  console.log("IndexNow: skipped (not a production build of a live domain).");
} else {
  // A site without its own key gets one made from its address (Ray, 2026-11-28: no hand steps for a
  // new site). The key only has to be on this site at keyLocation; it is public by design.
  if (!(await exists(keyFile))) {
    const made = createHash("sha256").update(`stoin-indexnow:${host}`).digest("hex").slice(0, 32);
    await writeFile(keyFile, made, "utf8");
    console.log("IndexNow: made this site's key from its address.");
  }
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
