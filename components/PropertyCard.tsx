import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/types/content";

export function PropertyCard({ property, index }: { property: Property; index?: number }) {
  return <article className="property-card"><Link href={`/stays/${property.slug}`}><div className="card-image"><Image src={property.heroImage.src} alt={property.heroImage.alt} fill sizes="(max-width: 800px) 100vw, 70vw" /><span className="card-index">{String(index ?? 1).padStart(2, "0")}</span><span className="card-arrow" aria-hidden="true">↗</span></div><div className="card-copy"><div><p className="eyebrow">{property.city}, {property.state}</p><h3>{property.name}</h3></div><p>{property.shortDescription}</p><span className="text-link">Discover the home <span aria-hidden="true">→</span></span></div></Link></article>;
}
