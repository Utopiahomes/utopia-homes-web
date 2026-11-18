import { cms } from "@/lib/cms";
import { buildLlmsTxt } from "@/lib/llms-txt";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";

export async function GET() {
  const [profile, properties, guides] = await Promise.all([cms.getBusinessProfile(), cms.getProperties(), cms.getStayGuides()]);
  return new Response(buildLlmsTxt({ profile, properties, guides, origin: getSiteUrl().origin }), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
