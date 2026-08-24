import type { Submission } from "@/types/content";
import type { SubmissionStore } from "./types";
const records: Submission[] = [];
export const fixtureSubmissionStore: SubmissionStore = {
  async create(submission) {
    if (submission.kind === "membership") {
      const existing = records.find((record) => record.kind === "membership" && record.email.toLowerCase() === submission.email.toLowerCase());
      if (existing) return { id: existing.id, duplicate: true };
    }
    records.push(submission);
    return { id: submission.id, duplicate: false };
  },
  async findMembershipByEmail(email) {
    const existing = records.find((record) => record.kind === "membership" && record.email.toLowerCase() === email.toLowerCase());
    return existing ? { id: existing.id } : null;
  },
};
export function clearFixtureSubmissions() { records.length = 0; }
export function getFixtureSubmissions() { return [...records]; }
