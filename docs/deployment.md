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

Forms can be UI-tested without email credentials. To test real preview email delivery, additionally configure server-only `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `UTOPIA_NOTIFICATION_EMAIL`, `UTOPIA_OWNERS_EMAIL`, and optionally `SEND_CONFIRMATION_EMAILS`. Never expose these as `NEXT_PUBLIC_*` values.

## 5. Preview privacy and acceptance

Vercel supplies `VERCEL_ENV=preview` automatically. The application responds with `noindex`, `nofollow`, and a crawler-wide `Disallow: /` outside Vercel production. For stronger privacy, enable Vercel Deployment Protection and restrict preview access to invited team members.

Review routes, responsive layouts, forms, metadata, accessibility, and external booking links on the temporary URL. Production environment values must remain separate from preview values.

## Explicitly deferred production step

Do not add `UtopiaHomes.com` to Vercel, change nameservers, edit Wix or GoDaddy DNS, or remove existing hosting. Those actions require a later, separately approved cutover plan with rollback.
