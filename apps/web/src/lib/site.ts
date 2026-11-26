import { siteContent } from "@/content";
import { getSiteUrl } from "@/lib/site-url";

export const siteConfig = {
  name: siteContent.name,
  description: siteContent.description,
  origin: import.meta.env.PUBLIC_SITE_URL ?? getSiteUrl().origin,
  environment: import.meta.env.PUBLIC_ENVIRONMENT ?? "local",
  // Stoin's shared site analytics (Umami, self-hosted by Stoin; pilot from 2026-11-26, Ray: Plausible
  // billing per site doesn't scale to every site we build). Not secret: it names the site to count.
  analyticsSite: "c52943fa-c909-40bf-8f9a-0f892f7b4223",
} as const;

export function canonicalUrl(pathname: string): URL {
  return new URL(pathname, siteConfig.origin);
}
