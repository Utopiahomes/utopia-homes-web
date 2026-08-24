import { fixtureSubmissionStore } from "./fixture";
import { createSupabaseSubmissionStore } from "./supabase";
import type { SubmissionStore } from "./types";

let resolvedStore: SubmissionStore | undefined;

export function resolveSubmissionStore(env: NodeJS.ProcessEnv = process.env): SubmissionStore {
  const mode = env.SUBMISSION_STORE?.trim().toLowerCase();
  if (mode === "memory" || (!mode && env.NODE_ENV !== "production")) return fixtureSubmissionStore;
  if (mode === "supabase") return createSupabaseSubmissionStore({
    url: env.SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  });
  throw new Error("SUBMISSION_STORE must be set to 'supabase' outside local/test development.");
}

function getStore() {
  resolvedStore ??= resolveSubmissionStore();
  return resolvedStore;
}

// Resolve lazily so builds never need database credentials. Runtime writes in
// deployed environments still fail closed when Supabase is not configured.
export const submissionStore: SubmissionStore = {
  create: (submission) => getStore().create(submission),
  findMembershipByEmail: (email) => getStore().findMembershipByEmail(email),
};
