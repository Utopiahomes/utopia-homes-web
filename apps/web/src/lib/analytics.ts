// Stoin's shared site analytics (Umami at analytics.stoin.ai). Ray, 2026-11-27: "Automate adding new
// sites to analytics". Stoin adds each site to analytics when it registers the site, and the build
// asks Stoin's API for this site's id, so a site made from this starter counts visits with nothing to
// fill in. Asked once per build. No answer (local build, API down, a site not registered yet): no
// tracker on that build, and the page is otherwise the same.

const api = import.meta.env.PUBLIC_API_BASE_URL ?? "https://utopia-studio-api.onrender.com";

export type Analytics = { id: string; domains: string };

let asked: Promise<Analytics | null> | undefined;

function siteHost(origin: string): string | null {
  const host = new URL(origin).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return host;
  // Vercel names the production address at build even when PUBLIC_SITE_URL isn't set.
  return process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null;
}

async function lookup(origin: string): Promise<Analytics | null> {
  const host = siteHost(origin);
  if (!host) return null;
  try {
    const response = await fetch(`${api}/api/studio/site-analytics?site=${encodeURIComponent(host)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn(`[analytics] no analytics id for ${host} (${response.status})`);
      return null;
    }
    const found = (await response.json()) as Analytics;
    return found.id ? found : null;
  } catch (error) {
    console.warn(`[analytics] Stoin's API didn't answer for ${host}: ${String(error)}`);
    return null;
  }
}

export function analyticsFor(origin: string): Promise<Analytics | null> {
  asked ??= lookup(origin);
  return asked;
}
