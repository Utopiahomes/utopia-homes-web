# Utopia Homes V1 architecture

## Decision

The V1 website is code-first and has no Wix application dependency.

- **Application:** Next.js App Router + strict TypeScript
- **Source control:** private GitHub repository as the canonical source
- **Hosting:** Vercel preview and production projects
- **Content:** validated, version-controlled modules in `/content`
- **Forms:** Vercel-compatible route handlers, provider-neutral submission and email interfaces, and durable Supabase storage
- **Transactional email:** Resend-compatible HTTPS provider; server-only credentials
- **Booking:** configured external links to the approved StayNue/Uplisting environment
- **Domain:** Wix or GoDaddy may remain registrar/DNS provider only

Pages depend on `CmsAdapter`, not file paths. V1 binds that contract to `repositoryCms`. A future CMS or database can implement the same contract without rewriting pages.

Forms validate untrusted input on the server, rate-limit requests, retain attribution, and write through `SubmissionStore`. Deployed environments select the Supabase adapter. Its secret credential remains server-only, while fixture stores are limited to local/test fallback. The database uses a partial unique index to deduplicate membership emails safely under concurrent requests.

An `AFTER INSERT` database trigger creates one `notification_outbox` row in the same transaction as every new submission. The application attempts that notification immediately after persistence. A protected Vercel Cron route claims due work in atomic, leased batches every five minutes. Resend receives the stable key `submission-notification/<notification-id>`; successful sends record provider ID and `sent_at`, while failures retain a sanitized error and use five-minute exponential backoff capped at six hours. Six failed attempts move the item to `dead`. A failed notification never rolls back or deletes its submission, and one item cannot stop the rest of a batch.

## Environment separation

- **Local:** repository content; `SUBMISSION_STORE=memory` by default, or an explicitly configured non-production Supabase project; notification work remains pending when email credentials are absent.
- **Preview:** repository content from the preview branch; Supabase submission storage, separate preview environment variables, and an approved test/preview email recipient.
- **Production:** protected main branch, a separately configured production Supabase project/key, production transactional sender/recipient variables, and final external booking URLs.

No production or preview environment may scrape Airbnb or Vrbo at runtime.
