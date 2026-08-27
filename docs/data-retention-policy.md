# Utopia Design data-retention policy

Policy version: `2026-08-29.v3`

## Policy classes

| Class                                     | Deadline                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unconverted quote or design lead          | 12 calendar months after the last meaningful customer or authorized-employee activity    |
| De-identified learning record             | Created only after optional consent; contains only the approved generalized fields below |
| Completed-project core record             | 7 years after project completion or the applicable tax-year close, whichever is later    |
| Raw or redundant completed-project upload | 24 calendar months after project completion                                              |
| Separately authorized portfolio material  | The controlling release governs                                                          |
| Legal hold                                | No deletion until an authorized release; the original deadline remains recorded          |

Meaningful activity is a customer or authorized employee materially reopening, changing, converting, or working on a record. Automated emails, email opens, analytics, background jobs, and retention checks do not change `last_meaningful_activity_at` or `retention_due_at`. Learning consent never extends identifiable-data retention.

## Access and deletion states

Only server-side service credentials may access quote, learning, receipt, or worker-run tables. Browser roles have no grants. A due record is claimed with `FOR UPDATE SKIP LOCKED` and moves through `active → pending_deletion → purging`; ordinary application reads must exclude every state except `active` and `legal_hold`. Failures enter `failed_retryable`; a legal hold enters `legal_hold` without discarding the calculated deadline.

Deletion is feature-gated by `RETENTION_DELETION_ENABLED`. It must remain `false` until a production dry-run has been reviewed and explicitly approved. A valid manual deletion request makes the deadline immediate but does not override a legal/accounting hold.

## Permitted learning data

With affirmative, unwithdrawn consent, deletion may produce a new record containing service category, broad market, bucketed area/bedroom/bathroom/budget values, design level, bucketed pricing components, generalized specialty-space categories, and conversion outcome. Rare combinations are suppressed or generalized.

The learning record never contains a quote/customer identifier, name, email, phone, exact address, listing URL, coordinates, IP/device identifier, photograph, floor plan, listing image/content, file path, or free-form customer description. No consent means no learning record.

## Systems and derivatives

The relational adapter deletes the quote, its linked design submission, and the submission notification outbox row via database foreign keys. Interfaces exist for original objects, thumbnails/transforms, OCR, image analysis, generated summaries, AI prompts/responses, search/vector indexes, caches/CDN, CRM, and later third-party processors. A connected adapter must report success before the database record and receipt are finalized. Orphans are failures, never silent successes.

Currently, quote uploads, search/vector stores, a CRM, and third-party lead processors are not connected. Proton notification emails already delivered to a mailbox cannot be recalled automatically; mailbox retention must be managed separately.

## Deletion evidence and restoration

The permanent receipt contains only the salted/one-way record hash, retention class, policy version, scheduled and actual deletion times, systems purged, result/failure code, and legal-hold override. It contains no direct identifiers or reversible customer data.

After any database restoration, keep public traffic disabled, run `retention status` and `retention run`, and replay all surviving deletion receipts before traffic resumes. This prevents restored copies of previously deleted records from becoming available again.

## Monitoring thresholds

Alert when no worker run has completed within 26 hours, a due record remains for 48 hours, any deletion is retryable, the retry limit is reached, backup age exceeds `RETENTION_BACKUP_MAX_DAYS`, or an adapter reports an orphan. Status reports approaching, due, deleted, de-identified, legal-hold, and failed counts. Logs must use hashes/counts and stable failure codes, never PII.
