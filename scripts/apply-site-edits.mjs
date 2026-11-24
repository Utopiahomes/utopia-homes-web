#!/usr/bin/env node
// Publishing adapter for the Stoin Sites owner editor (run by Stoin's site runner, never by a
// coding agent). Reads {"edits":[{source:{file,pointer},previous,value}]} on stdin. Either every
// edit is applied or nothing changes: each value must still be exactly `previous`, or the owner's
// draft is out of date. Only wording files in content/site-content may change.
// Ray, 2026-11-23: Utopia Homes became editable from app.stoin.ai/owner like raymonddeluca.com.

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const folder = realpathSync(resolve(root, "content", "site-content"));

function finish(result, exitCode) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCode;
}

function wordingFile(file) {
  if (typeof file !== "string" || !file || isAbsolute(file) || file.includes("\\")) throw new Error("source.file must be a path inside the repository");
  const full = realpathSync(resolve(root, file));
  if (dirname(full) !== folder || !basename(full).endsWith(".json")) throw new Error(`${file} is not a wording file`);
  return full;
}

function main() {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const edits = Array.isArray(input?.edits) ? input.edits : [];
  if (!edits.length) throw new Error("no edits");
  const files = new Map();
  for (const edit of edits) {
    const full = wordingFile(edit?.source?.file);
    const pointer = edit?.source?.pointer;
    if (!Array.isArray(pointer) || !pointer.length) throw new Error("source.pointer is missing");
    if (typeof edit.value !== "string" || typeof edit.previous !== "string") throw new Error("previous and value must be text");
    if (!files.has(full)) files.set(full, JSON.parse(readFileSync(full, "utf8")));
    let parent = files.get(full);
    for (const step of pointer.slice(0, -1)) {
      parent = parent?.[step];
      if (parent === null || typeof parent !== "object") throw new Error(`${pointer.join(".")} is not in ${edit.source.file}`);
    }
    const last = pointer.at(-1);
    if (typeof parent[last] !== "string") throw new Error(`${pointer.join(".")} is not wording in ${edit.source.file}`);
    if (parent[last] !== edit.previous) throw new Error(`${pointer.join(".")} changed since the draft began`);
    parent[last] = edit.value;
  }
  for (const [full, data] of files) writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
  finish({ ok: true, files: [...files.keys()].map((full) => full.slice(root.length + 1).replaceAll("\\", "/")) }, 0);
}

try {
  main();
} catch (error) {
  finish({ ok: false, error: error.message }, 1);
}
