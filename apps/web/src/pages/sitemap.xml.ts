import type { APIRoute } from "astro";
import { sitemapEntries, sitemapXml } from "@/lib/sitemap";
import { getSiteUrl } from "@/lib/site-url";

// /sitemap.xml, written at build time with the same URLs the Next.js sitemap listed.
export const prerender = true;

export const GET: APIRoute = async ({ site }) =>
  new Response(sitemapXml(await sitemapEntries((site ?? getSiteUrl()).origin)), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
