import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteHeader() {
  return <header className="site-header"><Link href="/" aria-label="Utopia Homes home"><Wordmark /></Link><nav aria-label="Primary navigation"><Link href="/stays">Stays</Link><Link href="/list-your-home">List Your Home</Link><Link href="/utopia-interiors">Utopia Interiors</Link><Link href="/membership">Membership</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link></nav><Link className="header-cta" href="/contact">Get in touch <span aria-hidden="true">↗</span></Link></header>;
}
