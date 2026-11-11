import type { StaySearch } from "@/lib/booking/stay-search";

// A plain GET form to /stays (no script needed), so it works for everyone and Lyra can read and
// fill it like any form: labeled check-in, check-out and guests fields and one Search button.
export function StaySearchForm({ defaults, variant }: { defaults?: Partial<StaySearch>; variant: "hero" | "page" }) {
  return (
    <form className={`stay-search stay-search-${variant}`} action="/stays#results" method="get" role="search" aria-label="Search stays by date">
      <label className="stay-search-field">
        <span>Check-in</span>
        <input type="date" name="arrival" required defaultValue={defaults?.arrival} />
      </label>
      <label className="stay-search-field">
        <span>Check-out</span>
        <input type="date" name="departure" required defaultValue={defaults?.departure} />
      </label>
      <label className="stay-search-field stay-search-guests">
        <span>Guests</span>
        <input type="number" name="guests" min={1} max={99} inputMode="numeric" defaultValue={defaults?.guests ?? 2} />
      </label>
      <button className="button button-primary stay-search-submit" type="submit">Search</button>
    </form>
  );
}
