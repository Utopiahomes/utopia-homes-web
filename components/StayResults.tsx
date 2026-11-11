"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { checkStay, formatStayDates, staySearchQuery, type CalendarDay, type StaySearch, type StayVerdict } from "@/lib/booking/stay-search";

export interface StayResultHouse {
  slug: string;
  name: string;
  city: string;
  maxGuests?: number;
  bookingUrl: string;
  image: { src: string; alt: string };
  lodgify?: { rentalId: string; accountSlug: string };
}

type HouseState = { status: "checking" } | { status: "airbnb" } | { status: "error" } | ({ status: "done" } & StayVerdict);

const LODGIFY = "https://checkout.lodgify.com/api/v2/websites";

// Asks Lodgify from the guest's browser, as the house page's book-now box does: each house's
// calendar from the check-in date (90 days) plus its current guest limit.
async function checkHouse(house: StayResultHouse, search: StaySearch, signal: AbortSignal): Promise<HouseState> {
  if (!house.lodgify) return { status: "airbnb" };
  const base = `${LODGIFY}/${house.lodgify.accountSlug}/rentals/${house.lodgify.rentalId}`;
  const [calendarResponse, rentalResponse] = await Promise.all([
    fetch(`${base}/calendar?startDate=${search.arrival}`, { signal }),
    fetch(base, { signal }).catch(() => null),
  ]);
  if (!calendarResponse.ok) return { status: "error" };
  const { calendar } = (await calendarResponse.json()) as { calendar?: CalendarDay[] };
  if (!Array.isArray(calendar)) return { status: "error" };
  let maxGuests = house.maxGuests;
  if (rentalResponse?.ok) {
    const rental = (await rentalResponse.json().catch(() => null)) as { propertyMaxGuests?: number } | null;
    if (rental?.propertyMaxGuests) maxGuests = rental.propertyMaxGuests;
  }
  return { status: "done", ...checkStay(calendar, search, maxGuests) };
}

export function StayResults({ search, houses }: { search: StaySearch; houses: StayResultHouse[] }) {
  // Results are keyed by the search, so a new search starts as "checking" without clearing state.
  const [states, setStates] = useState<Record<string, HouseState>>({});
  const query = staySearchQuery(search);

  useEffect(() => {
    const controller = new AbortController();
    for (const house of houses) {
      const key = `${query}|${house.slug}`;
      checkHouse(house, search, controller.signal)
        .then((state) => setStates((current) => ({ ...current, [key]: state })))
        .catch(() => { if (!controller.signal.aborted) setStates((current) => ({ ...current, [key]: { status: "error" } })); });
    }
    return () => controller.abort();
  }, [houses, search, query]);

  // A search from the home page lands on /stays#results; Next resets scroll on load, so bring the
  // results into view once they mount.
  useEffect(() => {
    if (window.location.hash === "#results") document.getElementById("results")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  const stateOf = (slug: string): HouseState => states[`${query}|${slug}`] ?? { status: "checking" };
  const isOpen = (slug: string) => { const state = stateOf(slug); return state.status === "done" && state.available; };
  const ordered = [...houses].sort((a, b) => Number(isOpen(b.slug)) - Number(isOpen(a.slug)));
  const checking = houses.some(({ slug }) => stateOf(slug).status === "checking");
  const openCount = houses.filter(({ slug }) => isOpen(slug)).length;

  return (
    <section className="stay-results" id="results" aria-labelledby="stay-results-title">
      <p className="eyebrow">Your search</p>
      <h2 id="stay-results-title">{formatStayDates(search)}</h2>
      <p className="stay-results-summary" aria-live="polite">
        {search.nights} {search.nights === 1 ? "night" : "nights"} · {search.guests} {search.guests === 1 ? "guest" : "guests"} ·{" "}
        {checking ? "Checking availability…" : openCount === 0 ? "No houses are open for those dates." : `${openCount} of ${houses.length} houses ${openCount === 1 ? "is" : "are"} open.`}
      </p>
      <ul className="stay-results-list">
        {ordered.map((house) => {
          const state = stateOf(house.slug);
          const open = state.status === "done" && state.available;
          const status =
            state.status === "checking" ? "Checking…"
              : state.status === "airbnb" ? "Check these dates on Airbnb"
                : state.status === "error" ? "Couldn't check right now. See the house page."
                  : state.available ? "Open for your dates · book direct and save 10%" : state.reason;
          return (
            <li key={house.slug} className={`stay-result ${open ? "is-open" : state.status === "done" ? "is-closed" : ""}`} data-availability={state.status === "done" ? (state.available ? "open" : "closed") : state.status}>
              <Link className="stay-result-image" href={`/stays/${house.slug}?${query}#book`} tabIndex={-1} aria-hidden="true">
                <Image src={house.image.src} alt="" fill sizes="(max-width: 700px) 100vw, 220px" />
              </Link>
              <div className="stay-result-copy">
                <p className="stay-result-city">{house.city}</p>
                <h3>{house.name}</h3>
                <p className="stay-result-status">{status}</p>
              </div>
              {state.status === "airbnb"
                ? <a className="button stay-result-action" href={house.bookingUrl} target="_blank" rel="noopener noreferrer">Airbnb ↗</a>
                : <Link className={`button stay-result-action ${open ? "button-primary" : ""}`} href={`/stays/${house.slug}?${query}#book`}>{open ? `Book ${house.name}` : `View ${house.name}`}</Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
