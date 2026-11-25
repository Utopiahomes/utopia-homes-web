import type { APIRoute } from "astro";
import { cms } from "@/lib/cms";
import { buildLlmsTxt } from "@/lib/llms-txt";
import { getSiteUrl } from "@/lib/site-url";

// /llms.txt, written at build time from the same records as the pages.
export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const [profile, properties, guides] = await Promise.all([cms.getBusinessProfile(), cms.getProperties(), cms.getStayGuides()]);
  return new Response(buildLlmsTxt({ profile, properties, guides, origin: (site ?? getSiteUrl()).origin }), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
