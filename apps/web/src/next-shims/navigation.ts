// Stand-in for next/navigation (2026-11-25, Next.js -> Astro). In the browser these read the address
// bar; while Astro renders a page they give the path set by setServerPathname (BaseLayout), so the
// first render matches. notFound and the redirects aren't used by the React parts any more: pages
// that need them are Astro pages, and permanent redirects live in vercel.json.
let serverPathname = "/";
export function setServerPathname(pathname: string): void {
  serverPathname = pathname;
}

const inBrowser = typeof window !== "undefined";

export function usePathname(): string {
  return inBrowser ? window.location.pathname : serverPathname;
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(inBrowser ? window.location.search : "");
}

export function useRouter() {
  return {
    push: (url: string) => window.location.assign(url),
    replace: (url: string) => window.location.replace(url),
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
