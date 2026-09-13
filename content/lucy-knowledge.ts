import type { PublicLucyKnowledgeSnapshot } from "@/types/content";
import approvedSnapshot from "./lucy-public-knowledge.r1.approved.json";
import { publicLucyKnowledgeSnapshotSchema } from "./schemas";

const result = publicLucyKnowledgeSnapshotSchema.safeParse(approvedSnapshot);

if (!result.success) {
  throw new Error(`Invalid approved Public Lucy R1 knowledge: ${result.error.message}`);
}

export const publicLucyKnowledgeSnapshot: PublicLucyKnowledgeSnapshot = result.data;
