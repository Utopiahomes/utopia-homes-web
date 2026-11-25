import type { Submission } from "../../types/content.js";
export interface SubmissionStore {
  create(submission: Submission): Promise<{ id: string; duplicate: boolean }>;
  findMembershipByEmail(email: string): Promise<{ id: string } | null>;
}
