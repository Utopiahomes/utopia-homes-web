import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Submission } from "@/types/content";
import type { SubmissionStore } from "./types";

type SupabaseStoreOptions = {
  url?: string;
  secretKey?: string;
  client?: SupabaseClient;
};

export function createSupabaseSubmissionStore(options: SupabaseStoreOptions): SubmissionStore {
  const client = options.client ?? createServerClient(options.url, options.secretKey);

  return {
    async create(submission) {
      const { data, error } = await client.from("submissions").insert(toDatabaseRow(submission)).select("id").single();
      if (error?.code === "23505" && submission.kind === "membership") return { id: submission.id, duplicate: true };
      if (error) throw new Error(`Supabase submission insert failed (${error.code ?? "unknown"}).`);
      return { id: String(data.id), duplicate: false };
    },
    async findMembershipByEmail(email) {
      const { data, error } = await client.from("submissions").select("id").eq("kind", "membership").eq("email", normalizeEmail(email)).maybeSingle();
      if (error) throw new Error(`Supabase membership lookup failed (${error.code ?? "unknown"}).`);
      return data ? { id: String(data.id) } : null;
    },
  };
}

function createServerClient(url?: string, secretKey?: string) {
  if (!url?.trim() || !secretKey?.trim()) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for Supabase submission storage.");
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toDatabaseRow(submission: Submission) {
  return {
    id: submission.id,
    kind: submission.kind,
    created_at: submission.submittedAt,
    status: "new",
    name: submission.name,
    email: normalizeEmail(submission.email),
    consent: submission.consent,
    phone: "phone" in submission ? submission.phone || null : null,
    property_address: "propertyAddress" in submission ? submission.propertyAddress || null : null,
    city_state: submission.kind === "owner-lead" ? submission.cityState || null : null,
    property_type: submission.kind === "owner-lead" ? submission.propertyType || null : null,
    bedrooms: submission.kind === "owner-lead" ? submission.bedrooms ?? null : null,
    current_rental_status: submission.kind === "owner-lead" ? submission.currentRentalStatus || null : null,
    listing_url: submission.kind === "owner-lead" ? submission.listingUrl || null : null,
    notes: submission.kind === "owner-lead" ? submission.notes || null : null,
    zip: submission.kind === "membership" ? submission.zip || null : null,
    travel_interests: submission.kind === "membership" ? submission.travelInterests || null : null,
    inquiry_type: submission.kind === "contact" ? submission.inquiryType : null,
    message: submission.kind === "contact" || submission.kind === "design-inquiry" ? submission.message : null,
    project_type: submission.kind === "design-inquiry" ? submission.projectType : null,
    source: submission.source || null,
    referrer: submission.referrer || null,
    utm_source: submission.utmSource || null,
    utm_medium: submission.utmMedium || null,
    utm_campaign: submission.utmCampaign || null,
    utm_content: submission.utmContent || null,
    utm_term: submission.utmTerm || null,
  };
}
