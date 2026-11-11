"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchQuote, formatStayDates, formatUsd, staySearchQuery, type QuoteResult, type StaySearch } from "@/lib/booking/stay-search";

export interface StayResultHouse {
  slug: string;
  name: string;
  city: string;
  bookingUrl: string;
  image: { src: string; alt: string };
  lodgify?: { rentalId: string; accountSlug: string };
}

type HouseState = { status: "checking" } | { status: "airbnb" } | { status: "error" } | ({ status: "done" } & QuoteResult);

// Each house's price for the searched dates, from Lodgify's price quote in the guest's browser;
// a house that can't take the stay says why.
export function StayResults({ search, houses }: { search: StaySearch; houses: StayResultHouse[] }) {
  // Results are keyed by the search, so a new search starts as "checking" without clearing state.
  const [states, setStates] = useState<Record<string, HouseState>>({});
  const query = staySearchQuery(search);

  useEffect(() => {
    const controller = new AbortController();
    for (const house of houses) {
      const key = `${query}|${house.slug}`;
      const done = (state: HouseState) => setStates((current) => ({ ...current, [key]: state }));
      if (!house.lodgify) { done({ status: "airbnb" }); continue; }
      fetchQuote(house.lodgify.accountSlug, house.lodgify.rentalId, search, controller.signal)
        .then((result) => done({ status: "done", ...result }))
        .catch(() => { if (!controller.signal.aborted) done({ status: "error" }); });
    }
    return () => controller.abort();
  }, [houses, search, query]);

  // A search from the home page lands on /stays#results; Next resets scroll on load, so bring the
  // results into view once they mount.
  useEffect(() => {
    if (window.location.hash === "#results") document.getElementById("results")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  const stateOf = (slug: string): HouseState => states[`${query}|${slug}`] ?? { status: "checking" };
  const priceOf = (slug: string) => { const state = stateOf(slug); return state.status === "done" && state.ok ? state.quote.total : null; };
  const ordered = [...houses].sort((a, b) => (priceOf(a.slug) ?? Infinity) - (priceOf(b.slug) ?? Infinity));
  const checking = houses.some(({ slug }) => stateOf(slug).status === "checking");
  const openCount = houses.filter(({ slug }) => priceOf(slug) !== null).length;

  return (
    <section className="stay-results" id="results" aria-labelledby="stay-results-title">
      <p className="eyebrow">Your search</p>
      <h2 id="stay-results-title">{formatStayDates(search)}</h2>
      <p className="stay-results-summary" aria-live="polite">
        {search.nights} {search.nights === 1 ? "night" : "nights"} · {search.guests} {search.guests === 1 ? "guest" : "guests"} ·{" "}
        {checking ? "Checking prices…" : openCount === 0 ? "No houses are open for those dates." : `${openCount} of ${houses.length} houses ${openCount === 1 ? "is" : "are"} open.`}
      </p>
      <ul className="stay-results-list">
        {ordered.map((house) => {
          const state = stateOf(house.slug);
          const open = state.status === "done" && state.ok;
          const href = `/stays/${house.slug}?${query}#book`;
          return (
            <li key={house.slug} className={`stay-result ${open ? "is-open" : state.status === "done" ? "is-closed" : ""}`} data-availability={state.status === "done" ? (state.ok ? "open" : "closed") : state.status}>
              <Link className="stay-result-image" href={href} tabIndex={-1} aria-hidden="true">
                <Image src={house.image.src} alt="" fill sizes="(max-width: 700px) 100vw, 220px" />
              </Link>
              <div className="stay-result-copy">
                <p className="stay-result-city">{house.city}</p>
                <h3>{house.name}</h3>
                {state.status === "done" && state.ok
                  ? <p className="stay-result-price"><strong>{formatUsd(state.quote.total)}</strong> total for {state.quote.nights} {state.quote.nights === 1 ? "night" : "nights"}{state.quote.discounts.length ? ` · includes ${state.quote.discounts[0].name.toLowerCase()}` : ""} <span>Book direct and save 10%</span></p>
                  : <p className="stay-result-status">{state.status === "checking" ? "Checking price…" : state.status === "airbnb" ? "Check these dates on Airbnb" : state.status === "error" ? "Couldn't check right now. See the house page." : state.reason}</p>}
              </div>
              {state.status === "airbnb"
                ? <a className="button stay-result-action" href={house.bookingUrl} target="_blank" rel="noopener noreferrer">Airbnb ↗</a>
                : <Link className={`button stay-result-action ${open ? "button-primary" : ""}`} href={href}>{open ? `Book ${house.name}` : `View ${house.name}`}</Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
