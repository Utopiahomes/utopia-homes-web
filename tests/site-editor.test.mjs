import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import { hasMarkers, mark, markContent, stripMarkers } from "../apps/web/editor/markers.mjs";
import { sha256, transformHtml } from "../apps/web/editor/transform-html.mjs";
import "../apps/web/editor/markdown-inline.js";

const { parse, toMarkdown } = globalThis.StoinMarkdown;

const root = resolve(import.meta.dirname, "..");
const contentFolder = "apps/web/src/site-content";
const articleFolder = "apps/web/src/content/thinking";

function transform(html, values) {
  const uses = [];
  const lost = [];
  const result = transformHtml(html, {
    valueOf: (key) => values[key],
    onUse: (key, kind) => uses.push([key, kind]),
    onLost: (key, reason) => lost.push([key, reason]),
  });
  return { ...result, uses, lost };
}

describe("markers", () => {
  test("every string is marked and list positions become part of the key", () => {
    const marked = markContent("about", { hero: { title: "Hello" }, parts: ["One", "Two"], count: 3 });
    assert.equal(marked.hero.title, mark("about.hero.title", "Hello"));
    assert.equal(marked.parts[1], mark("about.parts.1", "Two"));
    assert.equal(marked.count, 3);
    assert.equal(stripMarkers(marked.hero.title), "Hello");
  });

  test("wording checks give the normal answer on marked strings", () => {
    markContent("guards", {});
    const title = mark("home.meta.title", "Raymond DeLuca | Make the work carry forward");
    const name = mark("site.name", "Raymond DeLuca");
    assert.equal(title.startsWith(`${name} |`), true);
    assert.equal(title.endsWith("forward"), true);
    assert.equal(title.includes("work carry"), true);
    assert.equal(mark("about.meta.title", "About").startsWith(`${name} |`), false);
    assert.equal("plain text".startsWith("plain"), true);
  });

  test("marked text becomes a span and joined values stay separate", () => {
    const html = `<p>${mark("a.one", "First")} and ${mark("a.two", "R&amp;D")}</p>`;
    const result = transform(html, { "a.one": "First", "a.two": "R&D" });
    assert.equal(result.html, '<p><span data-stoin-key="a.one">First</span> and <span data-stoin-key="a.two">R&amp;D</span></p>');
    assert.deepEqual(result.uses, [["a.one", "text"], ["a.two", "text"]]);
    assert.deepEqual(result.lost, []);
  });

  test("attributes, titles and meta tags lose their markers and are recorded", () => {
    const html = `<head><title>${mark("a.title", "About")} | ${mark("site.name", "Ray")}</title><meta name="description" content="${mark("a.description", "Words")}"></head><img alt="${mark("a.alt", "Portrait")}" src="/x.jpg"><a aria-label="${mark("a.label", "Open")}" href="/">x</a>`;
    const result = transform(html, { "a.title": "About", "site.name": "Ray", "a.description": "Words", "a.alt": "Portrait", "a.label": "Open" });
    assert.equal(hasMarkers(result.html), false);
    assert.ok(result.html.includes("<title>About | Ray</title>"));
    assert.deepEqual(result.uses, [["a.title", "meta"], ["site.name", "meta"], ["a.description", "meta"], ["a.alt", "attribute"], ["a.label", "attribute"]]);
  });

  test("an inline script keeps a correct security hash after its markers are removed", () => {
    const body = JSON.stringify({ name: mark("site.name", "Ray") });
    const result = transform(`<script type="application/ld+json">${body}</script>`, { "site.name": "Ray" });
    assert.equal(hasMarkers(result.html), false);
    assert.equal(result.hashes.get(sha256(body)), sha256(JSON.stringify({ name: "Ray" })));
  });

  test("a menu option carries its own key", () => {
    const result = transform(`<select><option value="a">${mark("c.option", "Soon")}</option></select>`, { "c.option": "Soon" });
    assert.equal(result.html, '<select><option value="a" data-stoin-key="c.option">Soon</option></select>');
  });

  test("wording a template changed or cut apart is reported, and no marker survives", () => {
    const whole = mark("a.title", "Hello there");
    const cut = whole.slice(0, whole.length - 3);
    const upper = whole.toUpperCase();
    const result = transform(`<h1>${upper}</h1><p>${cut}</p>`, { "a.title": "Hello there" });
    assert.equal(hasMarkers(result.html), false);
    assert.equal(result.html, "<h1>HELLO THERE</h1><p>Hello the</p>");
    assert.deepEqual(result.uses, []);
    assert.equal(result.lost.length, 2);
  });

  test("wording inside a drawing stays plain so the drawing is not broken", () => {
    const result = transform(`<svg><text>${mark("a.label", "Label")}</text></svg>`, { "a.label": "Label" });
    assert.equal(result.html, "<svg><text>Label</text></svg>");
    assert.equal(result.lost.length, 1);
  });
});

