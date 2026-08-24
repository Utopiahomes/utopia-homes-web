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

Forms validate untrusted input on the server, rate-limit requests, retain attribution, write through `SubmissionStore`, and notify Utopia through the email layer. Deployed environments select the Supabase adapter. Its secret credential remains server-only, while the fixture store is limited to explicit local/test fallback. The database migration enables RLS, grants no browser-role access, and uses a partial unique index to deduplicate normalized membership email addresses safely under concurrent requests.

## Environment separation

- **Local:** repository content; `SUBMISSION_STORE=memory` by default, or an explicitly configured non-production Supabase project; email skipped when credentials are absent.
- **Preview:** repository content from the preview branch; Supabase submission storage, separate preview environment variables, and an approved test/preview email recipient.
- **Production:** protected main branch, a separately configured production Supabase project/key, production transactional sender/recipient variables, and final external booking URLs.

No production or preview environment may scrape Airbnb or Vrbo at runtime.
