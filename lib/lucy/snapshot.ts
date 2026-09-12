import { createHash } from "node:crypto";
import type { PublicLucyFaqEntry } from "@/types/content";

export const PUBLIC_LUCY_SNAPSHOT_SCHEMA = "lucy-public-faq-v1" as const;

export interface PublicLucySnapshot {
  schema: typeof PUBLIC_LUCY_SNAPSHOT_SCHEMA;
  faqs: PublicLucyFaqEntry[];
}

function normalizeQuestion(question: string) {
  const normalized = question.trim().replace(/\s+/gu, " ").toLowerCase();
  if (!/^[\x20-\x7e]+$/.test(normalized)) {
    throw new Error("Public Lucy questions must use printable ASCII for cross-runtime canonicalization.");
  }
  return normalized;
}

export function createPublicLucySnapshot(entries: PublicLucyFaqEntry[]): PublicLucySnapshot {
  if (entries.length === 0) throw new Error("A Public Lucy snapshot needs at least one FAQ.");

  const seen = new Set<string>();
  const faqs = entries.map((entry) => {
    const question = normalizeQuestion(entry.question);
    const answer = entry.answer.trim();
    const source = entry.source.trim();
    if (!answer || !source || seen.has(question)) {
      throw new Error("Public Lucy FAQ entries must be unique and complete.");
    }
    seen.add(question);
    return { question, answer, source };
  });
  faqs.sort((left, right) => left.question < right.question ? -1 : left.question > right.question ? 1 : 0);

  return { schema: PUBLIC_LUCY_SNAPSHOT_SCHEMA, faqs };
}

export function canonicalizePublicLucySnapshot(snapshot: PublicLucySnapshot) {
  // Match Cloud Lucy's Python json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False).
  return JSON.stringify({
    faqs: snapshot.faqs.map((entry) => ({
      answer: entry.answer,
      question: entry.question,
      source: entry.source,
    })),
    schema: snapshot.schema,
  });
}

export function digestPublicLucySnapshot(snapshot: PublicLucySnapshot) {
  return createHash("sha256").update(canonicalizePublicLucySnapshot(snapshot), "utf8").digest("hex");
}
