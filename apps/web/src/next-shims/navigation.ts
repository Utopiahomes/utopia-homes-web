// Stand-in for next/navigation (2026-11-25, Next.js -> Astro). While Astro renders a page, these give
// the path set by setServerPathname (BaseLayout) and no search parameters, so the first browser render
// matches the HTML; after the page starts, the hooks re-render with the real address bar. The router
// changes only the query with history.replaceState/pushState (no reload), as Next's did; a new path
// loads that page. notFound and the redirects aren't used by the React parts: those pages are Astro
// pages, and permanent redirects live in vercel.json.
import { useEffect, useState } from "react";

let serverPathname = "/";
export function setServerPathname(pathname: string): void {
  serverPathname = pathname;
}

const inBrowser = typeof window !== "undefined";
const listeners = new Set<() => void>();
const announce = () => listeners.forEach((listener) => listener());
if (inBrowser) window.addEventListener("popstate", announce);

function useAddress<T>(read: () => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const update = () => setValue(read());
    update();
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);
  return value;
}

export function usePathname(): string {
  return useAddress(() => window.location.pathname, inBrowser ? window.location.pathname : serverPathname);
}

export function useSearchParams(): URLSearchParams {
  return useAddress(() => new URLSearchParams(window.location.search), new URLSearchParams());
}

function go(url: string, replace: boolean): void {
  const next = new URL(url, window.location.href);
  if (next.pathname !== window.location.pathname || next.origin !== window.location.origin) {
    if (replace) window.location.replace(next.href);
    else window.location.assign(next.href);
    return;
  }
  if (replace) window.history.replaceState(window.history.state, "", next.href);
  else window.history.pushState(window.history.state, "", next.href);
  announce();
}

export function useRouter() {
  return {
    push: (url: string) => go(url, false),
    replace: (url: string) => go(url, true),
    refresh: () => window.location.reload(),
    back: () => window.history.back(),
    prefetch: () => undefined,
  };
}

export function notFound(): never {
  throw new Error("notFound() is not available outside Next.js; use an Astro page.");
}

export function permanentRedirect(url: string): never {
  throw new Error(`permanentRedirect(${url}) is not available outside Next.js; add it to vercel.json.`);
}
