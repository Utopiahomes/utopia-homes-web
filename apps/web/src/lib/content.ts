import type { z } from "astro/zod";
import { markContent } from "../../editor/markers.mjs";
import { contentSchemas, type ContentFile } from "./content-schema";

// Loads every wording file in src/site-content and stops the build with a plain message when one is wrong.

const folder = "src/site-content";
const jsonFiles = import.meta.glob<string>("../site-content/*.json", { query: "?raw", import: "default", eager: true });

function fail(file: string, problem: string): never {
  throw new Error(`Content file ${folder}/${file} cannot be used.\n${problem}`);
}

for (const path of Object.keys(jsonFiles)) {
  const name = path.split("/").pop()!.replace(/\.json$/, "");
  if (!(name in contentSchemas)) fail(`${name}.json`, "This file name is not recognized. Use one of the files listed in the README.");
}

function load<Name extends ContentFile>(name: Name): z.infer<(typeof contentSchemas)[Name]> {
  const file = `${name}.json`;
  const raw = jsonFiles[`../site-content/${file}`];
  if (raw === undefined) fail(file, "The file is missing.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(file, `It is not valid JSON: ${(error as Error).message}`);
  }

  const result = contentSchemas[name].safeParse(parsed);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".") || "(whole file)"}: ${issue.message}`);
    fail(file, `Keep every key and change only the wording:\n${problems.join("\n")}`);
  }
  // The edit build tags wording so the owner can click it.
  const editable = import.meta.env.PUBLIC_EDIT_MODE === "1" && name !== "layout";
  return (editable ? markContent(name, result.data) : result.data) as z.infer<(typeof contentSchemas)[Name]>;
}

export const content = {
  site: load("site"),
  layout: load("layout"),
  home: load("home"),
  housePage: load("house-page"),
  stays: load("stays"),
};
