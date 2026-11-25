import type { PublicLucyContent } from "../types/content.js";
import snapshot from "./lucy-public-snapshot.v0.json" with { type: "json" };
import { publicLucyContentSchema } from "./schemas.js";

const result = publicLucyContentSchema.safeParse(snapshot);

if (!result.success) {
  throw new Error(`Invalid Public Lucy content: ${result.error.message}`);
}

export const publicLucyContent: PublicLucyContent = result.data;
