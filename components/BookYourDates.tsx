"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatStayDates, lodgifyCheckoutUrl, parseStaySearch, shoreToday } from "@/lib/booking/stay-search";

interface BookYourDatesProps {
  rentalId: string;
  accountSlug: string;
}

// Carries a stay search into the house page (Ray, 2026-11-11). Lodgify's book-now box can't show
// starting dates, so when the page link has ?arrival=&departure=&guests= (from the Stays search
// results, or Lyra), show those dates with a button straight to Lodgify's checkout for them. The
// box below stays for picking other dates.
function YourDates({ rentalId, accountSlug }: BookYourDatesProps) {
  const params = useSearchParams();
  const result = parseStaySearch({ arrival: params.get("arrival") ?? undefined, departure: params.get("departure") ?? undefined, guests: params.get("guests") ?? undefined }, shoreToday());
  if (!result || !("search" in result)) return null;
  const { search } = result;
  return (
    <div className="book-direct-stay">
      <p className="book-direct-stay-label">Your dates</p>
      <p className="book-direct-stay-dates">{formatStayDates(search)}</p>
      <p className="book-direct-stay-detail">{search.nights} {search.nights === 1 ? "night" : "nights"} · {search.guests} {search.guests === 1 ? "guest" : "guests"}</p>
      <a className="button button-primary booking-wide" href={lodgifyCheckoutUrl(accountSlug, rentalId, search)} target="_blank" rel="noopener noreferrer">Book these dates <span aria-hidden="true">↗</span></a>
      <p className="book-direct-or">Or pick other dates</p>
    </div>
  );
}

export function BookYourDates(props: BookYourDatesProps) {
  return <Suspense fallback={null}><YourDates {...props} /></Suspense>;
}
