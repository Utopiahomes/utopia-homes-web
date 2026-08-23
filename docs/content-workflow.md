# Agent-managed content workflow

## Source of truth

Edit the human-readable TypeScript modules in `/content`. Each collection is validated on import by `/content/schemas.ts`, so invalid slugs, URLs, statuses, images, or required property fields fail tests/builds.

## Adding or updating a property

1. Open the approved Airbnb/Vrbo source URL from the record.
2. Compare facts with the normalized local record; never scrape at runtime.
3. Record proposed factual changes in the pull request or agent report before changing curated copy.
4. Update the local property record, preserving its stable ID and slug unless a redirect is planned.
5. Add approved images under `/public/images/<property-slug>/` with alt text.
6. Keep photo/review rights status explicit; only approved reviews render.
7. Run typecheck, lint, tests, E2E, and build.

## Launch-property source inventory

- Airbnb 639163446287777223 — normalized as `buttercup-beauty`; approved name and photography.
- Airbnb 1137760792304016998 — normalized as `central-ave-socialization`; approved name and photography.
- Airbnb 1629070581710289311 — normalized as `the-shamrock`; approved name and photography.

Each property stores a `sourceSnapshot` containing the source listing title, displayed capacity, stated sleeping capacity, source location label, disclosed amenity count, and a factual summary. This audit layer is intentionally separate from Utopia's `shortDescription` and `fullDescription`, which are curated editorial copy.

All three records currently have `factStatus: partial` because the live source pages contain internal inconsistencies. Ray owns and has approved the property photography for Utopia Homes. Review rights remain `pending`; public visibility on Airbnb is not treated as publication permission.

Source listings are research inputs, never production runtime dependencies. Curated Utopia names and editorial copy must not be silently overwritten by source changes.
