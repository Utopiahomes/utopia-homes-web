"use client";

import type { MouseEvent } from "react";
import { track } from "@/lib/analytics/events";
import { appendAttribution, getBookingHost } from "@/lib/booking/link";

interface BookingLinkProps {
  propertyId: string;
  slug: string;
  bookingUrl: string;
  location: string;
  className?: string;
  children?: React.ReactNode;
}

export function BookingLink({ propertyId, slug, bookingUrl, location, className, children }: BookingLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track({
      name: "outbound_booking_click",
      properties: { propertyId, slug, bookingHost: getBookingHost(bookingUrl), ctaLocation: location },
    });
    event.currentTarget.href = appendAttribution(bookingUrl, window.location.search);
  }

  return <a className={className ?? "button button-primary"} href={bookingUrl} onClick={handleClick}>{children ?? "Check availability"}</a>;
}
