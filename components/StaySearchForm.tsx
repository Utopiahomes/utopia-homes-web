import { DateRangeInputs } from "@/components/DateRangeInputs";
import type { StaySearch } from "@/lib/booking/stay-search";

// A plain GET form (works without script; Lyra can read and fill it like any form): labeled
// check-in, check-out and guests fields and one button, on the home hero and the Stays page.
export function StaySearchForm({ defaults, variant }: { defaults?: Partial<StaySearch>; variant: "hero" | "page" }) {
  return (
    <form className={`stay-search stay-search-${variant}`} action="/stays#results" method="get" role="search" aria-label="Search stays by date">
      <DateRangeInputs arrival={defaults?.arrival} departure={defaults?.departure} />
      <label className="stay-search-field stay-search-guests">
        <span>Guests</span>
        <input type="number" name="guests" min={1} max={99} inputMode="numeric" defaultValue={defaults?.guests ?? 2} />
      </label>
      <button className="button button-primary stay-search-submit" type="submit">Search</button>
    </form>
  );
}
