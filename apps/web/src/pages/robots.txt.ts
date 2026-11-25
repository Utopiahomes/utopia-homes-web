import type { APIRoute } from "astro";
import { robotsTxt } from "@/lib/robots-txt";
import { getSiteUrl } from "@/lib/site-url";

// Written at build time; VERCEL_ENV decides whether crawlers are invited (see lib/robots-txt.ts).
export const prerender = true;

export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt((site ?? getSiteUrl()).origin), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
