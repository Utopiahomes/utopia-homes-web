import { z } from "zod";

export const publicLucyPageContextSchema = z
  .object({
    route: z.enum([
      "home",
      "stays",
      "property",
      "destinations",
      "destination",
      "owners",
      "design",
      "membership",
      "about",
      "contact",
      "other_public",
    ]),
    property_slug: z
      .enum(["buttercup-beauty", "central-ave-socialization", "the-shamrock"])
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.route === "property") !== Boolean(value.property_slug)) {
      context.addIssue({
        code: "custom",
        message: "Property context requires exactly one approved property slug.",
        path: ["property_slug"],
      });
    }
  });

export const publicLucyHistoryTurnSchema = z
  .object({
    role: z.enum(["visitor", "lucy"]),
    content: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const publicLucyQuestionSchema = z
  .object({
    question: z.string().trim().min(2).max(500),
    page_context: publicLucyPageContextSchema.optional(),
    history: z.array(publicLucyHistoryTurnSchema).max(6).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const historyCharacters = value.history.reduce((total, turn) => total + turn.content.length, 0);
    if (historyCharacters > 4_000) {
      context.addIssue({
        code: "custom",
        message: "Conversation context is too large.",
        path: ["history"],
      });
    }
  });

const publicLucyReferenceSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    label: z.string().trim().min(1).max(160),
    href: z.string().trim().min(1).max(2_000),
  })
  .strict();

const legacyPublicLucyUpstreamAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(8_000),
    source: z.string().trim().min(1).max(2_000),
    version: z.number().int().positive(),
    snapshot_digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const conversationalPublicLucyUpstreamAnswerSchema = z
  .object({
    contract: z.literal("lucy.public-answer.v2"),
    outcome: z.enum(["answered", "partial", "fallback"]),
    answer: z.string().trim().min(1).max(8_000),
    clarification: z.string().trim().min(1).max(1_000).optional(),
    sources: z.array(publicLucyReferenceSchema).max(8),
    links: z.array(publicLucyReferenceSchema).max(8),
    version: z.number().int().positive(),
    snapshot_digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const publicLucyUpstreamAnswerSchema = z.union([
  conversationalPublicLucyUpstreamAnswerSchema,
  legacyPublicLucyUpstreamAnswerSchema,
]);

export type PublicLucyPageContext = z.infer<typeof publicLucyPageContextSchema>;
export type PublicLucyHistoryTurn = z.infer<typeof publicLucyHistoryTurnSchema>;
export type PublicLucyReference = z.infer<typeof publicLucyReferenceSchema>;

export type PublicLucyResponse =
  | {
      ok: true;
      outcome: "answered" | "partial" | "fallback";
      answer: string;
      clarification?: string;
      sources: PublicLucyReference[];
      links: PublicLucyReference[];
    }
  | { ok: false; message: string };
