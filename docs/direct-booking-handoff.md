# Provider-neutral direct-booking handoff

## Boundary

Discovery and property storytelling stay on UtopiaHomes.com. A guest reaches an external
provider from a property-specific booking CTA. That provider — not this website — owns date
and guest selection, request/instant booking, and payment. This does not add OAuth, APIs,
webhooks, availability, pricing, reservation storage, or a native request form on the website
side.

## Configuration and current state

Each property has a provider-neutral `booking` configuration in `content/properties.ts`
(typed in `types/content.ts`, validated in `content/schemas.ts`, resolved by
`lib/booking/destination.ts`):

- `primary` is the intended direct-booking destination once a specific, verified provider
  URL is approved for a property. It is optional; `resolveBookingDestination` falls back to
  `fallback` if `mode` is `"primary"` but no `primary` is set.
- `fallback` is the durable rollback destination. Every launch property's fallback is its
  existing Airbnb listing.
- `mode` selects `"primary"` or `"fallback"`.
- `profiles.airbnb.url` is independent of `booking` and preserves Airbnb review attribution
  (`PropertyReviews` reads it via `reviewSummary.sourceUrl`, not via `booking`) — changing
  the active booking provider never touches review attribution.

**Current state: every property is in `fallback` mode with no `primary` configured.** An
earlier local branch configured Uplisting Direct (bookeddirectly.com) URLs as `primary` for
all three properties; that configuration was never deployed to production, and it was retired
rather than transferred, because the operator has since chosen to trial Lodgify instead. No
Lodgify property URL, API contract, activation state, or credential exists anywhere in this
repository — do not invent one. This document intentionally has no Lodgify-specific
instructions yet; add them, from real verified Lodgify destinations, when that trial reaches
a decision.

## Cutover procedure (provider-agnostic template)

For each property independently, once a specific provider is chosen and its integration
shape (a plain external URL, vs. an API) is known:

1. Publish or configure the property on the provider's side and obtain its exact, verified
   HTTPS destination.
2. Verify the destination is public, maps to the correct property, and that guest/date
   selection limits match Utopia's approved advertised capacity for that property (a prior
   Uplisting evaluation found its guest selector capped at 16 against approved capacities of
   22–32 — re-verify this class of mismatch for whatever provider is chosen).
3. Add the destination as `booking.primary` with the correct `provider` value.
4. Change `booking.mode` to `"primary"` only after the property passes QA.
5. Run typecheck, lint, unit tests, the booking E2E test, and a production build.
6. Deploy only with Ray's explicit authorization, and test both booking CTA locations plus
   the independent Airbnb review link.

The CTA copy remains **Check availability** unless testing shows it misrepresents the target
page. Any approved copy change must apply to both CTA locations for every launch property.

## Rollback

If an active `primary` destination is broken, incorrect, unavailable, or operationally
unready, change the affected property's `booking.mode` to `"fallback"`, validate, and deploy
through the normal approved workflow. Do not remove its Airbnb fallback or repoint its review
attribution.

## Operational launch gate

Website cutover is not operational launch approval. Before accepting real requests through
any provider, operations must independently verify the monitored inbox, reviewer and backup,
response target, screening criteria, payment workflow, payment-processor connection, fees and
taxes, restrictions, cancellation rules, rental agreement, guest protections, and a controlled
end-to-end request/payment test — regardless of which provider is ultimately chosen.
