// Stand-in for next/link (2026-11-25, Next.js -> Astro): the site's React parts keep their imports and
// render a plain link. Next-only props (prefetch, scroll, replace) are dropped.
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Href = string | { pathname?: string; query?: Record<string, string>; hash?: string };
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
  children?: ReactNode;
};

function toHref(href: Href): string {
  if (typeof href === "string") return href;
  const query = href.query ? `?${new URLSearchParams(href.query)}` : "";
  return `${href.pathname ?? ""}${query}${href.hash ? `#${href.hash}` : ""}`;
}

export default function Link({ href, prefetch: _prefetch, scroll: _scroll, replace: _replace, ...rest }: Props) {
  return <a href={toHref(href)} {...rest} />;
}
