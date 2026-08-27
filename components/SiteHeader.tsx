"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" aria-label="Utopia Homes home">
        <Wordmark />
      </Link>
      <nav className="desktop-primary" aria-label="Primary navigation">
        <Link href="/stays">Stays</Link>
        <Link href="/destinations/wildwood-new-jersey">WW / Cape May</Link>
        <Link href="/list-your-home">Owners</Link>
        <Link href="/design">Design</Link>
        <Link href="/about">About</Link>
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
            <Link href="/stays">
              <span>01</span>Stays
            </Link>
            <Link href="/destinations/wildwood-new-jersey">
              <span>02</span>WW / Cape May
            </Link>
            <Link href="/list-your-home">
              <span>03</span>Owners
            </Link>
            <Link href="/design">
              <span>04</span>Design
            </Link>
            <Link href="/about">
              <span>05</span>About
            </Link>
          </nav>
          <div className="mobile-secondary">
            <Link href="/contact">Contact</Link>
            <Link href="/membership">Membership</Link>
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
