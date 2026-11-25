import { cms } from "./cms/index.js";

// /sitemap.xml, built with the site (apps/web/src/pages/sitemap.xml.ts). The same URLs as the
// Next.js app/sitemap.ts it replaces; Search Console was given /sitemap.xml.

export interface SitemapEntry {
  url: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}

const ROUTES = ["", "/stays", "/destinations", "/list-your-home", "/design", "/membership", "/about", "/about/ray", "/about/meghan", "/contact", "/faq", "/privacy", "/terms"];

export async function sitemapEntries(origin: string): Promise<SitemapEntry[]> {
  const [properties, destinations, guides] = await Promise.all([cms.getProperties(), cms.getDestinations(), cms.getStayGuides()]);
  return [
    ...ROUTES.map((route) => ({ url: `${origin}${route}`, changeFrequency: "monthly" as const, priority: route === "" ? 1 : 0.7 })),
    ...properties.map((property) => ({ url: `${origin}/stays/${property.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...guides.map((guide) => ({ url: `${origin}/stays/${guide.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...destinations.map((destination) => ({ url: `${origin}/destinations/${destination.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => `<url>\n<loc>${escapeXml(entry.url)}</loc>\n<changefreq>${entry.changeFrequency}</changefreq>\n<priority>${entry.priority}</priority>\n</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
