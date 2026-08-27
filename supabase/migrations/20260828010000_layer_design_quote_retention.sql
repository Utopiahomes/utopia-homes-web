-- Configurable lifecycle metadata for Utopia Design records.
alter table public.design_quotes
  add column if not exists retention_category text not null default 'unconverted_quote'
    check (retention_category in ('unconverted_quote', 'converted_project', 'completed_project')),
  add column if not exists retention_expires_at timestamptz,
  add column if not exists project_conversion_date timestamptz,
  add column if not exists legal_hold boolean not null default false,
  add column if not exists deleted_or_deidentified_at timestamptz;

update public.design_quotes
set retention_policy_version = '2026-08-27.v2',
    retention_expires_at = coalesce(retention_expires_at, updated_at + interval '12 months')
where retention_category = 'unconverted_quote';

create index if not exists design_quotes_retention_due_idx
  on public.design_quotes (retention_expires_at)
  where legal_hold = false and deleted_or_deidentified_at is null;

comment on table public.design_quotes is 'Server-written Utopia Design estimates with category-based retention, legal-hold, conversion, consent, and de-identification metadata.';
comment on column public.design_quotes.retention_expires_at is 'Lifecycle deadline calculated from configurable policy; legal hold suspends action.';
comment on column public.design_quotes.deleted_or_deidentified_at is 'Timestamp when primary identifiable data was deleted or de-identified; backup expiry is handled by provider lifecycle policy.';
