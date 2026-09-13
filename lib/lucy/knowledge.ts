import { createHash } from "node:crypto";
import type { PublicLucyKnowledgeEntry } from "@/types/content";

export const PUBLIC_LUCY_KNOWLEDGE_SCHEMA = "lucy-public-knowledge-v1" as const;

type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue };

function sortKeys(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortKeys(child)]),
  );
}

export function createPublicLucyKnowledgeSnapshot(entries: PublicLucyKnowledgeEntry[]) {
  const ids = new Set<string>();
  const normalized = entries.map((entry) => {
    if (ids.has(entry.id)) throw new Error(`Duplicate Public Lucy knowledge id: ${entry.id}`);
    ids.add(entry.id);
    return {
      ...entry,
      property_slug: entry.property_slug ?? null,
      property_facts: entry.property_facts ?? null,
      effective_until: entry.effective_until ?? null,
    };
  });
  normalized.sort((left, right) => left.id.localeCompare(right.id));
  return { schema: PUBLIC_LUCY_KNOWLEDGE_SCHEMA, entries: normalized };
}

export function canonicalizePublicLucyKnowledgeSnapshot(
  snapshot: ReturnType<typeof createPublicLucyKnowledgeSnapshot>,
) {
  return JSON.stringify(sortKeys(snapshot as unknown as CanonicalValue));
}

export function digestPublicLucyKnowledgeSnapshot(
  snapshot: ReturnType<typeof createPublicLucyKnowledgeSnapshot>,
) {
  return createHash("sha256")
    .update(canonicalizePublicLucyKnowledgeSnapshot(snapshot), "utf8")
    .digest("hex");
}
