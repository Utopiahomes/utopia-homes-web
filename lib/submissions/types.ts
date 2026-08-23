import type { Submission } from "@/types/content";
export interface SubmissionStore { create(submission: Submission): Promise<{ id: string }>; findMembershipByEmail(email: string): Promise<Submission | null>; }
