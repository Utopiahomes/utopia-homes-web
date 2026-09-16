import { z } from "zod";

export const previewGuestQuestionSchema = z
  .object({ question: z.string().trim().min(2).max(500) })
  .strict();

/**
 * LENIENT parsing of the provider's guest.answer@1.0 response, for consumer runtime use — per
 * contracts/stoin-business-guest-answer-v1-bundle's fixtures/provider/strict-vs-lenient-
 * parsing.json warning (mirrored from the Management Contract bundle): the provider's own
 * response.schema.json sets additionalProperties:false, which is correct for PROVIDER
 * conformance and WRONG for a consumer's live parser, since RC2 §19 requires additive optional
 * v1.1+ response members to be ignored. Zod ignores unknown keys by default (no `.strict()`
 * here), so this schema only asserts the required v1.0 members exist and are individually valid.
 */
export const previewGuestAnswerResponseSchema = z.object({
  contract_version: z.string(),
  response_id: z.string(),
  session_id: z.string(),
  assistant_turn_id: z.string(),
  outcome: z.enum(["answered", "partial", "clarification_needed", "out_of_scope", "refused"]),
  answer: z.string().min(1).max(4000),
  sources: z.array(
    z.object({ source_id: z.string(), title: z.string(), url: z.string() }),
  ),
  actions: z.array(
    z.object({ action_id: z.string(), kind: z.string(), label: z.string(), url: z.string() }),
  ),
  limitations: z.array(z.string()),
});

export type PreviewGuestAnswerResponse = z.infer<typeof previewGuestAnswerResponseSchema>;

export type PreviewLucyResponse = { ok: true; answer: string } | { ok: false; message: string };
