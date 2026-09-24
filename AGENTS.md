# Utopia Homes agent guide

## Purpose and V1 boundaries

Build a premium public hospitality site that supports property discovery, owner acquisition, membership interest, external booking handoff, and Utopia Design lead qualification. Utopia Design V1 includes a versioned preliminary-estimate engine and a gated consultation journey; estimates are nonbinding and are not payments or booking transactions. Do not build or embed booking, payments, owner operational onboarding, guest support, maintenance, PMS, points, token, DAO, or blockchain functionality. Utopia owns the customer experience and data; avoid direct coupling to StayNue implementation details.

Never modify production data, production Wix, production StayNue/Uplisting, UtopiaHomes.com, DNS, or deployment configuration without explicit approval.

## Early-stage delivery default

This is one of Ray's early-stage ventures. Prioritize proving the business and shipping the smallest useful product over extensive prelaunch assurance. Ray's roughly 3/10 initial assurance-effort preference is a tolerance for an early build, not a measured security score.

- Make ordinary implementation choices within the authorized task and finish the main user flow without routine Lyra–Claude approval or review loops. Ask for another review only when Ray requests it or a concrete consequential issue warrants it.
- Use a minimal, targeted check of the changed user flow. Expand testing only for a specific consequential uncertainty or an existing enforced check; do not automatically run `pnpm check`, the full test suite, E2E suite, and build for every change or repeat unchanged reviews.
- Accept rough edges, technical debt, and some edge-case failures while the venture learns. A substantial rebuild in roughly two months is acceptable if real usage warrants it.
- Prefer simple architecture and basic security controls; defer advanced hardening, elaborate recovery ceremonies, speculative scaling, and architectural polish until justified by real use or a concrete failure.
- Report what works, what was actually checked, and significant known limitations without presenting an early build as production-hardened.

This replaces the earlier default of extensive prelaunch assurance, not the explicit production-change boundary above, tool permissions, sandbox controls, or a check actually enforced by the host or CI.

## Commands

- `pnpm install` — install
- `pnpm dev` — local development
- `pnpm typecheck` — strict TypeScript
- `pnpm lint` — lint
- `pnpm test` — unit tests
- `pnpm e2e` — Playwright E2E
- `pnpm build` — production-mode build validation
- `pnpm check` — full non-browser check suite when specifically needed or enforced; not the default for every change

## Architecture

- App Router routes live in `app/`; reusable UI in `components/`.
- Pages consume typed objects from `CmsAdapter`. V1 binds it to validated, version-controlled modules in `/content`; do not import records directly into pages.
- `/design` is the canonical Utopia Design route. `/utopia-interiors` and `/property-enhancement` permanently redirect to it. Marketing content remains version-controlled behind `CmsAdapter` for V1; pricing rules are separately authorized, versioned configuration and must never be coupled to presentation components.
- Wix is not a website application dependency. Wix/GoDaddy may be registrar or DNS providers only. Do not add Wix SDKs, credentials, or runtime data paths for V1.
- Airbnb/Vrbo are source material only. Never scrape them at runtime or silently overwrite curated Utopia copy. Keep source URLs and flag unverified facts and rights.
- External booking URLs are content/config values. Route them through `BookingLink` and emit `outbound_booking_click` with snake_case event names and no sensitive data.
- Forms validate server-side and write through `SubmissionStore`; transactional email goes through `lib/email`. Never expose API/email secrets to client components.
- Use shared CSS design tokens and reusable components. Maintain semantic HTML, keyboard access, visible focus, sufficient contrast, and meaningful image alt text.
- Environment variables are documented in `.env.example`; never commit secret values.

## Definition of done

A scoped early-stage change is complete when its main user flow works under a focused check and significant limitations are reported. Keep relevant content, accessibility, metadata, and mobile/desktop usability in view, but do not require every typecheck, lint, unit, E2E, and build command for every change. Run a wider check only for a concrete consequential uncertainty or an enforced gate. Keep production isolated; record unresolved content questions that matter to the user flow.

## Environment and deployment

GitHub is canonical source control and Vercel is the intended preview/production host. Preview and production variables remain separate. Never deploy, configure a production domain, or modify DNS without explicit approval. Environment variable names—not values—live in `.env.example`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
