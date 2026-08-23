import type { Submission } from "@/types/content";
import type { SubmissionStore } from "./types";
const records: Submission[] = [];
export const fixtureSubmissionStore: SubmissionStore = {
  async create(submission) { records.push(submission); return { id: submission.id }; },
  async findMembershipByEmail(email) { return records.find((record) => record.kind === "membership" && record.email.toLowerCase() === email.toLowerCase()) ?? null; },
};
export function clearFixtureSubmissions() { records.length = 0; }
export function getFixtureSubmissions() { return [...records]; }
