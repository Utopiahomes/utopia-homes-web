import Link from "next/link";

export function CTASection() {
  return <section className="cta-section" id="owners"><div className="cta-monogram" aria-hidden="true">U</div><div><p className="eyebrow eyebrow-light">For homeowners</p><h2>Own a home<br />with <em>something to say?</em></h2><p>We manage homes like yours because we own homes like yours.</p><Link className="button button-light-solid" href="/list-your-home">Meet the owner’s Utopia <span aria-hidden="true">→</span></Link></div></section>;
}
