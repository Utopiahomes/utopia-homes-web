# Utopia Homes V1 architecture

## Decision

The V1 website is code-first and has no Wix application dependency.

- **Application:** Next.js App Router + strict TypeScript
- **Source control:** private GitHub repository as the canonical source
- **Hosting:** Vercel preview and production projects
- **Content:** validated, version-controlled modules in `/content`
- **Forms:** Vercel-compatible route handlers, provider-neutral submission and email interfaces, and durable Supabase storage
- **Transactional email:** provider-neutral `EmailProvider` with Proton SMTP active for V1 and the Resend HTTPS adapter retained but inactive; authenticated server-only sender and centralized `LEAD_NOTIFICATION_EMAIL` recipient
- **Booking:** configured external links to the approved StayNue/Uplisting environment
- **Domain:** Wix or GoDaddy may remain registrar/DNS provider only

Pages depend on `CmsAdapter`, not file paths. V1 binds that contract to `repositoryCms`. A future CMS or database can implement the same contract without rewriting pages.

Forms validate untrusted input on the server, rate-limit requests, retain attribution, and write through `SubmissionStore`. Deployed environments select the Supabase adapter. Its secret credential remains server-only, while fixture stores are limited to local/test fallback. The database uses a partial unique index to deduplicate membership emails safely under concurrent requests.

An `AFTER INSERT` database trigger creates one `notification_outbox` row in the same transaction as every new submission. The application attempts that notification immediately after persistence. A protected Vercel Cron route claims due work in atomic, leased batches once daily at 12:00 UTC, which is compatible with Vercel Hobby; a future Pro deployment can increase that frequency without changing the worker. The provider is selected centrally with `EMAIL_PROVIDER`; Proton SMTP is active for V1, while Resend remains substitutable. Successful sends record the provider message ID and `sent_at`, while failures retain a sanitized error and use bounded exponential backoff. Six failed attempts move the item to `dead`. A failed notification never rolls back or deletes its submission, and one item cannot stop the rest of a batch.

## Environment separation

- **Local:** repository content; `SUBMISSION_STORE=memory` by default, or an explicitly configured non-production Supabase project; notification work remains pending when email credentials are absent.
- **Preview:** repository content from the preview branch; Supabase submission storage, separate preview environment variables, and an approved test/preview email recipient.
- **Production:** protected main branch, a separately configured production Supabase project/key, production transactional sender/recipient variables, and final external booking URLs.

No production or preview environment may scrape Airbnb or Vrbo at runtime.

## Public Lucy isolation

Public Lucy is disabled by default and has no browser-visible provider or Cloud Lucy
credential. The website proxy accepts a bounded question, establishes an opaque HttpOnly
session, applies defense-in-depth rate limits, and sends no raw IP address or page/form
context upstream. It does not store or log message content. Cloud Lucy remains the
authoritative public-projection, tenant-binding, and distributed-admission boundary;
private memory, transcript capture, tools, and paid inference are outside this website
route. The exact contract and activation gate are recorded in
`docs/lucy-public-integration.md`.
