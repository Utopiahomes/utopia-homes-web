import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteHeader() {
  return <header className="site-header">
    <Link href="/" aria-label="Utopia Homes home"><Wordmark /></Link>
    <nav className="desktop-primary" aria-label="Primary navigation"><Link href="/stays">Stays</Link><Link href="/list-your-home">Owners</Link><Link href="/utopia-interiors">Interiors</Link><Link href="/about">About</Link></nav>
    <Link className="header-cta" href="/stays">View stays <span aria-hidden="true">↗</span></Link>
    <details className="mobile-menu">
      <summary><span>Menu</span><i aria-hidden="true" /></summary>
      <div className="mobile-menu-panel">
        <nav aria-label="Mobile navigation"><Link href="/stays"><span>01</span>Stays</Link><Link href="/list-your-home"><span>02</span>Owners</Link><Link href="/utopia-interiors"><span>03</span>Interiors</Link><Link href="/about"><span>04</span>About</Link></nav>
        <div className="mobile-secondary"><Link href="/contact">Contact</Link><Link href="/membership">Membership</Link></div>
      </div>
    </details>
  </header>;
}
