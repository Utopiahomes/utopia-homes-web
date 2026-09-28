import type { MetadataRoute } from "next";
import { cms } from "@/lib/cms";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl().origin;
  const routes = ["", "/stays", "/destinations", "/list-your-home", "/design", "/membership", "/about", "/about/ray", "/about/meghan", "/contact", "/privacy", "/terms"];
  const [properties, destinations] = await Promise.all([cms.getProperties(), cms.getDestinations()]);
  return [
    ...routes.map((route) => ({ url: `${origin}${route}`, changeFrequency: "monthly" as const, priority: route === "" ? 1 : .7 })),
    ...properties.map((property) => ({ url: `${origin}/stays/${property.slug}`, changeFrequency: "weekly" as const, priority: .9 })),
    ...destinations.map((destination) => ({ url: `${origin}/destinations/${destination.slug}`, changeFrequency: "monthly" as const, priority: .8 })),
  ];
}
