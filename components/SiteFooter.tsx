import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-lead"><p className="eyebrow eyebrow-light">Your next story starts here</p><p className="footer-display">Go somewhere.<br /><em>Feel at home.</em></p></div><div className="footer-brand"><p className="wordmark">Utopia<span>Homes</span></p><p>Distinctive stays.<br />Thoughtfully managed.</p></div><nav aria-label="Footer navigation"><Link href="/stays">Stays</Link><Link href="/destinations">Destinations</Link><Link href="/list-your-home">List Your Home</Link><Link href="/utopia-interiors">Utopia Interiors</Link><Link href="/membership">Membership</Link><Link href="/contact">Contact</Link></nav><p className="fine-print">© 2026 Utopia Homes · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · Private preview.</p></footer>;
}
