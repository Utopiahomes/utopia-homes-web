import Link from "next/link";

export function CTASection() {
  return <section className="cta-section" id="owners"><div className="cta-monogram" aria-hidden="true">U</div><div><p className="eyebrow eyebrow-light">For homeowners</p><h2>A remarkable home<br />deserves <em>remarkable care.</em></h2><p>Utopia pairs attentive local relationships with professional distribution, guest operations, and revenue strategy.</p><Link className="button button-light-solid" href="mailto:hello@utopiahomes.com?subject=Rental%20assessment">Discover the Utopia approach <span aria-hidden="true">→</span></Link></div></section>;
}
