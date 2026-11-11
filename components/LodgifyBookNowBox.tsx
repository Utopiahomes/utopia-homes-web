"use client";

import { useEffect } from "react";

const SCRIPT_SRC = "https://app.lodgify.com/book-now-box/stable/renderBookNowBox.js";

interface LodgifyBookNowBoxProps {
  rentalId: string;
  websiteId: string;
  accountSlug: string;
}

// Lodgify's direct-booking box (Ray, 2026-11-11). Its script renders into every
// #lodgify-book-now-box on the page once, when it runs, so a fresh copy is loaded each time the
// box mounts: after a client-side page change the box appears after the first copy already ran.
export function LodgifyBookNowBox({ rentalId, websiteId, accountSlug }: LodgifyBookNowBoxProps) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div
      id="lodgify-book-now-box"
      data-rental-id={rentalId}
      data-website-id={websiteId}
      data-slug={accountSlug}
      data-language-code="en"
      data-new-tab="true"
      data-version="stable"
      data-check-in-label="Check-in"
      data-check-out-label="Check-out"
      data-guests-label="Guests"
      data-guests-singular-label="{{NumberOfGuests}} guest"
      data-guests-plural-label="{{NumberOfGuests}} guests"
      data-location-input-label="Location"
      data-total-price-label="Total price:"
      data-select-dates-to-see-price-label="Select dates to see total price"
      data-minimum-price-per-night-first-label="From"
      data-minimum-price-per-night-second-label="per night"
      data-book-button-label="Book Now"
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
    />
  );
}
