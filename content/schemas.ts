import { z } from "zod";

export const imageSchema = z.object({ src: z.string().min(1), alt: z.string().min(1), category: z.enum(["arrival", "outdoors", "kitchen-dining", "gathering", "entertainment", "bedrooms", "bathrooms", "details"]).optional() });
const designerNoteSchema = z.object({ designer: z.string().min(1), role: z.string().min(1), headline: z.string().min(1), paragraphs: z.array(z.string().min(1)).min(1), status: z.enum(["approved", "pending"]) });
const propertyReviewSummarySchema = z.object({ rating: z.number().min(1).max(5), count: z.number().int().positive(), sourceLabel: z.string().min(1), sourceUrl: z.string().url(), lastVerifiedAt: z.string().min(1), editorialNote: z.string().min(1), highlights: z.array(z.string().min(1)).length(5) });
export const propertySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/), status: z.enum(["draft", "active", "hidden", "archived"]), featured: z.boolean(), destinationId: z.string().min(1), city: z.string().min(1), state: z.string(), propertyType: z.string().min(1), shortDescription: z.string().min(1), fullDescription: z.string().min(1), heroImage: imageSchema, gallery: z.array(imageSchema).min(1), maxGuests: z.number().int().positive().optional(), bedrooms: z.number().nonnegative().optional(), beds: z.number().nonnegative().optional(), bathrooms: z.number().nonnegative().optional(), amenities: z.array(z.object({ name: z.string().min(1), amenities: z.array(z.string().min(1)) })), uniqueFeatures: z.array(z.string().min(1)), designerNote: designerNoteSchema, reviewSummary: propertyReviewSummarySchema.optional(), petPolicy: z.string(), parking: z.string(), accessibility: z.string(), bookingUrl: z.string().url(), sourceUrls: z.array(z.string().url()).min(1), sourceSnapshot: z.object({ listingTitle: z.string().min(1), locationLabel: z.string().min(1), displayedCapacity: z.string().min(1), statedSleeps: z.number().int().positive().optional(), disclosedAmenityCount: z.number().int().positive().optional(), factualSummary: z.string().min(1) }), sourceAudit: z.object({ lastCheckedAt: z.string().optional(), factStatus: z.enum(["verified", "partial", "pending"]), photographyRights: z.enum(["approved", "pending", "denied"]), reviewRights: z.enum(["approved", "pending", "denied"]), notes: z.array(z.string()) }), seoTitle: z.string().min(1), seoDescription: z.string().min(1),
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

const publicLucyReferenceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
  label: z.string().trim().min(1).max(160),
  href: z.string().url().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "www.utopiahomes.com";
    } catch {
      return false;
    }
  }, "Public Lucy references must use the approved Utopia hostname."),
}).strict();

const publicLucyPropertyFactsSchema = z.object({
  max_guests: z.number().int().positive().max(100),
  parking_spaces: z.number().int().nonnegative().max(50),
  has_pool: z.boolean(),
  has_hot_tub: z.boolean(),
  bedrooms: z.number().nonnegative().max(100),
  bathrooms: z.number().nonnegative().max(100),
  pets_allowed: z.boolean(),
}).strict();

const publicLucyRouteSchema = z.enum(["home", "stays", "property", "destinations", "destination", "owners", "design", "membership", "about", "contact", "other_public"]);
const publicLucyPropertySlugSchema = z.enum(["buttercup-beauty", "central-ave-socialization", "the-shamrock"]);

const publicLucyKnowledgeEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
  service_line: z.enum(["homes", "design", "general"]),
  kind: z.enum(["fact", "description", "policy", "navigation", "call_to_action"]),
  title: z.string().trim().min(1).max(200),
  approved_text: z.string().trim().min(1).max(2_000),
  aliases: z.array(z.string().trim().min(1)).max(24),
  topics: z.array(z.string().trim().min(1)).min(1).max(24),
  route: publicLucyRouteSchema,
  property_slug: publicLucyPropertySlugSchema.optional(),
  property_facts: publicLucyPropertyFactsSchema.optional(),
  source: publicLucyReferenceSchema,
  links: z.array(publicLucyReferenceSchema).max(8),
  effective_from: z.iso.datetime({ offset: true }),
  effective_until: z.iso.datetime({ offset: true }).optional(),
  direct_answer: z.boolean(),
}).strict().superRefine((value, context) => {
  const isProperty = value.route === "property";
  if (isProperty !== Boolean(value.property_slug)) {
    context.addIssue({ code: "custom", message: "Property knowledge requires exactly one approved property slug.", path: ["property_slug"] });
  }
  if (Boolean(value.property_facts) !== isProperty) {
    context.addIssue({ code: "custom", message: "Structured property facts belong on property knowledge only and are required there.", path: ["property_facts"] });
  }
  if (value.effective_until && new Date(value.effective_until) <= new Date(value.effective_from)) {
    context.addIssue({ code: "custom", message: "Knowledge expiration must follow its effective time.", path: ["effective_until"] });
  }
});

export const publicLucyKnowledgeSnapshotSchema = z.object({
  schema: z.literal("lucy-public-knowledge-v1"),
  entries: z.array(publicLucyKnowledgeEntrySchema).min(1).max(500),
}).strict().superRefine((value, context) => {
  const ids = new Set<string>();
  for (const [index, entry] of value.entries.entries()) {
    if (ids.has(entry.id)) context.addIssue({ code: "custom", message: `Duplicate Public Lucy knowledge id: ${entry.id}`, path: ["entries", index, "id"] });
    ids.add(entry.id);
  }
});
export const campaignSchema = z.object({ id: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), partner: z.string().min(1), eyebrow: z.string().min(1), headline: z.string().min(1), description: z.string().min(1), heroImage: imageSchema, ctaLabel: z.string().min(1), ctaUrl: z.string().min(1), rulesUrl: z.string().url().optional(), active: z.boolean(), seoTitle: z.string().min(1), seoDescription: z.string().min(1) });
export function validateCollection<T>(schema: z.ZodType<T>, records: unknown[], label: string): T[] { const result = z.array(schema).safeParse(records); if (!result.success) throw new Error(`Invalid ${label} content: ${result.error.message}`); return result.data; }
