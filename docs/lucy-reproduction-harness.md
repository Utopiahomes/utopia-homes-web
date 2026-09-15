# Lucy reproduction harness

Status: local, mocked-response testing only. No live Cloud endpoint, credential, or spend
is involved in running this harness today; it becomes useful against a real deployment once
Lyra's staging boundary (see the Cloud reproduction-access contract) is available.

## What this is

`scripts/lucy-reproduction.mjs` is a synthetic browser script, not a product test. It drives
the real `Ask Lucy` widget in a real Chromium browser (via Playwright) against an explicit
base URL you supply, and writes what it observed to disk. It is intentionally separate from
`pnpm e2e`, which stays a pass/fail product suite. This harness never asserts pass/fail; it
only records evidence for a human to compare against a live report.

It exists to answer, for a given base URL: what did the browser actually send, what did it
receive, and what did it render — side by side, so a "the widget is missing a source" or "Lucy
refused a question it shouldn't have" report can be classified as a website rendering issue, a
response-contract issue, or something upstream, before anyone changes code.

## Setup

```
pnpm install
npx playwright install chromium
LUCY_REPRODUCTION_BASE_URL=http://localhost:3000 pnpm lucy:reproduce
```

If `chromium.launch()` fails with "Executable doesn't exist", the environment has a
pre-installed Chromium build that doesn't match this project's pinned `@playwright/test`
version (this happened while building the harness in a sandboxed environment with no network
path to Playwright's browser CDN). `npx playwright install chromium` fixes the normal case; if
that download itself is blocked, the browser revision baked into the environment and the one
`@playwright/test` expects are simply out of sync and need reconciling on that environment's
own terms — don't change this repo's Playwright version to chase one sandbox's pre-baked build.

`LUCY_REPRODUCTION_BASE_URL` is required and is never assumed or defaulted to a real hostname.
Point it at:

- a local `pnpm dev` server with `LUCY_PUBLIC_ENABLED=true` (Lucy still needs a working
  upstream config, or you can intercept `/api/lucy` yourself for a fully offline run — see
  "Running against mocked responses" below);
- a Vercel Preview deployment, once one is bound to Lyra's staging Cloud boundary;
- production, only for the two owner-approved live reproduction runs described in the Cloud
  reproduction-access contract — never for routine testing, since production capacity is
  guest-reserved.

Use `http://localhost:3100` (or whatever port), not `http://127.0.0.1:3100`, against a local
`pnpm dev` server. Next.js 16's dev server rejects `_next/static/chunks/*` requests whose Host
doesn't match its trusted dev origin, and `127.0.0.1` isn't one by default — the page loads but
the client bundle 403s, so the widget never hydrates and every click silently does nothing. If
you see that (a launcher button that exists in the DOM but never opens on click, with no console
error), check the host you pointed the harness at before suspecting the widget.

## Fresh-session behavior: sequence vs. individual runs

Pass `sequence`, `individual`, or the default `both` as the first argument:

```
LUCY_REPRODUCTION_BASE_URL=http://127.0.0.1:3000 pnpm lucy:reproduce sequence
LUCY_REPRODUCTION_BASE_URL=http://127.0.0.1:3000 pnpm lucy:reproduce individual
```

- **sequence** opens one browser context and asks the three owner-reported questions in
  order, in the same conversation, so later requests carry the earlier turns as history —
  matching how the original report was produced.
- **individual** opens a fresh browser context per question (no history, no cookie carried
  over), to check whether a question behaves differently in isolation than it does as a
  follow-up.

Both modes capture the greeting and confirm it is excluded from the first request's `history`
array (the greeting has message id `0` and the widget never sends it to the model — see
`docs/lucy-public-integration.md`).

## Evidence location

Each run writes a timestamped, gitignored folder:

```
.artifacts/lucy-reproduction/<timestamp>/
  manifest.json
  sequence.json
  individual-01.json
  individual-02.json
  individual-03.json
  screenshots/
```

Per question, the harness records: elapsed time, the response status, an explicit allowlist
of response headers, the parsed request body actually sent by the browser, the parsed response
body, the rendered answer text, whether a `Sources` or `Useful links` container is present in
the DOM at all (not just whether it has entries — this is what actually settles the "empty
Sources heading" question), the rendered anchors in each, and any browser console errors.

## Redaction

The harness never records request headers (which would include the visitor's session cookie)
or `Set-Cookie` response headers — it only reads request/response bodies and an explicit
response-header allowlist (`content-type`, `cache-control`, and the four diagnostic headers
Lyra's Cloud contract defines: `X-Lucy-Trace-Id`, `X-Lucy-Cloud-Release`,
`X-Lucy-Snapshot-Version`, `X-Lucy-Snapshot-Digest`, plus a reserved
`X-Utopia-Website-Build`). No Authorization/bearer value is ever available to the browser to
begin with, per the existing architecture. Do not widen the header allowlist without checking
it against the Cloud contract's "no receipt contains... credential" boundary first.

## Rate limits

`/api/lucy` enforces IP and session rate limits (20/session/min, 30/IP/min at the time of
writing) independent of anything in this harness. Running `both` mode back-to-back several
times in a minute against the same base URL can trip them; a `429` in the captured output is
that limiter, not a harness bug.

## Running against mocked responses (no upstream needed)

Since there is currently no live staging Cloud endpoint, the practical way to exercise this
harness — and to test any future change to the widget's rendering logic — is to intercept
`/api/lucy` at the browser level with Playwright's own routing, rather than pointing it at a
real backend. This is how the harness itself was verified while Lyra's staging boundary was
still blocked on Docker/Render capacity: run a local `pnpm dev` with `LUCY_PUBLIC_ENABLED=true`
and add a short `page.route("**/api/lucy", ...)` fixture before navigating. This exercises the
exact same widget code the live harness does, with zero credentials and zero provider spend.

## Requesting a Cloud trace from Lyra

Once Lyra's diagnostic gate is live, a captured `sequence.json`/`individual-0N.json` will carry
an `X-Lucy-Trace-Id` header value per question. Send that UUID to Lyra; her operator-only
receipt endpoint returns the sanitized, content-free diagnostic (release/snapshot bindings,
generator/verifier attempt outcome, latency, cost) for that one request. This harness does not
call that endpoint itself — it has no operator credential, by design.
