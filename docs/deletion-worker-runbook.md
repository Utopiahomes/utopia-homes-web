# Deletion worker runbook

## Deployment sequence

1. Apply `20260829010000_quote_qualification_and_retention_worker.sql` to the intended Supabase project.
2. Set `RETENTION_DELETION_ENABLED=false`, `RETENTION_BATCH_SIZE=25`, `RETENTION_MAX_ATTEMPTS=5`, and `RETENTION_BACKUP_MAX_DAYS=35` in the production Vercel environment. Keep `CRON_SECRET` server-only.
3. Deploy. Vercel calls `/api/cron/maintenance` daily at 12:00 UTC. The route retries notification email and then runs retention in dry-run mode.
4. Run `pnpm retention:dry-run` against the production origin. The output contains only hashed references, classes, due dates, and consent flags. Compare candidates to an authorized database review.
5. Record the reviewed result below. Do not enable deletion until Ray explicitly approves the candidate set and every active-system adapter.
6. After approval, set `RETENTION_DELETION_ENABLED=true`, redeploy, execute one small batch, inspect receipts and status, then permit the daily schedule to continue.

## Controls

Set `RETENTION_ADMIN_ORIGIN`, `CRON_SECRET`, and `RETENTION_OPERATOR` in the operator shell. IDs are accepted by the command but never written to logs.

```text
pnpm retention:dry-run
pnpm retention:status
pnpm retention:run
pnpm retention:retry-failures
pnpm retention:delete-record -- <uuid>
pnpm retention:place-legal-hold -- <uuid> <reason>
pnpm retention:release-legal-hold -- <uuid>
```

`retention:run` returns HTTP 409 while deletion is disabled. A legal-hold reason and operator name are restricted administrative metadata and must not contain unnecessary personal information.

## Failure response

- `ORPHANED_DERIVATIVE`: locate the adapter’s object/index using its private mapping, purge it, then retry. Do not put the path in application logs.
- `PURGE_FAILED`: inspect the provider’s restricted audit trail, restore adapter availability, then retry.
- Retry-limit reached: keep the record inaccessible, alert an operator, and require manual resolution.
- Worker stale for 26 hours or a record due for 48 hours: verify Vercel cron invocation, `CRON_SECRET`, Supabase connectivity, and `retention_worker_runs` before rerunning.

The worker is idempotent: claimed rows use row locks, adapters must tolerate an already-missing derivative, receipts use a hashed primary key, and the database finalizer treats an existing receipt as complete.

## Backup and log configuration

Supabase’s official backup documentation is <https://supabase.com/docs/guides/platform/backups>. In **Database → Backups**, verify the project’s automated recovery window. Current managed choices are daily backups (7 days on Pro, 14 on Team, up to 30 on Enterprise) or PITR at 7, 14, or 28 days. Supabase does not currently offer the recommended 35-day managed PITR window, so select **28 days** if PITR is enabled; do not create indefinite manual snapshots. Database backups do not contain Storage objects.

Supabase Storage is not used for Quote Studio uploads in this release. Before enabling uploads, configure a private bucket and an automatic lifecycle/version-deletion policy of no more than 35 days for deleted and noncurrent objects; do not launch uploads until that policy and its adapter are tested. The database backup guide explicitly notes that database restore does not restore deleted Storage objects.

Vercel’s current runtime-log limits are documented at <https://vercel.com/docs/logs/runtime>: Hobby 1 hour, Pro 1 day, Pro with Observability Plus 30 days, Enterprise 3 days, or 30 days with Observability Plus. The present project’s native retention is therefore already below 35 days. Do not add a Log Drain containing customer payloads. Build logs may live longer, so builds and scripts must never print form payloads or secrets.

No search/vector store, object backup, file backup, or automated manual-export pipeline is active. If one is added, it must have encrypted, access-restricted automatic expiry at 35 days or less and a tested purge adapter. Manual database exports are prohibited as standing archives; an authorized disaster-recovery export must have an owner and automatic deletion date no later than 35 days.

Backups are disaster-recovery tools, not the seven-year project archive. Deletion receipts must be copied to a restoration-surviving restricted ledger. After restore: block public traffic, restore the ledger, replay deletions, verify status, then reopen traffic.

## Initial production dry-run report

Executed: **2026-08-27 19:49 EDT** against the production Utopia Homes Supabase project after applying the forward-only migration. Reviewed commit: `199bf79` plus the Supabase `extensions.digest` compatibility correction included in the final pushed commit. Mode: `dry_run`.

| Measure | Result |
| --- | ---: |
| Candidate records | 0 |
| Due records | 0 |
| Approaching expiration | 0 |
| Consent-eligible candidates | 0 |
| Legal holds | 0 |
| Failed/retry-limit records | 0 |
| Deleted records | 0 |
| De-identified records | 0 |

No record identifiers or customer information were returned. Real deletion remained disabled. The first scheduled application run should be checked after deployment to establish `last_completed_at`.

## Systems not yet automatically purgeable

- Supabase Storage objects and derivatives: no Quote Studio uploads exist yet; adapter is intentionally `not_connected`.
- Search/vector indexes and AI prompt stores: not connected.
- CRM or third-party lead processors: not connected.
- Proton mailbox copies of delivered notifications: cannot be recalled by this application.
- CDN copies: no customer uploads are currently published; future storage adapter must implement invalidation.
