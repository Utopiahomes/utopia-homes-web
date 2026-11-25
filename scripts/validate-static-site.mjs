// Checks the built public site (apps/web/dist) before it can go live: every page is there, each
// carries Lucy's Talk button, nothing from the editing copy or from the starter sites leaked in,
// and the preview stays out of search engines until CB Wilkinson decides otherwise.
import { access, readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "apps", "web", "dist");
const production = process.env.PUBLIC_ENVIRONMENT === "production";
const failures = [];

const expected = ["index.html", "bridge-fund-vii/index.html", "commercial-carpentry/index.html", "404.html"];
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

const talkBlock = 'data-stoin-block="talk-to-lucy" data-site="cbw-site.vercel.app"';
for (const path of await htmlFiles(dist)) {
  const name = relative(dist, path).replaceAll("\\", "/");
  const html = await readFile(path, "utf8");
  if (!html.includes(talkBlock)) failures.push(`${name}: Lucy's Talk button is missing.`);
  if (/data-stoin-(key|section|image)/.test(html)) failures.push(`${name}: editing markers leaked into the public site.`);
  if (/Raymond DeLuca|raymonddeluca\.com|Stewardship|Lovell|Lyra/.test(html)) failures.push(`${name}: wording from a starter site is left over.`);
  if (!production && !html.includes('content="noindex,nofollow"')) failures.push(`${name}: a preview page must not be indexed.`);
}

const home = await readFile(join(dist, "index.html"), "utf8");
if (!home.includes('id="contact-info"')) failures.push("Home page: the contact panel is missing.");

if (failures.length > 0) {
  console.error(`Static site check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Static site check passed: ${expected.length} pages.`);
