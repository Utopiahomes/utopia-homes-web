"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

// The menu links: the site's own, then pages the owner added in Stoin's editor, in the order the
// owner set (apps/web/src/lib/menu.ts, 2026-11-27). Without them, the site's own five.
export type MenuLink = { id: string; href: string; label: string; hidden?: boolean };
const SITE_LINKS: MenuLink[] = [
  { id: "stays", href: "/stays", label: "Stays" },
  { id: "destinations", href: "/destinations/wildwood-new-jersey", label: "WW / Cape May" },
  { id: "owners", href: "/list-your-home", label: "Owners" },
  { id: "design", href: "/design", label: "Design" },
  { id: "about", href: "/about", label: "About" },
];

export function SiteHeader({ links = SITE_LINKS, edit = false, listMeta = "" }: { links?: MenuLink[]; edit?: boolean; listMeta?: string }) {
  // The editing copy marks the list for Stoin's editor, which shows a new order straight away.
  const listAttrs = edit ? { "data-stoin-list": "menu" } : {};
  const itemAttrs = (link: MenuLink) => (edit ? { "data-stoin-list-item": link.id, hidden: link.hidden || undefined } : {});
  let number = 0;
  return (
    <header className="site-header">
      <Link href="/" aria-label="Utopia Homes home">
        <Wordmark />
      </Link>
      <nav className="desktop-primary" aria-label="Primary navigation">
        {listMeta && <template data-stoin-list-meta={listMeta}></template>}
        <span className="menu-links" {...listAttrs}>
          {links.map((link) => <Link key={link.id} href={link.href} {...itemAttrs(link)}>{link.label}</Link>)}
        </span>
      </nav>
      <Suspense fallback={<HeaderCtaFallback />}>
        <HeaderCta />
      </Suspense>
      <details className="mobile-menu">
        <summary>
          <span>Menu</span>
          <i aria-hidden="true" />
        </summary>
        <div className="mobile-menu-panel">
          <nav aria-label="Mobile navigation">
            <span className="menu-links" {...listAttrs}>
              {links.map((link) => (
                <Link key={link.id} href={link.href} {...itemAttrs(link)}>
                  <span>{String(link.hidden ? 0 : ++number).padStart(2, "0")}</span>{link.label}
                </Link>
              ))}
            </span>
          </nav>
          <div className="mobile-secondary">
            <Link href="/contact">Contact</Link>
            <Link href="/membership">Membership</Link>
            <Link href="/faq">FAQ</Link>
          </div>
        </div>
      </details>
    </header>
  );
}

function HeaderCta() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const designPage = pathname.startsWith("/design");
  const audience =
    searchParams.get("audience") === "personal" ? "personal" : "rental";
  return (
    <Link
      className="header-cta"
      href={designPage ? `/design/quote?audience=${audience}` : "/stays"}
    >
      {designPage ? "Start My Design Profile" : "View stays"}{" "}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}

function HeaderCtaFallback() {
  return (
    <Link className="header-cta" href="/stays">
      View stays <span aria-hidden="true">↗</span>
    </Link>
  );
}
