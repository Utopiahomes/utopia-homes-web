import { readFile } from "node:fs/promises";
import path from "node:path";
import { properties } from "@/content/properties";
import { editMode, wordingFiles } from "@/lib/edit/wording";
import { itemKey } from "@/lib/edit/markers";

// The Stoin owner editor's contract (utopia-workspaces docs/site-editor.md), served at /_stoin/*
// (next.config.ts rewrites it here) by the edit copy only. The public site answers 404.
// manifest.json lists every editable string with its published value and where it is stored;
// the scripts mark the page and talk to app.stoin.ai.

const SITE = "utopiahomes.com";
const SCRIPTS = new Set(["mark.js", "markdown-inline.js", "bridge.js"]);

const houses = properties.map((property) => ({ slug: property.slug, path: `/stays/${property.slug}`, title: property.name }));

/** The pages a key shows on, so the editor can say when wording is shared. */
function pagesFor(file: string, pointer: (string | number)[]): string[] {
  if (file === "home") return ["/"];
  if (file === "house-page") return houses.map((house) => house.path);
  const house = houses.find((item) => item.slug === pointer[0]);
  if (!house) return [];
  if (pointer[1] === "shortDescription") return [house.path, "/", "/stays"];
  if (pointer[1] === "accessibility") return [house.path, "/faq"];
  if (pointer[1] === "designerNote") return [house.path, "/about/meghan"];
  return [house.path];
}

function manifest() {
  const items: object[] = [];
  for (const [name, { data, file }] of Object.entries(wordingFiles)) {
    const walk = (value: unknown, pointer: (string | number)[]) => {
      if (typeof value === "string") {
        items.push({ key: itemKey(name, pointer), value, kind: "text", class: "wording", pages: pagesFor(name, pointer), source: { file, pointer } });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, [...pointer, index]));
      } else if (value && typeof value === "object") {
        for (const [key, item] of Object.entries(value)) walk(item, [...pointer, key]);
      }
    };
    walk(data, []);
  }
  return {
    version: 1,
    site: SITE,
    pages: [{ path: "/", title: "Home" }, ...houses.map(({ path: page, title }) => ({ path: page, title }))],
    items,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  if (!editMode) return new Response("Not found", { status: 404 });
  const { file } = await params;
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (file === "manifest.json") return Response.json(manifest(), { headers });
  if (!SCRIPTS.has(file)) return new Response("Not found", { status: 404 });
  const source = await readFile(path.join(process.cwd(), "editor", file), "utf8");
  return new Response(source, { headers: { ...headers, "Content-Type": "text/javascript; charset=utf-8" } });
}
