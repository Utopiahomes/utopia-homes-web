import { z } from "zod";

export const imageSchema = z.object({ src: z.string().min(1), alt: z.string().min(1), category: z.enum(["arrival", "outdoors", "kitchen-dining", "gathering", "entertainment", "bedrooms", "bathrooms", "details"]).optional() });
const designerNoteSchema = z.object({ designer: z.string().min(1), role: z.string().min(1), headline: z.string().min(1), paragraphs: z.array(z.string().min(1)).min(1), status: z.enum(["approved", "pending"]) });
const propertyReviewSummarySchema = z.object({ rating: z.number().min(1).max(5), count: z.number().int().positive(), sourceLabel: z.string().min(1), sourceUrl: z.string().url(), lastVerifiedAt: z.string().min(1), editorialNote: z.string().min(1), highlights: z.array(z.string().min(1)).length(5) });
const httpsUrlSchema = z.string().url().refine((value) => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "External destinations must use HTTPS.");
const bookingDestinationSchema = z.object({ provider: z.enum(["uplisting", "airbnb", "vrbo", "other"]), url: httpsUrlSchema });
const bookingConfigurationSchema = z.object({
  mode: z.enum(["primary", "fallback"]),
  primary: bookingDestinationSchema.optional(),
  fallback: bookingDestinationSchema,
}).refine((value) => value.mode !== "primary" || value.primary !== undefined, {
  message: "Primary booking mode requires a configured primary destination.",
  path: ["primary"],
});
export const propertySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/), status: z.enum(["draft", "active", "hidden", "archived"]), featured: z.boolean(), destinationId: z.string().min(1), city: z.string().min(1), state: z.string(), propertyType: z.string().min(1), shortDescription: z.string().min(1), fullDescription: z.string().min(1), heroImage: imageSchema, gallery: z.array(imageSchema).min(1), maxGuests: z.number().int().positive().optional(), bedrooms: z.number().nonnegative().optional(), beds: z.number().nonnegative().optional(), bathrooms: z.number().nonnegative().optional(), amenities: z.array(z.object({ name: z.string().min(1), amenities: z.array(z.string().min(1)) })), uniqueFeatures: z.array(z.string().min(1)), designerNote: designerNoteSchema, reviewSummary: propertyReviewSummarySchema.optional(), petPolicy: z.string(), parking: z.string(), accessibility: z.string(), booking: bookingConfigurationSchema, profiles: z.object({ airbnb: z.object({ url: httpsUrlSchema }).optional(), vrbo: z.object({ url: httpsUrlSchema }).optional() }).optional(), sourceUrls: z.array(z.string().url()).min(1), sourceSnapshot: z.object({ listingTitle: z.string().min(1), locationLabel: z.string().min(1), displayedCapacity: z.string().min(1), statedSleeps: z.number().int().positive().optional(), disclosedAmenityCount: z.number().int().positive().optional(), factualSummary: z.string().min(1) }), sourceAudit: z.object({ lastCheckedAt: z.string().optional(), factStatus: z.enum(["verified", "partial", "pending"]), photographyRights: z.enum(["approved", "pending", "denied"]), reviewRights: z.enum(["approved", "pending", "denied"]), notes: z.array(z.string()) }), seoTitle: z.string().min(1), seoDescription: z.string().min(1),
});
export const destinationSchema = z.object({ id: z.string().min(1), name: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/), city: z.string().min(1), state: z.string(), shortDescription: z.string().min(1), longDescription: z.string().min(1), heroImage: imageSchema, featured: z.boolean(), seasonStory: z.object({ eyebrow: z.string().min(1), headline: z.string().min(1), description: z.string().min(1) }), highlights: z.array(z.object({ eyebrow: z.string().min(1), title: z.string().min(1), description: z.string().min(1), image: imageSchema })).min(1), seoTitle: z.string().min(1), seoDescription: z.string().min(1) });
export const reviewSchema = z.object({ id: z.string().min(1), propertyId: z.string().optional(), author: z.string().min(1), quote: z.string().min(1), rating: z.number().min(1).max(5).optional(), source: z.string().min(1), permissionStatus: z.enum(["approved", "pending", "denied"]) });
export const faqSchema = z.object({ id: z.string().min(1), category: z.enum(["stays", "owners", "membership", "design", "general"]), question: z.string().min(1), answer: z.string().min(1), sortOrder: z.number().int() });
const publicLucyFaqSchema = z.object({
  question: z.string().trim().min(2).max(500),
  answer: z.string().trim().min(1).max(8_000),
  source: z.string().url().refine((value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "Public Lucy sources must use HTTPS."),
}).strict();
export const publicLucyContentSchema = z.object({
  publicationStatus: z.enum(["candidate", "approved"]),
  intro: z.string().trim().min(1).max(500),
  suggestions: z.array(z.string().trim().min(2).max(500)).min(1).max(6),
  faqs: z.array(publicLucyFaqSchema).min(1),
}).strict().superRefine((value, context) => {
  const questions = new Set<string>();
  for (const faq of value.faqs) {
    const normalized = faq.question.trim().replace(/\s+/gu, " ").toLowerCase();
    if (questions.has(normalized)) {
      context.addIssue({ code: "custom", message: `Duplicate Public Lucy question: ${faq.question}`, path: ["faqs"] });
    }
    questions.add(normalized);
  }
  for (const suggestion of value.suggestions) {
    const normalized = suggestion.trim().replace(/\s+/gu, " ").toLowerCase();
    if (!questions.has(normalized)) {
      context.addIssue({ code: "custom", message: `Public Lucy suggestion has no FAQ answer: ${suggestion}`, path: ["suggestions"] });
    }
  }
});
export const campaignSchema = z.object({ id: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), partner: z.string().min(1), eyebrow: z.string().min(1), headline: z.string().min(1), description: z.string().min(1), heroImage: imageSchema, ctaLabel: z.string().min(1), ctaUrl: z.string().min(1), rulesUrl: z.string().url().optional(), active: z.boolean(), seoTitle: z.string().min(1), seoDescription: z.string().min(1) });
export function validateCollection<T>(schema: z.ZodType<T>, records: unknown[], label: string): T[] { const result = z.array(schema).safeParse(records); if (!result.success) throw new Error(`Invalid ${label} content: ${result.error.message}`); return result.data; }
