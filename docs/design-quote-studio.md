# Utopia Design Quote Studio implementation notes

## Current status

The shared eight-step Quote Studio, server-side pricing engine, generated quote persistence, and acknowledgment gate are implemented locally. Pricing rules are versioned as `UD-2026.2`. The audit, room, whole-home, and renovation rules reproduce the workbook examples; Ray's approved $35/$45/$55 turnkey rates supersede the workbook's original $30/$40/$50 anchors. Estimates round to the nearest $25; raw totals, rounded totals, inputs, line items, manual-review reasons, and the turnkey margin guardrail are stored.

## Data flow

1. The browser collects project facts and submits normalized JSON to `POST /api/design/quotes`.
2. The server validates the payload, computes the estimate from versioned rules, creates an opaque reopening token, stores only its SHA-256 hash, and returns the generated quote plus the one-time raw token.
3. The browser displays the server response; it never computes or alters pricing.
4. `POST /api/design/quotes/acknowledge` accepts the quote ID, raw token, customer contact information, and affirmative acknowledgment.
5. The server hashes and matches the token, atomically changes a generated quote to acknowledged, and reuses the existing design-lead notification workflow.
6. A customer estimate email is attempted only when `DESIGN_QUOTE_EMAILS_ENABLED=true`; the active Proton sender address supplies the From/Reply-To identity. Use `ray@utopiahomes.com` for the current configuration.
7. Calendar scheduling renders as a disabled “Coming soon” option. A scheduler URL is returned only after successful acknowledgment and only when both `DESIGN_SCHEDULER_ENABLED=true` and `DESIGN_SCHEDULER_URL` are configured.

## Retention and model-improvement consent

- Generated, acknowledged, abandoned, expired, declined, converted, and completed quote records are retained indefinitely. The migration grants browser roles no table access and grants no delete privilege.
- Before generation, the customer must affirm the indefinite project-history and business-analysis retention notice.
- Model-improvement use is a separate, optional choice after the estimate. Store the choice and timestamp. Only records with affirmative consent may enter a future de-identification and model-development pipeline.
- Raw private uploads are not implemented. Before enabling them, approve private storage, access controls, deletion-request handling, de-identification, and counsel-reviewed disclosures.

## Scheduling decision

Use a Calendly event link after acknowledgment, initially as an external link rather than a third-party script embed. Calendly no longer accepts new direct iCloud Calendar connections. Meghan can continue working in the Apple Calendar app by adding a supported Google or Microsoft calendar to Apple Calendar and connecting that underlying calendar to Calendly. This keeps conflict checking reliable and avoids loading Calendly tracking code before the customer chooses to schedule.

## Production gate

- Apply `supabase/migrations/20260827010000_create_design_quotes.sql` to the intended non-production database first.
- Set `DESIGN_QUOTE_STORE=supabase` and configure the existing server-only Supabase values.
- Keep Playwright isolated with memory stores and notifications disabled.
- Confirm the production Proton From address is `ray@utopiahomes.com`, then enable quote emails.
- Calendar integration is deferred and is not a V1 launch blocker. When approved later, create the event type and supported calendar bridge, then set `DESIGN_SCHEDULER_ENABLED=true` and `DESIGN_SCHEDULER_URL`.
- Select and integrate private upload storage and address autocomplete.
- Add authenticated opaque-token quote reopening before emailing reopen links.
