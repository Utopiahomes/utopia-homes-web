"use client";

import { useRef } from "react";
import { addDays, DEFAULT_NIGHTS, shoreToday } from "@/lib/booking/stay-search";

// Check-in and check-out as two plain, labeled date fields (typeable, and Lyra can fill them), with
// one convenience Ray asked for: after picking check-in, check-out is set 2 nights later and its
// picker opens on that month, instead of starting over from today.
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
      try { out.showPicker(); } catch { out.focus(); }
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
