"use client";

import { useEffect, useMemo, useState } from "react";
import { StayResults, type StayResultHouse } from "@/components/StayResults";
import { StaySearchForm } from "@/components/StaySearchForm";
import { parseStaySearch, shoreToday, type StaySearchResult } from "@/lib/booking/stay-search";

// The Stays page's search form, error and results (2026-11-25, Next.js -> Astro). Next read
// ?arrival=&departure=&guests= on the server; the Astro page is built once, so this reads them in the
// browser and fills the same form, error line and price list. The built page shows the empty form.
export function StaySearchArea({ houses }: { houses: StayResultHouse[] }) {
  const [query, setQuery] = useState<string | null>(null);

  useEffect(() => {
    setQuery(window.location.search);
  }, []);

  // Read once per search, so the results' price checks don't restart on every render.
  const result = useMemo<StaySearchResult>(() => {
    if (query === null) return null;
    const params = new URLSearchParams(query);
    return parseStaySearch({
      arrival: params.get("arrival") ?? undefined,
      departure: params.get("departure") ?? undefined,
      guests: params.get("guests") ?? undefined,
    }, shoreToday());
  }, [query]);
  const defaults = result ? ("search" in result ? result.search : result.partial) : undefined;

  return <>
    {/* Keyed by the search, so the form's fields take the searched values once they are read. */}
    <StaySearchForm key={query ?? ""} variant="page" defaults={defaults} />
    {result && "error" in result ? <p className="stay-search-error" id="results" role="alert">{result.error}</p> : null}
    {result && "search" in result ? <StayResults search={result.search} houses={houses} /> : null}
  </>;
}
