import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ImmersiveScrollStory } from "@/components/ImmersiveScrollStory";
import { PageHero } from "@/components/PageHero";
import { PropertyCard } from "@/components/PropertyCard";
import { cms } from "@/lib/cms";
type Props = { params: Promise<{ slug: string }> };
export async function generateStaticParams() { return (await cms.getDestinations()).map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const destination = await cms.getDestinationBySlug((await params).slug); return destination ? { title: destination.seoTitle.replace(" | Utopia Homes", ""), description: destination.seoDescription } : { title: "Destination not found" }; }
export default async function DestinationPage({ params }: Props) {
  const destination = await cms.getDestinationBySlug((await params).slug);
  if (!destination) notFound();
  const properties = (await cms.getProperties()).filter((property) => property.destinationId === destination.id);
  return <>
    <PageHero eyebrow={`${destination.city}, ${destination.state}`} title={<>Wildwood energy.<br /><em>Cape May rhythm.</em></>} intro={destination.longDescription} image={destination.heroImage} />
    <section className="region-intro"><p className="eyebrow">WW / Cape May</p><h2>Two Shore personalities.<br /><em>One coast we love.</em></h2><p>{destination.shortDescription}</p></section>
    <section className="region-highlights" aria-label="What we love about Wildwood and Cape May">{destination.highlights.map((highlight, index) => <article className={`region-highlight region-highlight-${index + 1}`} key={highlight.title}><div className="region-highlight-image"><Image src={highlight.image.src} alt={highlight.image.alt} fill sizes="(max-width: 800px) 100vw, 56vw" /></div><div><p className="eyebrow">{String(index + 1).padStart(2, "0")} · {highlight.eyebrow}</p><h2>{highlight.title}</h2><p>{highlight.description}</p></div></article>)}</section>
    <ImmersiveScrollStory className="region-season-story" image={{ src: "/images/central-ave/01.webp", alt: "Poolside gathering space at Central Ave Socialization" }} secondaryImage={{ src: "/images/buttercup/29.webp", alt: "Large living room at Buttercup Beauty" }} label="The longer season in Southern Cape May County" beats={[{ eyebrow: destination.seasonStory.eyebrow, heading: destination.seasonStory.headline, body: destination.seasonStory.description }, { eyebrow: "A Utopia focus", heading: "More reasons to come together.", body: "We are building around homes and experiences that work beyond a single summer week—places people can return to across the Shore calendar." }]} />
    <section className="section featured"><p className="eyebrow">Stay in the Wildwoods</p><h2>Homes that belong<br />to the place.</h2><div className="property-grid">{properties.map((property, index) => <PropertyCard property={property} index={index + 1} key={property.id} />)}</div></section>
  </>;
}
