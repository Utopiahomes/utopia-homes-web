# Phase 1 direct-booking handoff

## Boundary

Phase 1 keeps discovery and property storytelling on UtopiaHomes.com and hands a guest from a property-specific booking CTA to the corresponding property on Uplisting Direct. Uplisting owns date and guest selection, Request to Book, payment links, Stripe payment, and reservation operations. This release does not add OAuth, APIs, webhooks, availability, pricing, reservation storage, or a native request form.

## Configuration and current state

Each property has a provider-neutral `booking` configuration in `content/properties.ts`:

- `primary` is the intended direct-booking destination once an exact, verified Uplisting property URL is available.
- `fallback` retains the previous Airbnb booking URL for rapid rollback.
- `mode` selects `primary` or `fallback`.
- `profiles.airbnb.url` remains independent from booking and preserves Airbnb review attribution.

The three exact Uplisting-hosted property URLs are configured as `primary`, and all properties select `primary` mode in the local implementation. The production site has not been deployed with this configuration. The Airbnb destinations remain intact as fallbacks.

## Cutover procedure

For each property independently:

1. Publish its Uplisting Direct property page and copy its exact HTTPS public URL.
2. Verify the page is public and maps to the correct property.
3. Verify Request to Book is active and Instant Book is disabled.
4. Verify dates, guest limits, minimum stays, request-email recipient, and mobile behavior.
5. Add the URL as `booking.primary` with provider `uplisting`.
6. Change `booking.mode` to `primary` only after the property passes QA.
7. Run typecheck, lint, unit tests, the booking E2E test, and a production build.
8. Deploy only with Ray's explicit authorization and test both CTAs plus the independent Airbnb review link.

The CTA copy remains **Check availability** unless testing shows it misrepresents the Uplisting page. Any approved copy change must apply to both CTA locations for every launch property.

## Rollback

If an Uplisting destination is broken, incorrect, unavailable, or operationally unready, change the affected property's `booking.mode` to `fallback`, validate, and deploy through the normal approved workflow. Do not remove its Airbnb fallback or repoint its review attribution.

## Operational launch gate

Website cutover is not operational launch approval. Before accepting real requests, operations must verify the monitored inbox, reviewer and backup, response target, screening criteria, payment-link workflow, Stripe connection, fees and taxes, restrictions, cancellation rules, rental agreement, guest protections, and a controlled end-to-end request/payment test.

As verified on September 2, 2026, each published Uplisting page exposes Request to Book and retains the exact configured URL. Each page currently limits its guest selector to 16. This conflicts with Utopia's approved advertised capacities of 22 for Buttercup Beauty, 22 for Central Ave Socialization, and 32 for The Shamrock. Resolve and retest the guest-count configuration before production cutover. Stripe connection and the operator-created payment-link test are also pending; the target response time remains to be defined.
