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
  | { name: "campaign_view" | "campaign_conversion"; properties: { campaignId: string; slug: string; partner: string } };

export function track(event: AnalyticsEvent) {
  if (process.env.NODE_ENV === "development") console.info("[analytics]", event);
  window.dispatchEvent(new CustomEvent("utopia:analytics", { detail: event }));
}
