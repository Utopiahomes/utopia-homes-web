// Google Search Console and Bing Webmaster Tools. Ray, 2026-11-27: "Set up Google Search Console and
// Bing Webmaster next to be automatic when we add a new site." Stoin asks both engines for this site's
// verification codes when it registers the site; the build asks Stoin's API for them and puts the two
// meta tags in every page's head, and Stoin verifies the site and submits its sitemap once they are
// live. Asked once per build. No answer (local build, a preview, API down): no tags, page otherwise
// the same.

const api = import.meta.env.PUBLIC_STOIN_API_URL ?? "https://utopia-studio-api.onrender.com";

export type Verification = { google?: string; bing?: string };

let asked: Promise<Verification | null> | undefined;

function siteHost(origin: string): string | null {
  const host = new URL(origin).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return host;
  return process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null;
}

async function lookup(origin: string): Promise<Verification | null> {
  const host = siteHost(origin);
  if (!host || host.endsWith(".vercel.app")) return null;
  try {
    const response = await fetch(`${api}/api/studio/site-verification?site=${encodeURIComponent(host)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as Verification;
  } catch (error) {
    console.warn(`[search-verification] Stoin's API didn't answer for ${host}: ${String(error)}`);
    return null;
  }
}

export function verificationFor(origin: string): Promise<Verification | null> {
  asked ??= lookup(origin);
  return asked;
}
