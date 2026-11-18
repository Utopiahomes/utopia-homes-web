import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { cms } from "@/lib/cms";

export async function SiteFooter() {
  const guides = (await cms.getStayGuides()).filter((guide) => guide.inFooter);
  return <footer className="site-footer"><div className="footer-lead"><p className="eyebrow eyebrow-light">Your next story starts here</p><p className="footer-display">Go somewhere.<br /><em>Feel at home.</em></p></div><div className="footer-brand"><Wordmark className="wordmark-footer" /><p>Distinctive stays.<br />Thoughtfully managed.</p></div><div className="footer-links"><nav aria-label="Footer navigation"><Link href="/stays">Stays</Link><Link href="/destinations/wildwood-new-jersey">WW / Cape May</Link><Link href="/list-your-home">List Your Home</Link><Link href="/design">Utopia Design</Link><Link href="/membership">Membership</Link><Link href="/contact">Contact</Link></nav><nav aria-label="Trip guides">{guides.map((guide) => <Link href={`/stays/${guide.slug}`} key={guide.slug}>{guide.navLabel}</Link>)}<Link href="/faq">FAQ</Link></nav></div><p className="fine-print">© 2026 Utopia Homes · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p></footer>;
}
