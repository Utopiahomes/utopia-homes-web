import { fixtureSubmissionStore } from "./fixture";
// V1 has no database dependency. Replace this binding with a Postgres/Supabase
// implementation later without changing forms or route handlers.
export const submissionStore = fixtureSubmissionStore;
