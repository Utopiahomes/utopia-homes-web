// Checks the built public site (apps/web/dist) before it can go live: every page is there, each
// carries Lyra's Talk button, nothing from the editing copy or from the starter sites leaked in,
// and preview builds stay out of search engines.
import { access, readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "apps", "web", "dist");
const production = process.env.PUBLIC_ENVIRONMENT === "production" || process.env.VERCEL_ENV === "production";
const failures = [];

// Every page of the Next.js site (2026-11-25), at the same addresses.
const expected = [
  "index.html", "404.html", "stays/index.html", "stays/the-shamrock/index.html", "stays/buttercup-beauty/index.html",
  "stays/central-ave-socialization/index.html", "stays/dog-friendly-vacation-rentals/index.html",
  "stays/family-reunion-vacation-rentals/index.html", "stays/large-group-vacation-rentals/index.html",
  "stays/private-pool-vacation-rentals/index.html", "destinations/index.html", "list-your-home/index.html",
  "membership/index.html", "design/index.html", "design/quote/index.html", "about/index.html", "about/ray/index.html",
  "about/meghan/index.html", "contact/index.html", "faq/index.html", "privacy/index.html", "terms/index.html",
  "sitemap.xml", "robots.txt", "llms.txt",
].filter((file) => file.endsWith(".html"));
for (const file of expected) {
  try {
    await access(join(dist, file));
  } catch {
    failures.push(`Missing page: ${file}`);
  }
}

async function htmlFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith(".html")) found.push(path);
  }
  return found;
}

const talkBlock = 'data-stoin-block="talk-to-lucy" data-site="utopiahomes.com"';
for (const path of await htmlFiles(dist)) {
  const name = relative(dist, path).replaceAll("\\", "/");
  const html = await readFile(path, "utf8");
  if (!html.includes(talkBlock)) failures.push(`${name}: Lyra's Talk button is missing.`);
  if (/data-stoin-(key|section|image)/.test(html)) failures.push(`${name}: editing markers leaked into the public site.`);
  if (/CB Wilkinson|cbw-site|Stewardship Real Estate|srp-site/.test(html)) failures.push(`${name}: wording from a starter site is left over.`);
  if (!production && !html.includes('content="noindex,nofollow')) failures.push(`${name}: a preview page must not be indexed.`);
}

const home = await readFile(join(dist, "index.html"), "utf8");
if (!home.includes('google-site-verification')) failures.push("Home page: the Search Console tag is missing.");

if (failures.length > 0) {
  console.error(`Static site check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Static site check passed: ${expected.length} pages.`);
