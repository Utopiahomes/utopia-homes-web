"use client";

import { useRef } from "react";
import { addDays, DEFAULT_NIGHTS, shoreToday } from "@/lib/booking/stay-search";

// Check-in and check-out as two plain, labeled date fields (typeable, and Lyra can fill them), with
// one convenience Ray asked for: picking check-in sets check-out a week later, so the check-out
// picker opens on that month instead of starting over from today.
//
// It must not open the check-out picker or move focus itself (Ray, 2026-11-11): Chrome's picker
// changes the check-in value live as you use its month arrows, so the first up/down counted as a
// pick, jumped to check-out and closed the calendar you were browsing.
export function DateRangeInputs({ arrival, departure }: { arrival?: string; departure?: string }) {
  const departureRef = useRef<HTMLInputElement>(null);
  const today = shoreToday();

  function onArrivalChange(event: React.ChangeEvent<HTMLInputElement>) {
    const out = departureRef.current;
    const chosen = event.target.value;
    if (!out || !chosen) return;
    const dayAfter = addDays(chosen, 1);
    if (dayAfter) out.min = dayAfter;
    if (!out.value || out.value <= chosen) {
      out.value = addDays(chosen, DEFAULT_NIGHTS) ?? "";
    }
  }

  return <>
    <label className="stay-search-field">
      <span>Check-in</span>
      <input type="date" name="arrival" required min={today} defaultValue={arrival} onChange={onArrivalChange} />
    </label>
    <label className="stay-search-field">
      <span>Check-out</span>
      <input ref={departureRef} type="date" name="departure" required min={arrival ? addDays(arrival, 1) ?? today : today} defaultValue={departure} />
    </label>
  </>;
}
