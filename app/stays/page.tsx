import type { Metadata } from "next";
import { PropertyCard } from "@/components/PropertyCard";
import { StayGuideLinks } from "@/components/StayGuideLinks";
import { StayResults, type StayResultHouse } from "@/components/StayResults";
import { StaySearchForm } from "@/components/StaySearchForm";
import { parseStaySearch, shoreToday } from "@/lib/booking/stay-search";
import { cms } from "@/lib/cms";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({ title: "Vacation Homes in the Wildwoods, NJ", description: "See three large-group vacation homes in Wildwood, North Wildwood, and Wildwood Crest, NJ. Search your dates and book direct with Utopia Homes.", path: "/stays" });

type SearchParams = Promise<{ arrival?: string | string[]; departure?: string | string[]; guests?: string | string[] }>;

export default async function StaysPage({ searchParams }: { searchParams: SearchParams }) {
  const [properties, guides, params] = await Promise.all([cms.getProperties(), cms.getStayGuides(), searchParams]);
  const result = parseStaySearch(params, shoreToday());
  const defaults = result ? ("search" in result ? result.search : result.partial) : undefined;
  const houses: StayResultHouse[] = properties.map((property) => ({
    slug: property.slug,
    name: property.name,
    city: property.city,
    bookingUrl: property.bookingUrl,
    image: { src: property.heroImage.src, alt: property.heroImage.alt },
    lodgify: property.lodgify ? { rentalId: property.lodgify.rentalId, accountSlug: property.lodgify.accountSlug } : undefined,
  }));

  return <div className="page-shell">
    <header className="page-heading"><p className="eyebrow">Three homes · one shore</p><h1>Stay somewhere unforgettable.</h1><p>Distinctive Wildwood homes for the trips that bring everyone together.</p></header>
    <StaySearchForm variant="page" defaults={defaults} />
    {result && "error" in result ? <p className="stay-search-error" id="results" role="alert">{result.error}</p> : null}
    {result && "search" in result ? <StayResults search={result.search} houses={houses} /> : null}
    <div className="property-grid">{properties.map((property, index) => <PropertyCard key={property.id} property={property} index={index + 1} />)}</div>
    <StayGuideLinks guides={guides} />
  </div>;
}
