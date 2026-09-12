import type { PublicLucyKnowledgeSnapshot } from "@/types/content";
import candidate from "./lucy-public-knowledge.r1.candidate.json";
import { publicLucyKnowledgeSnapshotSchema } from "./schemas";

const result = publicLucyKnowledgeSnapshotSchema.safeParse(candidate);

if (!result.success) {
  throw new Error(`Invalid Public Lucy R1 knowledge candidate: ${result.error.message}`);
}

export const publicLucyKnowledgeCandidate: PublicLucyKnowledgeSnapshot = result.data;
