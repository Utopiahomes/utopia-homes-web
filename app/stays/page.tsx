import type { Metadata } from "next";
import { PropertyCard } from "@/components/PropertyCard";
import { cms } from "@/lib/cms";

export const metadata: Metadata = { title: "Stays", description: "Explore distinctive homes in the Utopia collection." };

export default async function StaysPage() {
  const properties = await cms.getProperties();
  return <div className="page-shell"><header className="page-heading"><p className="eyebrow">Three homes · one shore</p><h1>Stay somewhere unforgettable.</h1><p>Distinctive Wildwood homes for the trips that bring everyone together.</p></header><div className="property-grid">{properties.map((property, index) => <PropertyCard key={property.id} property={property} index={index + 1} />)}</div></div>;
}
