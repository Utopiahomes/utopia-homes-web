# guest.answer@1.0 isolated preview consumer

Pins Business Contract RC2 commit `daf99943abf177f2209a6efb00e03c087bc542c6` and Tier A digest
`sha256:50492b998b393a25322cb9b76e4a8fbd7199905b8457450b8aa48ae00149ad4c`, the same pin as the
`utopia-homes-guest-answer-provider` repo this branch talks to.

**Conformance status**: the provider this route calls is a preconformant compatibility stage — it
delegates to the legacy `cloud-hermes-lucy` FAQ engine and does not satisfy `guest.answer@1.0`
conformance (RC2 §§13-18). That status is carried only out of band, via an
`X-Utopia-Preview-Mode: legacy-bridge` diagnostic response header — **not** in the
customer-visible `limitations[]` field, which RC2 §12.2 requires to stay customer-relevant and
explicitly prohibits from revealing internal provider/infrastructure detail. `lib/lucy-preview/
server.ts` deliberately never reads `response.headers` at all (only the JSON body), so that
diagnostic header can never leak into this route's own `{ok, answer}` response to the browser or
into analytics — keep it that way if this file changes. This route exists to prove the
consumer-side protocol integration, not to preview guest-answer quality. See
`utopia-homes-guest-answer-provider`'s `docs/guest-answer-preview-rollout.md` for the two-stage
plan and why only the second stage (Homes-owned prompts/knowledge/policy behind a private Shared
Model Execution call, no legacy delegation) is eligible for Tier B evaluation.

## What this branch adds

- `lib/lucy-preview/jwt.ts` — signs a `stoin-business-jwt-v1` EdDSA JWT with an ephemeral,
  locally-generated, **preview-only** Ed25519 keypair (env-supplied private key, never a
  production key).
- `lib/lucy-preview/contracts.ts` — a *lenient* Zod parser for the provider's RC2 response (per
  the bundle's own strict-provider/lenient-consumer split — never wire the provider's strict
  schema into a live consumer parser).
- `lib/lucy-preview/server.ts` — calls the new `utopia-homes-guest-answer-provider` service over
  RC2's wire protocol (fresh `Idempotency-Key`/`X-Request-ID` per call, 15s timeout).
- `app/api/lucy-preview/route.ts` — an **isolated, not-live-traffic** Next.js API route. It is not
  imported by any guest-facing component or widget; it's reachable only by direct/manual calls.
  The existing `/api/lucy` route (legacy upstream) is completely untouched.

## What this branch deliberately does NOT do

- Does not touch `/api/lucy` or any guest-facing UI component.
- Does not wire this route into the live Lucy chat widget.
- Was not deployed anywhere — verified locally only (see below).

## Local verification performed

- `pnpm typecheck` and `pnpm lint` — both clean.
- A genuine three-process end-to-end run: a real `utopia-homes-guest-answer-provider` process, a
  real fake-legacy-upstream HTTP server, and a real `next dev` server, with a POST through
  `/api/lucy-preview` producing a schema-valid `{ok:true, answer}` response — confirming the full
  chain (consumer route → signed JWT → provider → legacy upstream → provider → consumer) actually
  works over real HTTP, not just in isolation.

## Required env vars (see `.env.example` for the full list; nothing here is committed)

```
PREVIEW_GUEST_ANSWER_ENABLED=true
PREVIEW_GUEST_ANSWER_PROVIDER_URL=<the running provider's /business/v1/guest/answer URL>
PREVIEW_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM=<ephemeral preview-only Ed25519 private key PEM>
PREVIEW_GUEST_ANSWER_JWT_KID=<matching kid, must be in the provider's preview-environment allowlist>
```

## Proposed next step (not executed)

See `utopia-homes-guest-answer-provider`'s `docs/guest-answer-preview-rollout.md` for the full
proposed (not executed) staged rollout — synthetic traffic against a real preview deployment,
then staff-only traffic, before any Tier B evaluation or production consideration.