describe("edit deployment settings", () => {
  const config = JSON.parse(readFileSync(join(root, "vercel.edit.json"), "utf8"));
  const everyPath = config.headers.find((rule) => rule.source === "/(.*)").headers;
  const header = (name) => everyPath.find((item) => item.key === name)?.value;

  test("only app.stoin.ai can frame it and it stays out of search", () => {
    assert.equal(header("Content-Security-Policy"), "frame-ancestors https://app.stoin.ai");
    assert.equal(header("X-Robots-Tag"), "noindex, nofollow");
    assert.equal(JSON.stringify(config).includes("X-Frame-Options"), false);
  });

  test("it builds the edit copy into its own folder", () => {
    assert.ok(config.buildCommand.startsWith("PUBLIC_EDIT_MODE=1 "));
    assert.equal(config.outputDirectory, "apps/web/dist-edit");
  });
});

describe("publishing adapter", () => {
  let sandbox;
  const content = (name) => join(sandbox, contentFolder, name);
  const read = (name) => readFileSync(content(name), "utf8");
  const source = (file, ...pointer) => ({ file: `${contentFolder}/${file}`, pointer });

  function run(input) {
    const raw = typeof input === "string" ? input : JSON.stringify(input);
    const result = spawnSync(process.execPath, [join(sandbox, "scripts", "apply-site-edits.mjs")], { input: raw, encoding: "utf8" });
    return { status: result.status, output: JSON.parse(result.stdout) };
  }

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), "site-editor-"));
    mkdirSync(join(sandbox, "scripts"));
    cpSync(join(root, "scripts", "apply-site-edits.mjs"), join(sandbox, "scripts", "apply-site-edits.mjs"));
    cpSync(join(root, contentFolder), join(sandbox, contentFolder), { recursive: true });
    cpSync(join(root, articleFolder), join(sandbox, articleFolder), { recursive: true });
  });
  afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

  describe("a new article", () => {
    const post = (extra = {}) => ({
      slug: "a-new-post",
      title: 'A "new" post',
      subtitle: "",
      summary: "What it is about.",
      type: "take",
      published_at: "2026-11-19T12:00:00-05:00",
      tags: ["Stoin"],
      photo: "/images/edits/0123456789abcdef0123456789abcdef.webp",
      blocks: [
        { kind: "p", text: "First **bold** paragraph with a [link](/about)." },
        { kind: "h2", text: "A heading" },
        { kind: "li", text: "One" },
        { kind: "li", text: "Two" },
        { kind: "quote", text: "Said once." },
      ],
      ...extra,
    });
    const edit = (value, file = `${articleFolder}/a-new-post.md`) => ({ source: { file, kind: "new_article" }, previous: "", value: JSON.stringify(value) });

    test("writes the file in the site's own article format", { skip: "fixtures are raymonddeluca.com's articles and pages; rewrite for SRP" }, () => {
      const { status, output } = run({ edits: [edit(post())] });
      assert.equal(status, 0, JSON.stringify(output));
      const text = readFileSync(join(sandbox, articleFolder, "a-new-post.md"), "utf8");
      assert.match(text, /^---\ntitle: "A \\"new\\" post"\nslug: "a-new-post"\nsummary: "What it is about."\ntype: take\npublished_at: 2026-11-19T12:00:00-05:00\nstatus: published\nfeatured: false\nauthor: Raymond DeLuca\nsocial_image: "\/images\/edits\/0123456789abcdef0123456789abcdef.webp"\ntags:\n {2}- "Stoin"\n---\n/);
      assert.ok(text.endsWith("First **bold** paragraph with a [link](/about).\n\n## A heading\n\n- One\n- Two\n\n> Said once.\n"));
    });

    test("refuses an address already taken, by file or by slug", { skip: "fixtures are raymonddeluca.com's articles and pages; rewrite for SRP" }, () => {
      assert.equal(run({ edits: [edit(post({ slug: "better-capitalism" }), `${articleFolder}/better-capitalism.md`)] }).status, 1);
      const before = readdirSync(join(sandbox, articleFolder)).length;
      assert.equal(run({ edits: [edit(post({ slug: "chatbot-agent-synth" }), `${articleFolder}/chatbot-agent-synth.md`)] }).status, 1);
      assert.equal(readdirSync(join(sandbox, articleFolder)).length, before);
    });

    test("refuses what could break the page or its front matter", () => {
      const bad = [
        post({ title: "Two\nlines" }),
        post({ summary: "<script>x</script>" }),
        post({ blocks: [{ kind: "p", text: "# not a heading" }] }),
        post({ blocks: [{ kind: "p", text: "![image](x.png)" }] }),
        post({ blocks: [{ kind: "p", text: "[x](javascript:alert(1))" }] }),
        post({ blocks: [{ kind: "script", text: "x" }] }),
        post({ blocks: [] }),
        post({ type: "essay" }),
        post({ photo: "https://example.com/x.jpg" }),
        post({ slug: "../escape" }),
      ];
      for (const value of bad) assert.equal(run({ edits: [edit(value, `${articleFolder}/${/^[a-z0-9-]+$/.test(value.slug) ? value.slug : "x"}.md`)] }).status, 1, JSON.stringify(value).slice(0, 80));
      assert.equal(run({ edits: [edit(post(), `${contentFolder}/a-new-post.md`)] }).status, 1);
      assert.equal(run({ edits: [{ ...edit(post()), previous: "x" }] }).status, 1);
    });
  });

  test("changes one value and keeps the rest of the file exactly", () => {
    const before = read("site.json");
    const previous = JSON.parse(before).skipLink;
    const { status, output } = run({ edits: [{ source: source("site.json", "skipLink"), previous, value: 'Skip "ahead" — now' }] });
    assert.equal(status, 0);
    assert.equal(output.ok, true);
    assert.equal(read("site.json"), before.replace(JSON.stringify(previous), JSON.stringify('Skip "ahead" — now')));
  });

  test("the diff holds only the edited values across every wording file", () => {
    const files = readdirSync(join(root, contentFolder)).filter((name) => name.endsWith(".json") && !["private.json", "layout.json", "lists.json"].includes(name));
    const edits = [];
    for (const file of files) {
      const strings = [];
      const walk = (value, pointer) => {
        if (typeof value === "string" && !value.startsWith("/images/")) strings.push({ pointer, previous: value });
        else if (value && typeof value === "object") for (const [name, item] of Object.entries(value)) walk(item, [...pointer, Array.isArray(value) ? Number(name) : name]);
      };
      walk(JSON.parse(read(file)), []);
      const step = Math.max(1, Math.floor(strings.length / 6));
      strings.filter((_, index) => index % step === 0).slice(0, 6).forEach(({ pointer, previous }, index) => {
        edits.push({ file, source: source(file, ...pointer), previous, value: `Edited ${index} “wording” \\ ${previous.length}` });
      });
    }
    assert.ok(edits.length >= files.length);

    const before = Object.fromEntries(files.map((file) => [file, read(file)]));
    const { status } = run({ edits: edits.map(({ source: where, previous, value }) => ({ source: where, previous, value })) });
    assert.equal(status, 0);

    for (const file of files) {
      const fileEdits = edits.filter((edit) => edit.file === file);
      const oldLines = before[file].split("\n");
      const newLines = read(file).split("\n");
      assert.equal(newLines.length, oldLines.length, file);
      const changed = oldLines.flatMap((line, index) => (line === newLines[index] ? [] : [index]));
      assert.ok(changed.length <= fileEdits.length, file);

      const parsed = JSON.parse(before[file]);
      for (const edit of fileEdits) {
        const parent = edit.source.pointer.slice(0, -1).reduce((value, part) => value[part], parsed);
        parent[edit.source.pointer.at(-1)] = edit.value;
      }
      assert.deepEqual(JSON.parse(read(file)), parsed, file);
      for (const index of changed) {
        const edit = fileEdits.find((candidate) => newLines[index].includes(JSON.stringify(candidate.value)));
        assert.ok(edit, `${file} line ${index + 1} changed without an edit`);
      }
    }
  });

  test("any failed check changes nothing and names every failed item", () => {
    const before = read("site.json");
    const name = JSON.parse(before).name;
    const { status, output } = run({
      edits: [
        { source: source("site.json", "name"), previous: name, value: "A good edit" },
        { source: source("site.json", "skipLink"), previous: "Not what is published", value: "Stale" },
        { source: source("site.json", "description"), previous: JSON.parse(before).description, value: "<b>bold</b>" },
        { source: source("site.json", "rss", "title"), previous: JSON.parse(before).rss.title, value: "" },
        { source: source("site.json", "missing"), previous: "x", value: "y" },
        { source: { file: "package.json", pointer: ["name"] }, previous: "x", value: "y" },
        { source: { file: `${contentFolder}/../../package.json`, pointer: ["name"] }, previous: "x", value: "y" },
        { source: { file: `${contentFolder}/privacy.md`, pointer: ["x"] }, previous: "x", value: "y" },
        { source: { file: `${contentFolder}/private.json`, pointer: ["signIn", "title"] }, previous: "x", value: "y" },
      ],
    });
    assert.equal(status, 1);
    assert.equal(output.ok, false);
    assert.deepEqual(output.failed.map((item) => item.index), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.ok(output.failed.every((item) => typeof item.reason === "string" && item.reason));
    assert.equal(read("site.json"), before);
  });

  test("a failure in one file leaves other files alone", () => {
    const site = read("site.json");
    const home = read("home.json");
    const { status } = run({
      edits: [
        { source: source("site.json", "name"), previous: JSON.parse(site).name, value: "Changed" },
        { source: source("home.json", "hero", "eyebrow"), previous: "Wrong", value: "Changed" },
      ],
    });
    assert.equal(status, 1);
    assert.equal(read("site.json"), site);
    assert.equal(read("home.json"), home);
  });

  test("bad input is refused in plain JSON", () => {
    for (const input of ["not json", {}, { edits: [] }]) {
      const { status, output } = run(input);
      assert.equal(status, 1);
      assert.equal(output.ok, false);
      assert.equal(output.failed.length, 1);
    }
  });

  test("editing the same wording twice is refused", () => {
    const previous = JSON.parse(read("site.json")).name;
    const edit = { source: source("site.json", "name"), previous, value: "Twice" };
    const { status, output } = run({ edits: [edit, edit] });
    assert.equal(status, 1);
    assert.deepEqual(output.failed.map((item) => item.index), [1]);
  });

  test("no temporary files are left behind", () => {
    const previous = JSON.parse(read("site.json")).name;
    run({ edits: [{ source: source("site.json", "name"), previous, value: "Clean" }] });
    assert.deepEqual(readdirSync(join(sandbox, contentFolder)).filter((name) => name.endsWith(".tmp")), []);
  });

  test("an article paragraph changes in place and nothing else in the file moves", { skip: "fixtures are raymonddeluca.com's articles and pages; rewrite for SRP" }, () => {
    const file = `${articleFolder}/better-capitalism.md`;
    const before = readFileSync(join(sandbox, file), "utf8");
    const previous = "I don't want to abolish capitalism.";
    const start = before.indexOf(previous);
    const value = "I don't want to *end* capitalism. I want to [widen](/founder-vision) it.";
    const { status, output } = run({ edits: [{ source: { file, kind: "markdown", start, end: start + previous.length }, previous, value }] });
    assert.equal(status, 0, JSON.stringify(output));
    assert.equal(readFileSync(join(sandbox, file), "utf8"), before.replace(previous, value));
  });

  test("a paragraph that moved is still found when it appears once, and refused when it doesn't", { skip: "fixtures are raymonddeluca.com's articles and pages; rewrite for SRP" }, () => {
    const file = `${articleFolder}/better-capitalism.md`;
    const previous = "I don't want to abolish capitalism.";
    const moved = run({ edits: [{ source: { file, kind: "markdown", start: 3, end: 20 }, previous, value: "Moved but found." }] });
    assert.equal(moved.status, 0);
    assert.ok(readFileSync(join(sandbox, file), "utf8").includes("Moved but found."));
    const gone = run({ edits: [{ source: { file, kind: "markdown", start: 3, end: 20 }, previous: "Not in the article.", value: "x" }] });
    assert.equal(gone.status, 1);
  });

  test("paragraph edits that would change the page's structure are refused", { skip: "fixtures are raymonddeluca.com's articles and pages; rewrite for SRP" }, () => {
    const file = `${articleFolder}/chatbot-agent-synth.mdx`;
    const text = readFileSync(join(sandbox, file), "utf8");
    const previous = "There's a terminology problem happening in artificial intelligence.";
    const start = text.indexOf(previous);
    const where = { file, kind: "markdown", start, end: start + previous.length };
    for (const value of ["## A heading now", "- a list now", "two\nparagraphs", "an {expression}", "<b>html</b>", " "]) {
      const { status } = run({ edits: [{ source: where, previous, value }] });
      assert.equal(status, 1, value);
    }
    assert.equal(readFileSync(join(sandbox, file), "utf8"), text);
  });

  test("an article title in the front matter is rewritten as one quoted line", { skip: "fixtures are raymonddeluca.com's articles and pages; rewrite for SRP" }, () => {
    const file = `${articleFolder}/better-capitalism.md`;
    const before = readFileSync(join(sandbox, file), "utf8");
    const { status } = run({ edits: [{ source: { file, kind: "frontmatter", field: "title" }, previous: "Better Capitalism", value: 'Better "Capitalism"' }] });
    assert.equal(status, 0);
    assert.equal(readFileSync(join(sandbox, file), "utf8"), before.replace('title: "Better Capitalism"', 'title: "Better \\"Capitalism\\""'));
    const slug = run({ edits: [{ source: { file, kind: "frontmatter", field: "slug" }, previous: "better-capitalism", value: "x" }] });
    assert.equal(slug.status, 1);
  });

  test("a legal paragraph can be edited, and a photo must stay a photo", { skip: "fixtures are raymonddeluca.com's articles and pages; rewrite for SRP" }, () => {
    const file = `${contentFolder}/terms.md`;
    const text = read("terms.md");
    const previous = text.replace(/\r\n/g, "\n").split(/\n{2,}/).find((block) => !block.startsWith("#"));
    const start = text.indexOf(previous);
    assert.equal(run({ edits: [{ source: { file, kind: "markdown", start, end: start + previous.length }, previous, value: "New terms wording." }] }).status, 0);
    const photo = run({ edits: [{ source: source("home.json", "founder", "image"), previous: "/images/ray-portrait.jpg", value: "javascript:alert(1)" }] });
    assert.equal(photo.status, 1);
    const swapped = run({ edits: [{ source: source("home.json", "founder", "image"), previous: "/images/ray-portrait.jpg", value: "/images/edits/abc.webp" }] });
    assert.equal(swapped.status, 0);
  });

  test("a page layout is replaced only when the published layout is unchanged", () => {
    const layout = JSON.parse(read("layout.json"));
    const where = { file: `${contentFolder}/layout.json`, kind: "layout", page: "home" };
    const next = { ...layout.home, order: ["hero", "cta", "connection", "workspaces", "founder", "new1"], added: { new1: { type: "text", title: "Hi", body: "There" } } };
    const stale = run({ edits: [{ source: where, previous: JSON.stringify({ order: [] }), value: JSON.stringify(next) }] });
    assert.equal(stale.status, 1);
    const ok = run({ edits: [{ source: where, previous: JSON.stringify(layout.home), value: JSON.stringify(next) }] });
    assert.equal(ok.status, 0);
    assert.deepEqual(JSON.parse(read("layout.json")).home, next);
    assert.deepEqual(JSON.parse(read("layout.json")).about, layout.about);
  });
});

