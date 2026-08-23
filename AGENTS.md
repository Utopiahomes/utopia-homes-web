# Utopia Homes agent guide

## Purpose and V1 boundaries

Build a premium public hospitality site that supports property discovery, owner acquisition, membership interest, and external booking handoff. Do not build or embed booking, payments, owner operational onboarding, guest support, maintenance, pricing, PMS, points, token, DAO, or blockchain functionality. Utopia owns the customer experience and data; avoid direct coupling to StayNue implementation details.

Never modify production data, production Wix, production StayNue/Uplisting, UtopiaHomes.com, DNS, or deployment configuration without explicit approval.

## Commands

- `pnpm install` — install
- `pnpm dev` — local development
- `pnpm typecheck` — strict TypeScript
- `pnpm lint` — lint
- `pnpm test` — unit tests
- `pnpm e2e` — Playwright E2E
- `pnpm build` — production-mode build validation
- `pnpm check` — full non-browser check suite

## Architecture

- App Router routes live in `app/`; reusable UI in `components/`.
- Pages consume typed objects from `CmsAdapter`. V1 binds it to validated, version-controlled modules in `/content`; do not import records directly into pages.
- Wix is not a website application dependency. Wix/GoDaddy may be registrar or DNS providers only. Do not add Wix SDKs, credentials, or runtime data paths for V1.
- Airbnb/Vrbo are source material only. Never scrape them at runtime or silently overwrite curated Utopia copy. Keep source URLs and flag unverified facts and rights.
- External booking URLs are content/config values. Route them through `BookingLink` and emit `outbound_booking_click` with snake_case event names and no sensitive data.
- Forms validate server-side and write through `SubmissionStore`; transactional email goes through `lib/email`. Never expose API/email secrets to client components.
- Use shared CSS design tokens and reusable components. Maintain semantic HTML, keyboard access, visible focus, sufficient contrast, and meaningful image alt text.
- Environment variables are documented in `.env.example`; never commit secret values.

## Definition of done

A scoped change is complete when relevant content is structured, mobile and desktop layouts work, accessibility is preserved, metadata is appropriate, and typecheck, lint, unit tests, relevant E2E tests, and build pass. Keep production isolated and document assumptions or unresolved content questions.

## Environment and deployment

GitHub is canonical source control and Vercel is the intended preview/production host. Preview and production variables remain separate. Never deploy, configure a production domain, or modify DNS without explicit approval. Environment variable names—not values—live in `.env.example`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
