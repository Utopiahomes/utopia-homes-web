import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { cms } from "@/lib/cms";
export const metadata: Metadata = { title: "Destinations", description: "Find the places that give every Utopia stay its character." };
export default async function DestinationsPage() { const destinations = await cms.getDestinations(); return <><PageHero eyebrow="Go somewhere worth knowing" title={<>Places with<br /><em>their own rhythm.</em></>} intro="Destination guides built around the homes, neighborhoods, and local details that make a trip memorable." tone="dark" /><section className="listing-section">{destinations.map((destination, index) => <Link className="destination-row" key={destination.id} href={`/destinations/${destination.slug}`}><span>{String(index + 1).padStart(2, "0")}</span><div><p className="eyebrow">{destination.city}, {destination.state}</p><h2>{destination.name}</h2><p>{destination.shortDescription}</p></div><div className="destination-image"><Image src={destination.heroImage.src} alt={destination.heroImage.alt} fill sizes="40vw" /></div><b aria-hidden="true">↗</b></Link>)}</section></>; }
