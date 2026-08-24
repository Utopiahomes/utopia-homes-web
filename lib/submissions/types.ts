import type { Submission } from "@/types/content";
export interface SubmissionStore {
  create(submission: Submission): Promise<{ id: string; duplicate: boolean }>;
  findMembershipByEmail(email: string): Promise<{ id: string } | null>;
}
