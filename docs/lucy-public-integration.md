# Public Lucy website integration checkpoint

Status: the local website slice is implemented and fail-closed. It is not deployed or
enabled. The matching Cloud Lucy HTTP and database boundary is implemented and verified
locally. The approved snapshot has not been staged in or published to Cloud Lucy.

## Owner decision recorded

- First scope: Public Lucy only on `www.utopiahomes.com`.
- Browser boundary: same-origin `POST /api/lucy` on the Utopia Homes website.
- Knowledge: only an approved, immutable snapshot derived from version-controlled public
  website content.
- Initial V0 snapshot: Ray approved the eight-answer snapshot with digest
  `6232b5fa0b382346fba692f29e74d2b3fdbcd9a19ee960d2e609fd0b2ce2b99e` on
  2026-09-11.
- Paid inference/OpenRouter: disabled.
- Transcript capture: disabled. The website does not persist or log questions or answers.
- Private Lucy: closed until a customer identity provider and strong-auth claims are
  selected and separately approved.

## Initial public-content candidate

The first reviewable FAQ snapshot lives in
`content/lucy-public-snapshot.v0.json`. Ray approved this exact snapshot and digest
on 2026-09-11. It is marked `approved`, but it has not been staged or published to
Cloud Lucy.

- Candidate FAQ count: 8
- Visible suggestion count: 4
- Cloud schema: `lucy-public-faq-v1`
- Canonical SHA-256: `6232b5fa0b382346fba692f29e74d2b3fdbcd9a19ee960d2e609fd0b2ce2b99e`
- Lineage: only `www.utopiahomes.com` pages backed by version-controlled website
  content
- Deliberate exclusions: live availability or pricing, booking-provider specifics,
  guest support, private Lucy knowledge, customer data, and OpenRouter-generated
  answers

The approved snapshot covers location, the owner-led stay approach, owner management,
Utopia Design, the three-home collection, external booking handoff, membership
status, and contact. The widget's four prompts are drawn from this same validated
record through `CmsAdapter`; no prompt copy is embedded in the presentation
component.

The digest was independently reproduced on 2026-09-11 with Cloud Lucy's own
`faq_snapshot` and `snapshot_digest` functions. Any answer, question, source, or
membership change produces a different digest and requires a new review. This is
Public Lucy V0's security and integration baseline, not the intended ceiling for her
knowledge or reasoning.

## Implemented website boundary

The root layout mounts a site-wide, keyboard-accessible `Ask Lucy` widget only when
`LUCY_PUBLIC_ENABLED=true`. The browser sends a bounded `{ "question": string }` body to
the same-origin route. The route:

- requires an exact same-origin browser request and JSON body;
- caps the request at 8 KiB and the normalized question at 500 characters;
- applies defense-in-depth IP and opaque-session rate limits;
- creates a one-hour, HttpOnly, SameSite=Strict session cookie;
- sends the question and opaque session only to the exact configured upstream URL;
- keeps the upstream bearer server-only and refuses credential-bearing redirects;
- validates the complete upstream response and requires its snapshot digest to equal
  the exact owner-approved `LUCY_PUBLIC_SNAPSHOT_DIGEST` before returning only the
  approved answer;
- returns a generic, non-cached `503` on missing configuration, network failure, or an
  invalid upstream contract;
- emits content-free analytics events only—never question or answer text.

The in-process website rate limiter is defense in depth, not the authoritative public
ingress limit. Cloud Lucy must independently enforce the activation-manifest IP,
session, byte, and timeout ceilings across instances.

## Exact upstream contract required

`LUCY_PUBLIC_API_URL` is the complete HTTPS endpoint; the website does not assume a
Render hostname or path. The request is:

```http
POST <LUCY_PUBLIC_API_URL>
Authorization: Bearer <dedicated website credential>
Content-Type: application/json
Origin: https://www.utopiahomes.com
X-Lucy-Public-Host: www.utopiahomes.com
X-Lucy-Public-Session: <opaque UUID>

{"question":"..."}
```

