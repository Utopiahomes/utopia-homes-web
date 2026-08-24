# Utopia Homes web

Code-first Utopia Homes V1 public site using Next.js App Router, strict TypeScript, validated repository content, provider-neutral submission/email boundaries, external booking handoff, and a complete route framework.

## Run locally

1. Install dependencies: `pnpm install`
2. Start development: `pnpm dev`
3. Open `http://localhost:3000`

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and (after browser installation) `pnpm e2e`.

## Current routes

- `/` — brand homepage and featured property
- `/stays` — active properties from structured content
- `/stays/buttercup-beauty`, `/stays/central-ave-socialization`, `/stays/the-shamrock` — dynamic launch-property pages
- `/destinations` and `/destinations/[slug]`
- `/list-your-home`, `/utopia-interiors`, `/membership`, `/about`, `/contact`
- `/property-enhancement` — permanent compatibility redirect to `/utopia-interiors`
- `/campaigns/[slug]`, `/privacy`, and `/terms`

Production V1 content lives in `/content` and is validated during tests/builds. Pages consume it through `CmsAdapter`, leaving room for a future database or CMS without creating a V1 dependency.

Forms use Vercel-compatible route handlers, attribution capture, rate limiting, and `SubmissionStore`. Deployed environments bind that abstraction to Supabase for durable owner leads, contact requests, membership signups, and Utopia Interiors inquiries. The in-memory store remains available for local development and deterministic tests only. Email notifications continue through the independent server-side email layer.

Database structure is version-controlled in `supabase/migrations`. To use durable storage, apply the migrations to the intended Supabase project and configure the server-only `SUBMISSION_STORE`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` values described in `.env.example` and `docs/deployment.md`.

## Important status

Airbnb/Vrbo are source material only and are never scraped at runtime. Ray has approved the current property names, advertised facts, and photography usage. Review publication rights remain pending, and Airbnb URLs remain temporary until final external booking URLs are supplied.

Wix is not an application dependency. Wix or GoDaddy may remain registrar/DNS providers only. See `docs/architecture.md`, `docs/content-workflow.md`, `docs/email-and-dns.md`, and `docs/deployment.md`.
