import { randomUUID } from "node:crypto";
import type { Submission } from "@/types/content";
import { submissionStore } from "@/lib/submissions";
import { schemas, type FormKind } from "./schemas";
import { sendSubmissionEmails } from "@/lib/email/submissions";
export async function submitForm(kind: FormKind, body: unknown) {
  const result = schemas[kind].safeParse(body);
  if (!result.success) return { ok: false as const, status: 400, message: "Please review the highlighted information.", errors: result.error.flatten().fieldErrors };
  const data = result.data as Record<string, unknown>;
  delete data.website;
  if (kind === "membership" && await submissionStore.findMembershipByEmail(String(data.email))) return { ok: true as const, status: 200, duplicate: true, message: "You’re already on the Utopia list—we’ll keep you posted." };
  const submission = { ...data, kind, id: randomUUID(), submittedAt: new Date().toISOString() } as Submission;
  await submissionStore.create(submission);
  await sendSubmissionEmails(submission);
  return { ok: true as const, status: 201, duplicate: false, message: kind === "membership" ? "Welcome to Utopia. We’ll keep you close to what’s next." : "Thank you. A Utopia team member will be in touch." };
}