describe("photos and paragraphs in the edit build", () => {
  test("a photo whose address is one content value is marked for replacing", () => {
    const html = `<img src="${mark("home.founder.image", "/images/a.jpg")}" alt="${mark("home.founder.imageAlt", "Ray")}">`;
    const result = transform(html, { "home.founder.image": "/images/a.jpg", "home.founder.imageAlt": "Ray" });
    assert.equal(result.html, '<img data-stoin-image="home.founder.image" src="/images/a.jpg" alt="Ray">');
    assert.deepEqual(result.uses, [["home.founder.image", "image"], ["home.founder.imageAlt", "attribute"]]);
  });

  test("a paragraph's source place is read and never shipped", () => {
    const blocks = [];
    const { html } = transformHtml('<p data-stoin-key="article.x.b1" data-stoin-format="markdown" data-stoin-src="a.md:1:5">Hi</p>', {
      valueOf: () => undefined,
      onUse: () => {},
      onLost: () => {},
      onBlock: (key, src) => blocks.push([key, src]),
    });
    assert.deepEqual(blocks, [["article.x.b1", "a.md:1:5"]]);
    assert.equal(html.includes("data-stoin-src"), false);
  });

  test("inline Markdown turns back into exactly the text it came from", () => {
    for (const text of ["Plain.", "**Bold** and *italic* with `code`.", "A [link](/about) and [mail](mailto:a@b.co).", "Escaped \\*star\\* stays."]) {
      assert.equal(toMarkdown(parse(text, "inline"), "inline"), text);
    }
    assert.equal(parse("[bad](javascript:alert(1))", "inline"), null);
  });

  test("every Privacy and Terms paragraph survives the links-only round trip", { skip: "CB Wilkinson has no Privacy or Terms page" }, () => {
    for (const name of ["privacy.md", "terms.md"]) {
      const blocks = readFileSync(join(root, contentFolder, name), "utf8").replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
      for (const block of blocks) {
        const text = block.replace(/^## /, "");
        assert.equal(toMarkdown(parse(text, "links"), "links"), text, `${name}: ${text.slice(0, 40)}`);
      }
    }
  });
});
