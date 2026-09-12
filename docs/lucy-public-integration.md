# Public Lucy website integration checkpoint

Status: the R1 conversational website slice is implemented and fail-closed on the local
`codex/public-lucy-r1` branch. It is not deployed or enabled. The matching Cloud Lucy
knowledge/retrieval boundary is implemented on its isolated local branch. The R1 corpus
has not been finalized, staged, approved, or activated.

## R1 amendment

The browser now sends the current question, an allowlisted page context, and at most six
prior visitor/Lucy turns (4,000 characters total). History lives only in component memory,
survives client-side page navigation, expires after 30 minutes, and clears on refresh or
Start over. It is conversational context—not evidence or authorization. Cloud Lucy must
retrieve supporting approved facts again for every question.

The R1 response distinguishes `answered`, `partial`, and `fallback`, with optional compact
source and useful-link references. The website displays those customer-facing fields but
does not expose snapshot versions, evidence IDs, trace identifiers, coverage diagnostics,
or restrictions. It records only fixed, content-free outcome analytics.

The initial eight-answer V0 snapshot below remains historical rollback context. It is not
automatically eligible for R1 rollback: any rollback projection must be separately
reviewed, effective, free of withdrawn/sensitive knowledge, and explicitly digest-pinned.

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
`LUCY_PUBLIC_ENABLED=true`. The browser sends a bounded question, page context, and
temporary history to the same-origin route. The route:

- requires an exact same-origin browser request and JSON body;
- caps the request at 8 KiB and the normalized question at 500 characters;
- applies defense-in-depth IP and opaque-session rate limits;
- creates a one-hour, HttpOnly, SameSite=Strict session cookie;
- sends the question and opaque session only to the exact configured upstream URL;
- keeps the upstream bearer server-only and refuses credential-bearing redirects;
- validates the complete upstream response and requires its snapshot digest to equal an
  explicitly configured, currently eligible primary or rollback digest;
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

{
  "question":"...",
  "page_context":{"route":"property","property_slug":"buttercup-beauty"},
  "history":[{"role":"visitor","content":"Tell me about Buttercup."}]
}
```

R1's accepted `200` response is strict JSON:

```json
{
  "contract": "lucy.public-answer.v2",
  "outcome": "answered",
  "answer": "Approved public answer.",
  "sources": [{"id":"buttercup","label":"Buttercup Beauty","href":"https://www.utopiahomes.com/stays/buttercup-beauty"}],
  "links": [],
  "version": 2,
  "snapshot_digest": "64-lowercase-hex-characters"
}
```

Cloud Lucy binds the dedicated credential to the Utopia public projection, accepts only
the approved origin/site binding, reads only the currently effective published
projection, and has no private-memory fallback. A knowledge miss is a successful,
honest fallback; an operational failure is a generic `503`. Paid inference remains
disconnected until its provider, privacy controls, and complete cost limits are approved.

## Activation gate

Before setting `LUCY_PUBLIC_ENABLED=true` for R1 in any deployed environment:

1. Finalize and review the effective-dated R1 public corpus and exact digest.
2. Stage and approve the snapshot without activating its route.
3. Install compatible Cloud and website readers with conversation disabled.
4. Under quarantine, apply migration `0057_public_conversation`, reprovision the exact
   execute-only public role, and verify the readers and negative controls.
5. Atomically activate the approved projection, then enable the conversational reader.
6. Create a dedicated website-to-Lucy bearer of at least 32 characters and store it only
   in the corresponding encrypted Vercel and Cloud Lucy environments.
7. Validate the populated activation manifest with paid inference and transcript capture
   both false.
8. Prove missing/wrong bearer, foreign origin, cross-realm selection,
   over-limit requests, snapshot miss, and direct private ingress all fail closed.
9. Obtain separate deployment/activation approval, deploy the exact pinned revisions,
   verify one approved answer through `https://www.utopiahomes.com/api/lucy`, and exercise
   the documented rollback to `LUCY_PUBLIC_ENABLED=false`.

No DNS, Vercel production configuration, Render service, database, or production data
was changed by this website implementation.

## Verification ledger

| Check | Result | Evidence | Invalidated by |
| --- | --- | --- | --- |
| Strict TypeScript and ESLint | Passed 2026-09-12 | Isolated branch based on canonical `c05c1ea`; `tsc --noEmit`, `eslint .` | Code/dependency/config changes |
| Unit and contract tests | Passed 2026-09-12; 22 files, 88 tests | Full Vitest run including bounded/expiring history, page context, R1 response validation, digest pinning, source URL controls, fallbacks, and widget tests | Code/dependency/config changes |
| Production build | Passed 2026-09-12; 27 routes generated | Next.js 16.3.2 Webpack production build with `/api/lucy` dynamic. Webpack was used because Turbopack rejects the isolated worktree's external dependency junction. | Code/dependency/build-environment changes |
| Browser and responsive flow | Passed 2026-09-12; all 22 Playwright scenarios | Lucy enabled with its upstream absent; includes mobile navigation, fail-closed Lucy, context continuity across client navigation, external booking handoff, forms, redirects, and CMS 404s | Widget, route, CSS, layout, Playwright config, or shared site behavior changes |
| Mobile visual inspection | Passed 2026-09-11 | `lucy-mobile.png` in the task visualization directory; local fallback font was used because the dev sandbox could not reach Google Fonts | Widget, CSS, layout, viewport, or font changes |
| Candidate snapshot cross-runtime digest | Passed 2026-09-11 | Website canonicalizer and Cloud Lucy `faq_snapshot`/`snapshot_digest` both produced `6232b5fa0b382346fba692f29e74d2b3fdbcd9a19ee960d2e609fd0b2ce2b99e` for 8 FAQs | Candidate content or either canonicalizer changes |
| Authenticated site-host binding | Passed 2026-09-11 | Full TypeScript, focused ESLint, 8 focused Vitest checks, and a 27-route production build after adding `X-Lucy-Public-Host` | Website proxy, Cloud ingress contract, or environment changes |
| Deployed same-origin success and negative controls | Not yet executed | Requires exact pinned Cloud Lucy endpoint and deployment approval | Any ingress, credential, manifest, release, or environment change |
