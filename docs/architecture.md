# Utopia Homes V1 architecture

## Decision

The V1 website is code-first and has no Wix application dependency.

- **Application:** Next.js App Router + strict TypeScript
- **Source control:** private GitHub repository as the canonical source
- **Hosting:** Vercel preview and production projects
- **Content:** validated, version-controlled modules in `/content`
- **Forms:** Vercel-compatible route handlers, provider-neutral submission and email interfaces
- **Transactional email:** Resend-compatible HTTPS provider; server-only credentials
- **Booking:** configured external links to the approved StayNue/Uplisting environment
- **Domain:** Wix or GoDaddy may remain registrar/DNS provider only

Pages depend on `CmsAdapter`, not file paths. V1 binds that contract to `repositoryCms`. A future CMS or database can implement the same contract without rewriting pages.

Forms validate untrusted input on the server, rate-limit requests, retain attribution, write through `SubmissionStore`, and notify Utopia through the email layer. V1 does not require persistent form storage; a future Supabase/Postgres adapter can replace the store binding.

## Environment separation

- **Local:** repository content, in-memory submissions, email skipped when credentials are absent.
- **Preview:** repository content from the preview branch; separate preview environment variables and an approved test/preview recipient.
- **Production:** protected main branch, production transactional sender/recipient variables, and final external booking URLs.

No production or preview environment may scrape Airbnb or Vrbo at runtime.
