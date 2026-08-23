import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { ParallaxMedia } from "@/components/ParallaxMedia";
import { PropertyCard } from "@/components/PropertyCard";
import { cms } from "@/lib/cms";
type Props = { params: Promise<{ slug: string }> };
export async function generateStaticParams() { return (await cms.getDestinations()).map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const destination = await cms.getDestinationBySlug((await params).slug); return destination ? { title: destination.seoTitle.replace(" | Utopia Homes", ""), description: destination.seoDescription } : { title: "Destination not found" }; }
export default async function DestinationPage({ params }: Props) { const destination = await cms.getDestinationBySlug((await params).slug); if (!destination) notFound(); const properties = (await cms.getProperties()).filter((property) => property.destinationId === destination.id); return <><PageHero eyebrow={`${destination.city}, ${destination.state}`} title={<>{destination.name}<br /><em>in full color.</em></>} intro={destination.longDescription} image={destination.heroImage} /><ParallaxMedia image={destination.heroImage} className="destination-parallax" /><section className="section featured"><p className="eyebrow">Stay in {destination.city}</p><h2>Homes that belong<br />to the place.</h2><div className="property-grid">{properties.map((property, index) => <PropertyCard property={property} index={index + 1} key={property.id} />)}</div></section></>; }
