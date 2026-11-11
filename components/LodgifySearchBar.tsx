"use client";

import { useEffect } from "react";

const SCRIPT_SRC = "https://app.lodgify.com/portable-search-bar/stable/renderPortableSearchBar.js";

// Lodgify's search bar (Ray, 2026-11-11): on the home page and the Stays page; a search opens the
// results on Utopia's Lodgify site in a new tab. Like the book-now box, the script renders into
// #lodgify-search-bar once when it runs, so a fresh copy is loaded each time the bar mounts:
// after a client-side page change the bar appears after the first copy already ran.
export function LodgifySearchBar({ className }: { className?: string }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className={className}>
      <div
        id="lodgify-search-bar"
        data-website-id="675624"
        data-language-code="en"
        data-search-page-url="https://raymond-p-deluca.lodgify.com/en/all-properties"
        data-dates-check-in-label="Check-in"
        data-dates-check-out-label="Check-out"
        data-guests-counter-label="Guests"
        data-guests-input-singular-label="{{NumberOfGuests}} guest"
        data-guests-input-plural-label="{{NumberOfGuests}} guests"
        data-location-input-label="Location"
        data-search-button-label="Search"
        data-dates-input-min-stay-tooltip-text='{"one":"Minimum {minStay} night","other":"Minimum {minStay} nights"}'
        data-guests-breakdown-label="Guests"
        data-adults-label='{"one":"adult","other":"adults"}'
        data-adults-description="Ages {minAge} or above"
        data-children-label='{"one":"child","other":"children"}'
        data-children-description="Ages {minAge}-{maxAge}"
        data-children-not-allowed-label="Not suitable for children"
        data-infants-label='{"one":"infant","other":"infants"}'
        data-infants-description="Under {maxAge}"
        data-infants-not-allowed-label="Not suitable for infants"
        data-pets-label='{"one":"pet","other":"pets"}'
        data-pets-not-allowed-label="Not allowed"
        data-done-label="Done"
        data-new-tab="true"
        data-version="stable"
      />
    </div>
  );
}