The accepted `200` response is strict JSON:

```json
{
  "answer": "Approved public answer",
  "source": "content://approved-source-lineage",
  "version": 1,
  "snapshot_digest": "64-lowercase-hex-characters"
}
```

Cloud Lucy must bind the dedicated credential to the Utopia public projection, accept
only the approved origin/site binding, read only the published projection, and return no
private-memory fallback. A miss should be a bounded non-`200` response without invoking
a paid provider while OpenRouter is disabled. The website also rejects a structurally
valid response when its snapshot digest differs from the configured approved digest.

## Activation gate

Before setting `LUCY_PUBLIC_ENABLED=true` in any deployed environment:

1. Reconcile and review the locally implemented upstream contract in
   `cloud-hermes-lucy` with the concurrent Stage 1 work.
2. Stage and publish the exact owner-approved V0 snapshot bytes in Cloud Lucy; record
   the approved digest and source lineage in the private activation manifest and
   website environment.
3. Create a dedicated website-to-Lucy bearer of at least 32 characters and store it only
   in the corresponding encrypted Vercel and Cloud Lucy environments.
4. Validate the populated activation manifest with paid inference and transcript capture
   both false.
5. Under quarantine, prove missing/wrong bearer, foreign origin, cross-realm selection,
   over-limit requests, snapshot miss, and direct private ingress all fail closed.
6. Obtain separate deployment/activation approval, deploy the exact pinned revisions,
   verify one approved answer through `https://www.utopiahomes.com/api/lucy`, and exercise
   the documented rollback to `LUCY_PUBLIC_ENABLED=false`.

No DNS, Vercel production configuration, Render service, database, or production data
was changed by this website implementation.

## Verification ledger

| Check | Result | Evidence | Invalidated by |
| --- | --- | --- | --- |
| Strict TypeScript and ESLint | Passed 2026-09-12 | Local working tree based on `f075de0`; `tsc --noEmit`, `eslint .` | Code/dependency/config changes |
| Unit and contract tests | Passed 2026-09-12; 21 files, 84 tests | Full Vitest run, including Lucy request, digest pinning, cross-runtime candidate snapshot, upstream-validation, and widget tests | Code/dependency/config changes |
| Production build | Passed 2026-09-12; 27 routes generated | Next.js 16.3.2 production build with `/api/lucy` dynamic | Code/dependency/build-environment changes |
| Browser and responsive flow | Passed 2026-09-12; all 21 Playwright scenarios | Lucy enabled with its upstream absent; includes mobile navigation, fail-closed Lucy, external booking handoff, forms, redirects, and CMS 404s. The pass also confirmed the corrected relative hero-image wrapper and Next 16 smooth-scroll declaration without either prior runtime warning. | Widget, route, CSS, layout, Playwright config, or shared site behavior changes |
| Mobile visual inspection | Passed 2026-09-11 | `lucy-mobile.png` in the task visualization directory; local fallback font was used because the dev sandbox could not reach Google Fonts | Widget, CSS, layout, viewport, or font changes |
| Candidate snapshot cross-runtime digest | Passed 2026-09-11 | Website canonicalizer and Cloud Lucy `faq_snapshot`/`snapshot_digest` both produced `6232b5fa0b382346fba692f29e74d2b3fdbcd9a19ee960d2e609fd0b2ce2b99e` for 8 FAQs | Candidate content or either canonicalizer changes |
| Authenticated site-host binding | Passed 2026-09-11 | Full TypeScript, focused ESLint, 8 focused Vitest checks, and a 27-route production build after adding `X-Lucy-Public-Host` | Website proxy, Cloud ingress contract, or environment changes |
| Deployed same-origin success and negative controls | Not yet executed | Requires exact pinned Cloud Lucy endpoint and deployment approval | Any ingress, credential, manifest, release, or environment change |
