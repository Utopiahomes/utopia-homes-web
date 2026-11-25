import { siteContent } from "@/content";
import { getSiteUrl } from "@/lib/site-url";

export const siteConfig = {
  name: siteContent.name,
  description: siteContent.description,
  origin: import.meta.env.PUBLIC_SITE_URL ?? getSiteUrl().origin,
  environment: import.meta.env.PUBLIC_ENVIRONMENT ?? "local",
} as const;

export function canonicalUrl(pathname: string): URL {
  return new URL(pathname, siteConfig.origin);
}
