import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AmenityGroups } from "@/components/AmenityGroups";
import { AnalyticsView } from "@/components/AnalyticsView";
import { BookingLink } from "@/components/BookingLink";
import { DesignerNote } from "@/components/DesignerNote";
import { PropertyFacts } from "@/components/PropertyFacts";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyPhotoStory } from "@/components/PropertyPhotoStory";
import { PropertyReviews } from "@/components/PropertyReviews";
import { cms } from "@/lib/cms";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await cms.getProperties()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await cms.getPropertyBySlug((await params).slug);
  if (!property) return { title: "Stay not found" };
  return { title: property.seoTitle.replace(" | Utopia Homes", ""), description: property.seoDescription, openGraph: { title: property.seoTitle, description: property.seoDescription, images: [property.heroImage.src] } };
}

export default async function PropertyPage({ params }: Props) {
  const slug = (await params).slug;
  const renamedSlugs: Record<string, string> = { "buttercup-house": "buttercup-beauty", "north-wildwood-house": "central-ave-socialization", "shamrock-house": "the-shamrock" };
  if (renamedSlugs[slug]) permanentRedirect(`/stays/${renamedSlugs[slug]}`);
  const property = await cms.getPropertyBySlug(slug);
  if (!property) notFound();
  return <article className="property-page">
    <AnalyticsView event={{ name: "property_view", properties: { propertyId: property.id, slug: property.slug, destination: property.destinationId } }} />
    <header className="property-hero">
      <div className="property-kicker"><p className="eyebrow">Utopia stay · {property.city}, {property.state}</p><span>{property.propertyType}</span></div>
      <div className="property-title-row"><div><h1>{property.name}</h1><p>{property.shortDescription}</p></div><BookingLink propertyId={property.id} slug={property.slug} bookingUrl={property.bookingUrl} location="property_hero" className="round-booking-link">Check<br />availability <span aria-hidden="true">↗</span></BookingLink></div>
    </header>
    <PropertyGallery images={property.gallery} />
    <section className="property-content">
      <div className="property-main">
        <p className="eyebrow">Come together</p><h2>Big energy.<br /><em>Room for everyone.</em></h2><p className="property-lede">{property.fullDescription}</p>
        <div className="special-section"><p className="eyebrow">Why you’ll love it</p><ul className="feature-list">{property.uniqueFeatures.map((feature, index) => <li key={feature}><span>{String(index + 1).padStart(2, "0")}</span>{feature}</li>)}</ul></div>
        <DesignerNote note={property.designerNote} />
        <div className="amenities-section"><p className="eyebrow">At the house</p><h2>Everything your<br />crew needs.</h2><AmenityGroups groups={property.amenities} /></div>
        <div className="stay-notes"><p className="eyebrow">Good to know</p><dl><div><dt>Pets</dt><dd>{property.petPolicy}</dd></div><div><dt>Parking</dt><dd>{property.parking}</dd></div><div><dt>Accessibility</dt><dd>{property.accessibility}</dd></div></dl></div>
      </div>
      <aside><div className="facts-label">The essentials</div><PropertyFacts property={property} /><div className="aside-cta"><p className="eyebrow">Plan your stay</p><h3>{property.city} is calling.</h3><p>Continue to the current external listing to review availability and complete details.</p><BookingLink propertyId={property.id} slug={property.slug} bookingUrl={property.bookingUrl} location="property_sidebar" className="button button-primary booking-wide">Check availability <span aria-hidden="true">↗</span></BookingLink></div></aside>
    </section>
    <PropertyReviews summary={property.reviewSummary} />
    <PropertyPhotoStory property={property} />
  </article>;
}
