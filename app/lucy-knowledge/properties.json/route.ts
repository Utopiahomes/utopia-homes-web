import { cms } from "@/lib/cms";
import { buildLucyKnowledgeFeed } from "@/lib/lucy/knowledge-feed";

// Built with the site, so the feed always matches the deployed property pages.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(buildLucyKnowledgeFeed(await cms.getProperties()));
}
