import type { PublicLucyPageContext } from "@/lib/lucy/contracts";

const PROPERTY_SLUGS: ReadonlySet<string> = new Set([
  "buttercup-beauty",
  "central-ave-socialization",
  "the-shamrock",
] as const);

export function resolvePublicLucyPageContext(pathname: string): PublicLucyPageContext {
  const path = pathname.split(/[?#]/u, 1)[0]?.replace(/\/+$/u, "") || "/";
  if (path === "/") return { route: "home" };
  if (path === "/stays") return { route: "stays" };
  if (path.startsWith("/stays/")) {
    const slug = path.slice("/stays/".length);
    if (PROPERTY_SLUGS.has(slug)) {
      return {
        route: "property",
        property_slug: slug as "buttercup-beauty" | "central-ave-socialization" | "the-shamrock",
      };
    }
    return { route: "other_public" };
  }
  if (path === "/destinations") return { route: "destinations" };
  if (path.startsWith("/destinations/")) return { route: "destination" };
  if (path === "/list-your-home") return { route: "owners" };
  if (path === "/design" || path.startsWith("/design/")) return { route: "design" };
  if (path === "/membership") return { route: "membership" };
  if (path === "/about") return { route: "about" };
  if (path === "/contact") return { route: "contact" };
  return { route: "other_public" };
}
