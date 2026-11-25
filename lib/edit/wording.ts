import home from "../../apps/web/src/site-content/home.json";
import housePage from "../../apps/web/src/site-content/house-page.json";
import stays from "../../apps/web/src/site-content/stays.json";
import { markContent } from "./markers";

// Ray, 2026-11-23: "Upgrade the site to be editable". Page wording the owner can change lives in
// content/site-content/*.json, the files the Stoin owner editor (app.stoin.ai/owner) publishes to
// through scripts/apply-site-edits.mjs. Facts code reads (names, guests, parking, pets, prices)
// stay in content/*.ts. The edit copy (utopia-homes-edit, SITE_EDIT_MODE=1) marks every string so
// the owner can click it; the public site never does.

export const editMode = process.env.SITE_EDIT_MODE === "1" || process.env.PUBLIC_EDIT_MODE === "1";

/** Every wording file, by the name its keys start with, and the pages that show it. */
export const wordingFiles = {
  home: { data: home, file: "content/site-content/home.json" },
  "house-page": { data: housePage, file: "content/site-content/house-page.json" },
  stays: { data: stays, file: "content/site-content/stays.json" },
} as const;

const marked = <T,>(name: string, data: T): T => (editMode ? markContent(name, data) : data);

export const wording = {
  home: marked("home", home),
  housePage: marked("house-page", housePage),
  stays: marked("stays", stays) as Record<string, StayWording>,
};

export type StayWording = {
  shortDescription: string;
  fullDescription: string;
  uniqueFeatures: string[];
  designerNote: { headline: string; paragraphs: string[] };
  accessibility: string;
};
