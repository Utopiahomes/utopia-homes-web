import type { Metadata } from "next";
import Image from "next/image";
import { FAQList } from "@/components/FAQList";
import { LeadForm } from "@/components/forms/LeadForm";
import { ImmersiveScrollStory } from "@/components/ImmersiveScrollStory";
import { PageHero } from "@/components/PageHero";
import { cms } from "@/lib/cms";

export const metadata: Metadata = {
  title: "List Your Home",
  description: "Utopia helps owners earn more from distinctive Wildwood vacation homes without turning ownership into another job.",
};

const collectionOrder = ["buttercup-beauty", "central-ave-socialization", "the-shamrock"];

export default async function ListYourHomePage() {
  const [faqs, properties] = await Promise.all([cms.getFAQs("owners"), cms.getProperties()]);
  const collection = collectionOrder.map((slug) => properties.find((property) => property.slug === slug)).filter((property) => property !== undefined);

  return <>
    <PageHero eyebrow="For Wildwood homeowners" title={<>Your home should earn more<br /><em>without becoming another job.</em></>} intro="Utopia combines local ownership, sophisticated vacation-rental management, distinctive marketing, and hands-on property stewardship—so your home performs without consuming your time." image={properties.find((property) => property.slug === "the-shamrock")?.heroImage} action={{ href: "#owner-conversation", label: "Talk to us about your home" }} />

    <section className="owner-proof">
      <p className="eyebrow">The owner’s perspective</p>
      <h2>We manage homes like yours<br /><em>because we own homes like yours.</em></h2>
      <div><p>Utopia was built by a Wildwood property owner with nearly 15 years of hosting experience and thousands of guest stays behind him. We understand the return you want—and the work you should not have to carry to earn it.</p><dl><div><dt>Nearly</dt><dd>15 years hosting</dd></div><div><dt>Thousands</dt><dd>of guest stays</dd></div><div><dt>Local</dt><dd>owner experience</dd></div></dl></div>
    </section>

    <section className="owner-collection" aria-labelledby="owner-collection-title">
      <div className="owner-collection-heading"><p className="eyebrow eyebrow-light">Homes we know firsthand</p><h2 id="owner-collection-title">Built at the Shore.<br />Proven in the stay.</h2></div>
      <div className="owner-property-strip">{collection.map((property, index) => <figure key={property.id} className={`owner-property owner-property-${index + 1}`}><Image src={property.heroImage.src} alt={property.heroImage.alt} fill sizes="(max-width: 800px) 100vw, 34vw" /><figcaption><span>0{index + 1}</span>{property.name}<small>{property.city}, {property.state}</small></figcaption></figure>)}</div>
    </section>

    <section className="owner-value" aria-labelledby="owner-model-title">
      <div className="owner-value-image"><Image src="/images/central-ave/29.webp" alt="Oversized living room at Central Ave Socialization prepared for a large group" fill sizes="(max-width: 900px) 100vw, 48vw" /></div>
      <div className="owner-value-copy"><p className="eyebrow">The Utopia model</p><h2 id="owner-model-title">Four outcomes.<br /><em>One accountable partner.</em></h2><ol><li><span>01</span><div><h3>Earn more</h3><p>Pricing, distribution, direct marketing, and positioning designed to create demand beyond the summer peak.</p></div></li><li><span>02</span><div><h3>Operate beautifully</h3><p>Guest communication, cleaning, maintenance, and issue resolution handled with an owner’s standards.</p></div></li><li><span>03</span><div><h3>Have someone local</h3><p>Property oversight, trusted contractors, escalation, and an owner relationship grounded in Wildwood.</p></div></li><li><span>04</span><div><h3>Make the property better</h3><p>Utopia Interiors brings furnishing, amenities, positioning, and photography together to help the home stand apart.</p></div></li></ol></div>
    </section>

    <ImmersiveScrollStory
      className="owner-difference-story"
      image={{ src: "/images/buttercup/29.webp", alt: "Generous living space at Buttercup Beauty" }}
      secondaryImage={{ src: "/images/shamrock/gallery/02.webp", alt: "The restored green facade of The Shamrock" }}
      label="How Utopia combines local stewardship and professional operating support"
      beats={[
        { eyebrow: "The difference", heading: "Local when it matters.", body: "You get a local Utopia relationship with people who understand Wildwood, your home, and the moments that require judgment—not a distant call center following a script." },
        { eyebrow: "Built to perform", heading: "Scaled where it helps.", body: "Professional operating infrastructure handles routine reservations, guest communication, and property operations efficiently. When owner-level attention is needed, Utopia is there." },
      ]}
    />

    <section className="owner-journey">
      <p className="eyebrow eyebrow-light">Start with what already exists</p><h2>Send the link.<br /><em>We’ll do the homework.</em></h2>
      <ol><li><span>01</span><div><h3>Tell us about your home</h3><p>Share the listing and your goals. We learn how the property is performing today without asking you to re-enter facts we can discover.</p></div></li><li><span>02</span><div><h3>We build the plan</h3><p>We evaluate positioning, revenue opportunity, operations, guest experience, and the improvements that could matter most.</p></div></li><li><span>03</span><div><h3>We take it from there</h3><p>Once we are aligned, Utopia coordinates the transition and gets your home ready to welcome guests.</p></div></li></ol>
    </section>

    <section className="form-section owner-form-section" id="owner-conversation"><LeadForm kind="owner-lead" title="Your listing tells us where to begin." submitLabel="Request a property review" /></section>
    {faqs.length > 0 && <section className="faq-section"><p className="eyebrow">Owner questions</p><h2>Good things to know.</h2><FAQList items={faqs} /></section>}
  </>;
}
