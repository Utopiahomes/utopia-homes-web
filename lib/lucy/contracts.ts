import { z } from "zod";

export const publicLucyQuestionSchema = z
  .object({
    question: z.string().trim().min(2).max(500),
  })
  .strict();

export const publicLucyUpstreamAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(8_000),
    source: z.string().trim().min(1).max(2_000),
    version: z.number().int().positive(),
    snapshot_digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type PublicLucyResponse =
  | { ok: true; answer: string }
  | { ok: false; message: string };
