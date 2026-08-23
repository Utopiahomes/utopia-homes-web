import type { Property } from "@/types/content";

export function PropertyFacts({ property }: { property: Property }) {
  const facts = [["Guests", property.maxGuests], ["Bedrooms", property.bedrooms], ["Beds", property.beds], ["Baths", property.bathrooms]].filter(([, value]) => value != null);
  if (!facts.length) return <p className="content-note">Verified capacity and room facts will be added after source approval.</p>;
  return <dl className="property-facts">{facts.map(([label, value]) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}</dl>;
}
