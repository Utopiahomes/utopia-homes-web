import { randomBytes } from "node:crypto";
import { acknowledgeQuoteSchema, quoteInputSchema } from "./schemas";
import {
  DESIGN_ESTIMATE_DISCLAIMER_VERSION,
  priceDesignProject,
} from "./pricing";
import {
  designQuoteStore,
  hashReopenToken,
  type DesignQuoteStore,
} from "./store";
import { submitForm } from "@/lib/forms/submit";
import { sendDesignQuoteEmailBestEffort } from "./email";
import type { AcknowledgedQuote, PreliminaryQuote } from "./types";

export async function generateDesignQuote(
  body: unknown,
  store: DesignQuoteStore = designQuoteStore,
) {
  const parsed = quoteInputSchema.safeParse(body);
  if (!parsed.success)
    return {
      ok: false as const,
      status: 400,
      message: "Please review the project information.",
      errors: parsed.error.flatten().fieldErrors,
    };
  const quote = priceDesignProject(parsed.data);
  const reopenToken = randomBytes(32).toString("base64url");
  try {
    await store.create(quote, hashReopenToken(reopenToken));
  } catch (error) {
    console.error("Design quote storage failed", safeError(error));
    return {
      ok: false as const,
      status: 503,
      message: "We couldn’t save your estimate right now. Please try again.",
    };
  }
  return {
    ok: true as const,
    status: 201,
    quote: customerSafeQuote(quote),
    reopenToken,
    disclaimerVersion: DESIGN_ESTIMATE_DISCLAIMER_VERSION,
  };
}

export async function acknowledgeDesignQuote(
  body: unknown,
  store: DesignQuoteStore = designQuoteStore,
) {
  const parsed = acknowledgeQuoteSchema.safeParse(body);
  if (!parsed.success)
    return {
      ok: false as const,
      status: 400,
      message: "Please confirm your contact information and acknowledgment.",
      errors: parsed.error.flatten().fieldErrors,
    };
  const acknowledgedAt = new Date().toISOString();
  const customer = {
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone || undefined,
  };
  let quote;
  try {
    quote = await store.acknowledge(
      parsed.data.quoteId,
      hashReopenToken(parsed.data.reopenToken),
      customer,
      acknowledgedAt,
      DESIGN_ESTIMATE_DISCLAIMER_VERSION,
      parsed.data.modelImprovementConsent,
    );
  } catch (error) {
    console.error("Design quote acknowledgment failed", safeError(error));
    return {
      ok: false as const,
      status: 503,
      message:
        "We couldn’t save your acknowledgment right now. Please try again.",
    };
  }
  if (!quote)
    return {
      ok: false as const,
      status: 404,
      message: "This estimate could not be found or was already acknowledged.",
    };

  const leadResult = await submitForm(
    "design-inquiry",
    {
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      propertyAddress: quote.inputSnapshot.property.address || "",
      projectType: quote.serviceId,
      message: `Acknowledged preliminary estimate ${quote.quoteNumber} for $${quote.total.toLocaleString("en-US")}.`,
      consent: true,
      website: "",
    },
    undefined,
    undefined,
    { sourceQuoteId: quote.id },
  );
  const customerEstimateEmail = await sendDesignQuoteEmailBestEffort(quote);
  return {
    ok: true as const,
    status: 200,
    quote: customerSafeQuote(quote),
    leadNotification: leadResult.ok
      ? ("queued" as const)
      : ("needs_review" as const),
    customerEstimateEmail,
    calendarEligible: quote.calendarEligible,
    calendarEligibilityReason: quote.calendarEligibilityReason,
    schedulerUrl:
      quote.calendarEligible && process.env.DESIGN_SCHEDULER_ENABLED === "true"
        ? process.env.DESIGN_SCHEDULER_URL?.trim() || null
        : null,
  };
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown storage error";
}
function customerSafeQuote(quote: PreliminaryQuote | AcknowledgedQuote) {
  const safe: Record<string, unknown> = { ...quote };
  delete safe.internalPricingReview;
  delete safe.reopenTokenHash;
  return safe as
    | Omit<PreliminaryQuote, "internalPricingReview">
    | Omit<AcknowledgedQuote, "internalPricingReview" | "reopenTokenHash">;
}
