export type AnalyticsEvent =
  | { name: "page_view"; properties: { route: string; referrer?: string } }
  | {
      name: "outbound_booking_click";
      properties: {
        propertyId: string;
        slug: string;
        bookingHost: string;
        ctaLocation: string;
      };
    }
  | { name: "property_view"; properties: { propertyId: string; slug: string; destination: string } }
  | { name: "owner_lead_submit" | "membership_signup" | "contact_submit" | "design_service_interest"; properties: { source?: string; utmCampaign?: string } }
  | { name: "design_audience_selected"; properties: { audience: "rental" | "personal" } }
  | { name: "design_goal_selected" | "quote_studio_started" | "quote_generated" | "quote_acknowledged"; properties: { audience: "rental" | "personal"; serviceId: string; quoteId?: string } }
  | { name: "quote_step_completed"; properties: { audience: "rental" | "personal"; serviceId: string; quoteStep: number } }
  | { name: "campaign_view" | "campaign_conversion"; properties: { campaignId: string; slug: string; partner: string } }
  | { name: "lucy_open" | "lucy_question_submit" | "lucy_answer_received" | "lucy_partial_answer" | "lucy_fallback" | "lucy_unavailable"; properties: { entryPoint: "global_widget" } };

export function track(event: AnalyticsEvent) {
  if (process.env.NODE_ENV === "development") console.info("[analytics]", event);
  window.dispatchEvent(new CustomEvent("utopia:analytics", { detail: event }));
}
