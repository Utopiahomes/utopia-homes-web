import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Submission } from "@/types/content";
import type { ClaimedNotification, NotificationStatus, NotificationStore } from "./types";

type SupabaseNotificationStoreOptions = { url?: string; secretKey?: string; client?: SupabaseClient };

export function createSupabaseNotificationStore(options: SupabaseNotificationStoreOptions): NotificationStore {
  const client = options.client ?? createNotificationClient(options.url, options.secretKey);
  return {
    async ensure(submission) {
      const { error } = await client.from("notification_outbox").upsert({ id: submission.id, submission_id: submission.id, kind: submission.kind }, { onConflict: "submission_id", ignoreDuplicates: true });
      if (error) throw new Error(`Supabase notification enqueue failed (${error.code ?? "unknown"}).`);
    },
    async claimById(id, leaseSeconds) {
      const { data, error } = await client.rpc("claim_notification_outbox", { p_id: id, p_lease_seconds: leaseSeconds });
      if (error) throw new Error(`Supabase notification claim failed (${error.code ?? "unknown"}).`);
      const row = Array.isArray(data) ? data[0] : data;
      return row ? fromClaimRow(row as Record<string, unknown>) : null;
    },
    async claimDue(limit, leaseSeconds) {
      const { data, error } = await client.rpc("claim_notification_outbox_batch", { p_limit: limit, p_lease_seconds: leaseSeconds });
      if (error) throw new Error(`Supabase notification batch claim failed (${error.code ?? "unknown"}).`);
      return (Array.isArray(data) ? data : []).map((row) => fromClaimRow(row as Record<string, unknown>));
    },
    async markSent(id, leaseToken, providerMessageId, recipient) {
      const { data, error } = await client.rpc("complete_notification_sent", { p_id: id, p_lease_token: leaseToken, p_provider_message_id: providerMessageId, p_recipient: recipient });
      if (error) throw new Error(`Supabase notification completion failed (${error.code ?? "unknown"}).`);
      return Boolean(data);
    },
    async markFailed(id, leaseToken, errorMessage, recipient, maxAttempts) {
      const { data, error } = await client.rpc("complete_notification_failed", { p_id: id, p_lease_token: leaseToken, p_error: errorMessage, p_recipient: recipient, p_max_attempts: maxAttempts });
      if (error) throw new Error(`Supabase notification failure update failed (${error.code ?? "unknown"}).`);
      return typeof data === "string" ? data as NotificationStatus : null;
    },
  };
}

function createNotificationClient(url?: string, secretKey?: string) {
  if (!url?.trim() || !secretKey?.trim()) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for Supabase notification storage.");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function fromClaimRow(row: Record<string, unknown>): ClaimedNotification {
  return {
    id: String(row.id),
    submissionId: String(row.submission_id),
    kind: String(row.kind) as Submission["kind"],
    status: String(row.status) as NotificationStatus,
    attemptCount: Number(row.attempt_count),
    leaseToken: String(row.lease_token),
    submission: fromDatabaseSubmission(row.submission as Record<string, unknown>),
  };
}

function fromDatabaseSubmission(row: Record<string, unknown>): Submission {
  const base = {
    id: String(row.id), kind: String(row.kind), submittedAt: String(row.created_at), name: String(row.name), email: String(row.email), consent: Boolean(row.consent),
    source: optionalString(row.source), referrer: optionalString(row.referrer), utmSource: optionalString(row.utm_source), utmMedium: optionalString(row.utm_medium), utmCampaign: optionalString(row.utm_campaign), utmContent: optionalString(row.utm_content), utmTerm: optionalString(row.utm_term),
  };
  switch (base.kind) {
    case "owner-lead": return { ...base, kind: "owner-lead", phone: optionalString(row.phone), propertyAddress: optionalString(row.property_address), cityState: optionalString(row.city_state), propertyType: optionalString(row.property_type), bedrooms: optionalNumber(row.bedrooms), currentRentalStatus: optionalString(row.current_rental_status), listingUrl: optionalString(row.listing_url), notes: optionalString(row.notes) };
    case "membership": return { ...base, kind: "membership", zip: optionalString(row.zip), travelInterests: optionalString(row.travel_interests) };
    case "contact": return { ...base, kind: "contact", phone: optionalString(row.phone), inquiryType: String(row.inquiry_type) as "guest" | "owner" | "general" | "design", message: String(row.message ?? "") };
    case "design-inquiry": return { ...base, kind: "design-inquiry", phone: optionalString(row.phone), propertyAddress: optionalString(row.property_address), projectType: String(row.project_type ?? ""), message: String(row.message ?? "") };
    default: throw new Error("Notification references an unsupported submission kind.");
  }
}

function optionalString(value: unknown) { return typeof value === "string" && value.length > 0 ? value : undefined; }
function optionalNumber(value: unknown) { return typeof value === "number" ? value : undefined; }
