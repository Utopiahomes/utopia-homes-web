import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AmenityGroups } from "@/components/AmenityGroups";
import { AnalyticsView } from "@/components/AnalyticsView";
import { BookingLink } from "@/components/BookingLink";
import { DesignerNote } from "@/components/DesignerNote";
import { DirectBookingCard } from "@/components/DirectBookingCard";
import { PropertyFacts } from "@/components/PropertyFacts";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyPhotoStory } from "@/components/PropertyPhotoStory";
import { PropertyReviews } from "@/components/PropertyReviews";
import { StayGuideLinks } from "@/components/StayGuideLinks";
import { cms } from "@/lib/cms";
import { wording } from "@/lib/edit/wording";
import { pageMetadata } from "@/lib/page-metadata";
import { getSiteUrl } from "@/lib/site-url";
import { jsonLdText, stayStructuredData } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await cms.getProperties()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await cms.getPropertyBySlug((await params).slug);
  if (!property) return { title: "Stay not found" };
  return pageMetadata({ title: property.seoTitle.replace(" | Utopia Homes", ""), description: property.seoDescription, path: `/stays/${property.slug}`, image: property.heroImage });
}

export default async function PropertyPage({ params }: Props) {
  const slug = (await params).slug;
  const renamedSlugs: Record<string, string> = { "buttercup-house": "buttercup-beauty", "north-wildwood-house": "central-ave-socialization", "shamrock-house": "the-shamrock" };
  if (renamedSlugs[slug]) permanentRedirect(`/stays/${renamedSlugs[slug]}`);
  const property = await cms.getPropertyBySlug(slug);
  if (!property) notFound();
  // Only the guides this home belongs to, so The Shamrock is never linked as a pool home.
  const guides = (await cms.getStayGuides()).filter((guide) => guide.propertySlugs.includes(property.slug));
  const words = wording.housePage;
  return <article className="property-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(stayStructuredData(property, getSiteUrl().origin)) }} />
    <AnalyticsView event={{ name: "property_view", properties: { propertyId: property.id, slug: property.slug, destination: property.destinationId } }} />
    <header className="property-hero">
      <div className="property-kicker"><p className="eyebrow">Utopia stay · {property.city}, {property.state}</p><span>{property.propertyType}</span></div>
      <div className="property-title-row"><div><h1>{property.name}</h1><p>{property.shortDescription}</p></div>{property.lodgify
        // Ray, 2026-11-11: with a direct-booking box, the top button goes to it, not to Airbnb.
        ? <a href="#book" className="round-booking-link">Check<br />availability <span aria-hidden="true">↓</span></a>
        : <BookingLink propertyId={property.id} slug={property.slug} bookingUrl={property.bookingUrl} location="property_hero" className="round-booking-link">Check<br />availability <span aria-hidden="true">↗</span></BookingLink>}</div>
    </header>
    <PropertyGallery images={property.gallery} />
    <section className="property-content">
      <div className="property-main">
        <p className="eyebrow">{words.story.eyebrow}</p><h2>{words.story.titleLine1}<br /><em>{words.story.titleLine2}</em></h2><p className="property-lede">{property.fullDescription}</p>
        <div className="special-section"><p className="eyebrow">{words.features.eyebrow}</p><ul className="feature-list">{property.uniqueFeatures.map((feature, index) => <li key={feature}><span>{String(index + 1).padStart(2, "0")}</span>{feature}</li>)}</ul></div>
        <DesignerNote note={property.designerNote} />
        <div className="amenities-section"><p className="eyebrow">{words.amenities.eyebrow}</p><h2>{words.amenities.titleLine1}<br />{words.amenities.titleLine2}</h2><AmenityGroups groups={property.amenities} /></div>
        <div className="stay-notes"><p className="eyebrow">{words.notes.eyebrow}</p><dl><div><dt>Pets</dt><dd>{property.petPolicy}</dd></div><div><dt>Parking</dt><dd>{property.parking}</dd></div><div><dt>Accessibility</dt><dd>{property.accessibility}</dd></div></dl></div>
      </div>
      <aside><div className="facts-label">The essentials</div><PropertyFacts property={property} />{property.lodgify
        ? <><span id="book" className="book-anchor" aria-hidden="true" /><div className="aside-cta book-direct"><p className="eyebrow">{words.book.eyebrow}</p><h3>{property.city} is calling.</h3><p>{words.book.text}</p><DirectBookingCard slug={property.slug} rentalId={property.lodgify.rentalId} accountSlug={property.lodgify.accountSlug} /><p className="book-direct-or">Prefer Airbnb?</p><BookingLink propertyId={property.id} slug={property.slug} bookingUrl={property.bookingUrl} location="property_sidebar" className="button booking-wide">Book on Airbnb <span aria-hidden="true">↗</span></BookingLink></div></>
        : <div className="aside-cta"><p className="eyebrow">Plan your stay</p><h3>{property.city} is calling.</h3><p>Continue to check current availability and review complete booking details.</p><BookingLink propertyId={property.id} slug={property.slug} bookingUrl={property.bookingUrl} location="property_sidebar" className="button button-primary booking-wide">Check availability <span aria-hidden="true">↗</span></BookingLink></div>}</aside>
    </section>
    <PropertyReviews summary={property.reviewSummary} />
    <PropertyPhotoStory property={property} />
    <StayGuideLinks guides={guides} heading="Compare this home for your trip." />
  </article>;
}
