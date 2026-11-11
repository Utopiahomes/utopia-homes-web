"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DateRangeInputs } from "@/components/DateRangeInputs";
import { fetchQuote, formatStayDates, formatUsd, lodgifyCheckoutUrl, parseStaySearch, shoreToday, staySearchQuery, type QuoteResult, type StaySearch } from "@/lib/booking/stay-search";

interface DirectBookingCardProps {
  slug: string;
  rentalId: string;
  accountSlug: string;
}

type QuoteState = { status: "checking" } | { status: "error" } | ({ status: "done" } & QuoteResult);

// A house's booking card (Ray, 2026-11-11): pick dates and guests, see the price, one Book now
// button that opens Lodgify's checkout with them filled in. Replaces Lodgify's book-now box, which
// couldn't start from searched dates and made a second book button. Dates live in the page link
// (?arrival=&departure=&guests=), so a search result or Lyra can open the card ready to book.
function Card({ slug, rentalId, accountSlug }: DirectBookingCardProps) {
  const params = useSearchParams();
  const result = parseStaySearch({ arrival: params.get("arrival") ?? undefined, departure: params.get("departure") ?? undefined, guests: params.get("guests") ?? params.get("adults") ?? undefined }, shoreToday());
  const search = result && "search" in result ? result.search : null;
  const defaults = result ? ("search" in result ? result.search : result.partial) : undefined;

  return <div className="direct-booking">
    <Form slug={slug} defaults={defaults} hasDates={Boolean(search)} />
    {result && "error" in result ? <p className="direct-booking-note" role="alert">{result.error}</p> : null}
    {search ? <Quote search={search} rentalId={rentalId} accountSlug={accountSlug} /> : <p className="direct-booking-note">Pick your dates to see the price.</p>}
  </div>;
}

function Form({ slug, defaults, hasDates }: { slug: string; defaults?: Partial<StaySearch>; hasDates: boolean }) {
  return (
    <form className="stay-search stay-search-card" action={`/stays/${slug}#book`} method="get" aria-label="Check dates and price">
      <DateRangeInputs arrival={defaults?.arrival} departure={defaults?.departure} />
      <label className="stay-search-field stay-search-guests">
        <span>Guests</span>
        <input type="number" name="guests" min={1} max={99} inputMode="numeric" defaultValue={defaults?.guests ?? 2} />
      </label>
      <button className={`button stay-search-submit ${hasDates ? "" : "button-primary"}`} type="submit">{hasDates ? "Update price" : "See price"}</button>
    </form>
  );
}

function Quote({ search, rentalId, accountSlug }: { search: StaySearch; rentalId: string; accountSlug: string }) {
  const key = staySearchQuery(search);
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetchQuote(accountSlug, rentalId, search, controller.signal)
      .then((quote) => setQuotes((current) => ({ ...current, [key]: { status: "done", ...quote } })))
      .catch(() => { if (!controller.signal.aborted) setQuotes((current) => ({ ...current, [key]: { status: "error" } })); });
    return () => controller.abort();
  }, [accountSlug, rentalId, search, key]);

  const state = quotes[key] ?? { status: "checking" };
  const checkout = lodgifyCheckoutUrl(accountSlug, rentalId, search);
  const dates = `${formatStayDates(search)} · ${search.guests} ${search.guests === 1 ? "guest" : "guests"}`;

  if (state.status === "checking") return <p className="direct-booking-note" aria-live="polite">Checking the price for {dates}…</p>;
  if (state.status === "error") {
    return <div className="direct-booking-quote"><p className="direct-booking-note" role="alert">Couldn&apos;t get the price right now.</p><a className="button button-primary booking-wide" href={checkout} target="_blank" rel="noopener noreferrer">Continue to booking <span aria-hidden="true">↗</span></a></div>;
  }
  if (!state.ok) return <p className="direct-booking-note direct-booking-closed" role="alert" aria-live="polite">{state.reason}. Try other dates.</p>;

  const { quote } = state;
  return (
    <div className="direct-booking-quote" aria-live="polite">
      <p className="direct-booking-dates">{dates}</p>
      <dl className="direct-booking-lines">
        <div><dt>{quote.nightly * quote.nights === quote.rentalTotal ? `${formatUsd(quote.nightly)} × ` : ""}{quote.nights} {quote.nights === 1 ? "night" : "nights"}</dt><dd>{formatUsd(quote.rentalTotal)}</dd></div>
        {quote.discounts.map((discount) => <div key={discount.name} className="direct-booking-discount"><dt>{discount.name}</dt><dd>−{formatUsd(-discount.value)}</dd></div>)}
        {quote.fees.map((fee) => <div key={fee.name}><dt>{fee.name}</dt><dd>{formatUsd(fee.value)}</dd></div>)}
        {quote.taxes > 0 ? <div><dt>Taxes</dt><dd>{formatUsd(quote.taxes)}</dd></div> : null}
        <div className="direct-booking-total"><dt>Total</dt><dd>{formatUsd(quote.total)}</dd></div>
      </dl>
      <a className="button button-primary booking-wide" href={checkout} target="_blank" rel="noopener noreferrer">Book now <span aria-hidden="true">↗</span></a>
    </div>
  );
}

export function DirectBookingCard(props: DirectBookingCardProps) {
  return <Suspense fallback={<div className="direct-booking"><Form slug={props.slug} hasDates={false} /></div>}><Card {...props} /></Suspense>;
}
