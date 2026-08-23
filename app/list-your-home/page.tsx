import type { Metadata } from "next";
import Image from "next/image";
import { FAQList } from "@/components/FAQList";
import { LeadForm } from "@/components/forms/LeadForm";
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
    <PageHero eyebrow="For Wildwood homeowners" title={<>Earn more.<br /><em>Own less work.</em></>} intro="Utopia helps owners earn more from distinctive vacation homes without turning ownership into another job." image={{ src: "/images/shamrock/exterior-main.avif", alt: "The colorful exterior of The Shamrock in Wildwood" }} />

    <section className="owner-proof">
      <p className="eyebrow">The owner’s perspective</p>
      <h2>We manage homes like yours<br /><em>because we own homes like yours.</em></h2>
      <div><p>Utopia was built by a Wildwood property owner with nearly 15 years of hosting experience and thousands of guest stays behind him. We understand the return you want—and the work you should not have to carry to earn it.</p><dl><div><dt>Nearly</dt><dd>15 years hosting</dd></div><div><dt>Thousands</dt><dd>of guest stays</dd></div><div><dt>Local</dt><dd>owner experience</dd></div></dl></div>
    </section>

    <section className="owner-collection" aria-labelledby="owner-collection-title">
      <div className="owner-collection-heading"><p className="eyebrow eyebrow-light">Homes we know firsthand</p><h2 id="owner-collection-title">Built at the Shore.<br />Proven in the stay.</h2></div>
      <div className="owner-property-strip">{collection.map((property, index) => <figure key={property.id} className={`owner-property owner-property-${index + 1}`}><Image src={property.heroImage.src} alt={property.heroImage.alt} fill sizes="(max-width: 800px) 100vw, 34vw" /><figcaption><span>0{index + 1}</span>{property.name}<small>{property.city}, {property.state}</small></figcaption></figure>)}</div>
    </section>

    <section className="owner-value">
      <div className="owner-value-image"><Image src="/images/north-wildwood-house/04.jpg" alt="Comfortable large-group living space at Central Ave Socialization" fill sizes="(max-width: 900px) 100vw, 48vw" /></div>
      <div className="owner-value-copy"><p className="eyebrow">The Utopia proposition</p><h2>A better-performing home.<br /><em>A lighter lift for you.</em></h2><ol><li><span>01</span><div><h3>Demand beyond summer</h3><p>Positioning and marketing designed to make the Wildwood season feel closer to six months than ten weeks.</p></div></li><li><span>02</span><div><h3>A home guests remember</h3><p>Distinctive presentation, thoughtful improvements, and a guest experience that gives people a reason to return.</p></div></li><li><span>03</span><div><h3>Ownership without another job</h3><p>Communication, cleaning, maintenance, and issue resolution handled with an owner’s standards.</p></div></li></ol></div>
    </section>

    <section className="owner-journey">
      <p className="eyebrow eyebrow-light">Start with what already exists</p><h2>Send the link.<br /><em>We’ll do the homework.</em></h2>
      <ol><li><span>01</span><div><h3>Share your listing</h3><p>Send your Airbnb or Vrbo URL. No need to re-enter details we can discover ourselves.</p></div></li><li><span>02</span><div><h3>Tell us what you want</h3><p>We will talk about your goals, how the home performs today, and what ownership currently asks of you.</p></div></li><li><span>03</span><div><h3>See the opportunity</h3><p>We will identify the clearest opportunities across positioning, demand, guest experience, and property improvements.</p></div></li></ol>
    </section>

    <section className="form-section owner-form-section"><LeadForm kind="owner-lead" title="Your listing tells us where to begin." submitLabel="Request a property review" /></section>
    {faqs.length > 0 && <section className="faq-section"><p className="eyebrow">Owner questions</p><h2>Good things to know.</h2><FAQList items={faqs} /></section>}
  </>;
}
