"use client";

import type { MouseEvent } from "react";
import type { BookingDestination } from "@/types/content";
import { track } from "@/lib/analytics/events";
import { appendAttribution, getBookingHost } from "@/lib/booking/link";

interface BookingLinkProps {
  propertyId: string;
  propertyName: string;
  slug: string;
  destination: BookingDestination;
  location: string;
  className?: string;
  children?: React.ReactNode;
}

export function BookingLink({ propertyId, propertyName, slug, destination, location, className, children }: BookingLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track({
      name: "outbound_booking_click",
      properties: {
        propertyId,
        propertyName,
        slug,
        bookingProvider: destination.provider,
        bookingHost: getBookingHost(destination.url),
        ctaLocation: location,
        sourcePage: window.location.pathname,
      },
    });
    event.currentTarget.href = appendAttribution(destination.url, window.location.search);
  }

  return <a aria-label={`Check availability for ${propertyName}`} className={className ?? "button button-primary"} data-booking-provider={destination.provider} href={destination.url} onClick={handleClick}>{children ?? "Check availability"}</a>;
}
