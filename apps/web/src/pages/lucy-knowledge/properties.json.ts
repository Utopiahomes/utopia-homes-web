import type { APIRoute } from "astro";
import { cms } from "@/lib/cms";
import { buildLucyKnowledgeFeed } from "@/lib/lucy/knowledge-feed";

// Built with the site, so the feed always matches the deployed property pages.
export const prerender = true;

export const GET: APIRoute = async () => Response.json(buildLucyKnowledgeFeed(await cms.getProperties()));
