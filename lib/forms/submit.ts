import { randomUUID } from "node:crypto";
import type { Submission } from "@/types/content";
import { submissionStore } from "@/lib/submissions";
import type { SubmissionStore } from "@/lib/submissions/types";
import { schemas, type FormKind } from "./schemas";
import { sendSubmissionEmails } from "@/lib/email/submissions";
export async function submitForm(kind: FormKind, body: unknown, store: SubmissionStore = submissionStore) {
  const result = schemas[kind].safeParse(body);
  if (!result.success) return { ok: false as const, status: 400, message: "Please review the highlighted information.", errors: result.error.flatten().fieldErrors };
  const data = result.data as Record<string, unknown>;
  delete data.website;
  data.email = String(data.email).toLowerCase();
  try {
    if (kind === "membership" && await store.findMembershipByEmail(String(data.email))) return duplicateMembershipResponse();
  } catch (error) {
    return storageFailureResponse(error);
  }
  const submission = { ...data, kind, id: randomUUID(), submittedAt: new Date().toISOString() } as Submission;
  try {
    const stored = await store.create(submission);
    if (stored.duplicate && kind === "membership") return duplicateMembershipResponse();
  } catch (error) {
    return storageFailureResponse(error);
  }
  await sendSubmissionEmails(submission);
  return { ok: true as const, status: 201, duplicate: false, message: kind === "membership" ? "Welcome to Utopia. We’ll keep you close to what’s next." : "Thank you. A Utopia team member will be in touch." };
}

function duplicateMembershipResponse() {
  return { ok: true as const, status: 200, duplicate: true, message: "You’re already on the Utopia list—we’ll keep you posted." };
}

function storageFailureResponse(error: unknown) {
  console.error("Submission storage failed", error instanceof Error ? error.message : "Unknown storage error");
  return { ok: false as const, status: 503, message: "We couldn’t save your request right now. Please try again in a moment." };
}
