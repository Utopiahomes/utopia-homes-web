# Private GitHub and Vercel preview procedure

No step in this document has been executed. The production domain and DNS remain out of scope.

## 1. Create the private GitHub repository

1. Sign in to GitHub under Ray's chosen personal account or organization.
2. Create a new repository named `utopia-homes-web` and select **Private**.
3. Do not initialize it with a README, license, or `.gitignore`; those files already exist locally.
4. Copy the repository's HTTPS URL.

## 2. Initialize and push the local project

From the project directory, review `git status` and the files ignored by `.gitignore`, then run:

```powershell
git init
git branch -M main
git add .
git status
git commit -m "Prepare Utopia Homes V1 preview"
git remote add origin https://github.com/OWNER/utopia-homes-web.git
git push -u origin main
```

Before committing, confirm that no `.env` file, `.vercel` directory, private key, report, build output, or dependency directory appears in `git status`. Enable GitHub secret scanning and branch protection for `main`; prevent force pushes.

## 3. Connect the private repository to Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Connect the appropriate GitHub account or organization with access limited to the private Utopia repository where practical.
3. Import `utopia-homes-web`.
4. Accept the detected Next.js framework, install command, build command, and output settings.
5. Deploy from `main` to obtain the temporary `*.vercel.app` URL. Do not add `UtopiaHomes.com`.

## 4. Minimum preview environment values

Set these for the **Preview** environment only:

- `NEXT_PUBLIC_SITE_URL` — the assigned `https://<project>.vercel.app` URL after the first deployment; redeploy once set.
- `NEXT_PUBLIC_ANALYTICS_PROVIDER=console`
- `SUBMISSION_STORE=supabase`
- `SUPABASE_URL` — the intended preview Supabase project URL
- `SUPABASE_SECRET_KEY` — the server-only `sb_secret_...` key for that project
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `UTOPIA_NOTIFICATION_EMAIL`, and `UTOPIA_OWNERS_EMAIL`
- `NOTIFICATION_EMAIL_ENABLED=true`
- `CRON_SECRET` — generate a random value of at least 16 characters; never expose it to client code

Never prefix the Supabase secret with `NEXT_PUBLIC_`. The application does not use a browser-side Supabase client and does not require a publishable/anonymous key.

### Supabase schema setup

1. Create the Supabase project with the Data API enabled, automatic exposure of new tables disabled, and automatic RLS enabled.
2. Open **SQL Editor → New query** in that project.
3. Apply the migration files in filename order. For an existing project that already has `public.submissions`, run only the new `supabase/migrations/20260824123000_create_notification_outbox.sql`. Confirm `public.notification_outbox` appears and the `submissions_enqueue_notification` trigger exists.
4. In **Project Settings → API Keys**, create or copy a secret key beginning with `sb_secret_`.
5. Store the URL and secret key in `.env.local` for local integration testing and in Vercel's encrypted environment settings for the intended environment.
6. Submit one controlled test of each form and verify matching rows in both `public.submissions` and `public.notification_outbox` before enabling real traffic.

The schema can alternatively be applied with the Supabase CLI after a user authenticates locally and links project reference `tudciphdjrbwxhrrfobi`. Do not commit the database password, access token, `.env.local`, or secret key. GitHub-to-Supabase automatic production migration deployment remains intentionally disabled until the manual workflow is verified.

Forms require configured Supabase storage in preview. Notification delivery additionally requires the server-only Resend/recipient values, `NOTIFICATION_EMAIL_ENABLED`, and `CRON_SECRET`; `SEND_CONFIRMATION_EMAILS` remains optional. Never expose these as `NEXT_PUBLIC_*` values. `vercel.json` schedules `/api/cron/notifications` once daily at 12:00 UTC, within Vercel Hobby limits. After deployment, verify the job under **Vercel project → Settings → Cron Jobs** and inspect invocation logs. The worker is installed only on production deployments; preview form submissions still receive the immediate attempt, and their pending jobs can be exercised manually with the protected endpoint if needed.

## 5. Preview privacy and acceptance

Vercel supplies `VERCEL_ENV=preview` automatically. The application responds with `noindex`, `nofollow`, and a crawler-wide `Disallow: /` outside Vercel production. For stronger privacy, enable Vercel Deployment Protection and restrict preview access to invited team members.

Review routes, responsive layouts, forms, metadata, accessibility, and external booking links on the temporary URL. Production environment values must remain separate from preview values.

## Explicitly deferred production step

Do not add `UtopiaHomes.com` to Vercel, change nameservers, edit Wix or GoDaddy DNS, or remove existing hosting. Those actions require a later, separately approved cutover plan with rollback.
