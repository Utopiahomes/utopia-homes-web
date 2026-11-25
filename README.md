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
- `/list-your-home`, `/membership`, `/about`, `/contact`
- `/design` — canonical Utopia Design marketing and project-intake journey
- `/utopia-interiors` and `/property-enhancement` — permanent compatibility redirects to `/design`
- `/campaigns/[slug]`, `/privacy`, and `/terms`

Production V1 content lives in `/content` and is validated during tests/builds. Pages consume it through `CmsAdapter`, leaving room for a future database or CMS without creating a V1 dependency.

Forms use Vercel-compatible route handlers, attribution capture, rate limiting, and `SubmissionStore`. Deployed environments bind that abstraction to Supabase for durable owner leads, contact requests, membership signups, and Utopia Design inquiries. A transactional outbox in the same database records notification work atomically with each new lead; immediate delivery and a protected daily Vercel Cron safety-net use leases, bounded exponential backoff, and provider idempotency keys. The in-memory stores remain available for local development and deterministic tests only.

Database structure is version-controlled in `supabase/migrations`. Apply migrations in filename order and configure the server-only storage, email, and cron values described in `.env.example` and `docs/deployment.md`.

## Important status

Airbnb/Vrbo are source material only and are never scraped at runtime. Ray has approved the current property names, advertised facts, and photography usage. Review publication rights remain pending, and Airbnb URLs remain temporary until final external booking URLs are supplied.

Wix is not an application dependency. Wix or GoDaddy may remain registrar/DNS providers only. See `docs/architecture.md`, `docs/content-workflow.md`, `docs/email-and-dns.md`, and `docs/deployment.md`.

## Motion

The site moves the way Elementor sites do, set by attributes in the markup; no new scripts needed.
The full reference is at the top of `apps/web/src/lib/motion.ts` and `apps/web/src/lib/scroll-effects.ts`.

- Entrances as an element scrolls into view: `data-anim="fadeInUp"` (any name in
  `styles/animations.css`), `data-anim-delay="316"`, `data-anim-speed="slow|fast"`. The owner can
  override a whole section in the editor's Sections tab or by asking Lucy.
- Sliding row: `data-carousel data-per-view="5" data-per-view-tablet="3" data-per-view-mobile="1"`.
- Scroll effects: `data-scroll="y 4; x -2; fade in-out; blur out; rotate 1; scale in 4"`, with
  `data-scroll-range="20 80"`. Parallax photo: `motion-bg-box` on the section, `<img class="motion-bg"
  data-scroll="y -3">` inside.
- Mouse effects: `data-mouse="track 1; tilt 4"`.
- Sticky: `data-sticky="top"`, `data-sticky-offset`, `data-sticky-effects` (adds class
  `sticky-effects`), `data-sticky-in` to stay inside its box.
- Slideshow and Ken Burns: `data-slideshow="5000" data-kenburns="in"` on a box of photos, or
  `data-kenburns="out"` on one photo.
- `data-on="desktop tablet"` limits scroll, mouse and sticky effects to those devices.

Nothing moves for visitors who ask for reduced motion, and the edit copy shows everything still.
