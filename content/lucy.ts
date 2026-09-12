import type { PublicLucyContent } from "@/types/content";
import snapshot from "./lucy-public-snapshot.v0.json";
import { publicLucyContentSchema } from "./schemas";

const result = publicLucyContentSchema.safeParse(snapshot);

if (!result.success) {
  throw new Error(`Invalid Public Lucy content: ${result.error.message}`);
}

export const publicLucyContent: PublicLucyContent = result.data;
