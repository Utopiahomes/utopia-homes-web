-- Quote qualification plus the server-only retention control plane.
create extension if not exists pgcrypto;

alter table public.design_quotes
  alter column total type numeric(12,2) using total::numeric,
  add column if not exists quote_classification text not null default 'planning_estimate'
    check (quote_classification in ('planning_estimate', 'qualified_preliminary_estimate')),
  add column if not exists quote_acknowledged_at timestamptz,
  add column if not exists calendar_eligible boolean not null default false,
  add column if not exists calendar_eligibility_reason text not null default 'Estimate has not been acknowledged.',
  add column if not exists retention_class text not null default 'unconverted_quote'
    check (retention_class in ('unconverted_quote', 'design_lead', 'completed_project_core', 'completed_project_upload', 'portfolio_material')),
  add column if not exists last_meaningful_activity_at timestamptz,
  add column if not exists retention_due_at timestamptz,
  add column if not exists learning_consent_at timestamptz,
  add column if not exists learning_consent_withdrawn_at timestamptz,
  add column if not exists legal_hold_at timestamptz,
  add column if not exists legal_hold_reason text,
  add column if not exists legal_hold_created_by text,
  add column if not exists deletion_status text not null default 'active'
    check (deletion_status in ('active', 'pending_deletion', 'purging', 'deleted', 'failed_retryable', 'legal_hold')),
  add column if not exists deletion_started_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deletion_attempt_count integer not null default 0,
  add column if not exists last_deletion_error text;

update public.design_quotes
set quote_acknowledged_at = acknowledged_at,
    last_meaningful_activity_at = coalesce(last_meaningful_activity_at, updated_at, generated_at),
    retention_due_at = coalesce(retention_due_at, retention_expires_at, updated_at + interval '12 months'),
    learning_consent_at = case when model_improvement_consent then coalesce(model_improvement_consent_at, acknowledged_at) end,
    retention_policy_version = '2026-08-29.v3';

alter table public.submissions
  add column if not exists source_quote_id uuid references public.design_quotes(id) on delete cascade;
create unique index if not exists submissions_source_quote_unique
  on public.submissions(source_quote_id) where source_quote_id is not null;

create table if not exists public.design_quote_learning_records (
  id uuid primary key default gen_random_uuid(),
  service_category text not null,
  broad_market text,
  square_footage_bucket text,
  bedroom_bucket text,
  bathroom_bucket text,
  budget_bucket text,
  design_level text,
  pricing_components jsonb not null default '[]'::jsonb,
  specialty_space_categories jsonb not null default '[]'::jsonb,
  conversion_outcome text,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deletion_receipts (
  hashed_record_reference text primary key,
  retention_class text not null,
  policy_version text not null,
  scheduled_deletion_at timestamptz not null,
  actual_deletion_at timestamptz not null,
  systems_purged jsonb not null,
  result text not null check (result in ('deleted', 'failed')),
  failure_code text,
  legal_hold_override boolean
);

create table if not exists public.retention_worker_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('dry_run', 'delete')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  candidates integer not null default 0,
  deleted integer not null default 0,
  deidentified integer not null default 0,
  failed integer not null default 0
);

create index if not exists design_quotes_retention_worker_idx
  on public.design_quotes(retention_due_at, deletion_status)
  where legal_hold_at is null and deletion_status in ('active', 'failed_retryable');

alter table public.design_quote_learning_records enable row level security;
alter table public.deletion_receipts enable row level security;
alter table public.retention_worker_runs enable row level security;
revoke all on public.design_quote_learning_records, public.deletion_receipts, public.retention_worker_runs from anon, authenticated;
grant select, insert on public.design_quote_learning_records, public.deletion_receipts, public.retention_worker_runs to service_role;
grant update on public.retention_worker_runs to service_role;

create or replace function public.claim_retention_batch(p_limit integer, p_dry_run boolean default true, p_max_attempts integer default 5)
returns table(record_id uuid, record_hash text, retention_class text, retention_due_at timestamptz, learning_allowed boolean)
language plpgsql security definer set search_path = public as $$
begin
  if p_dry_run then
    return query
      select q.id, encode(extensions.digest(q.id::text, 'sha256'), 'hex'), q.retention_class, q.retention_due_at,
        q.learning_consent_at is not null and q.learning_consent_withdrawn_at is null
      from public.design_quotes q
      where q.retention_due_at <= now() and q.legal_hold_at is null
        and q.deletion_status in ('active', 'failed_retryable') and q.deletion_attempt_count < greatest(1, p_max_attempts)
      order by q.retention_due_at asc limit greatest(1, least(p_limit, 100));
    return;
  end if;
  return query
    with claimed as (
      select q.id from public.design_quotes q
      where q.retention_due_at <= now() and q.legal_hold_at is null
        and q.deletion_status in ('active', 'failed_retryable') and q.deletion_attempt_count < greatest(1, p_max_attempts)
      order by q.retention_due_at asc
      for update skip locked limit greatest(1, least(p_limit, 100))
    ), updated as (
      update public.design_quotes q set deletion_status = 'pending_deletion', deletion_started_at = coalesce(q.deletion_started_at, now()),
        deletion_attempt_count = q.deletion_attempt_count + 1, updated_at = now()
      from claimed where q.id = claimed.id
      returning q.*
    )
    select u.id, encode(extensions.digest(u.id::text, 'sha256'), 'hex'), u.retention_class, u.retention_due_at,
      u.learning_consent_at is not null and u.learning_consent_withdrawn_at is null from updated u;
end $$;

create or replace function public.retention_status()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'approaching_expiration', count(*) filter (where retention_due_at > now() and retention_due_at <= now() + interval '30 days'),
    'due', count(*) filter (where retention_due_at <= now() and deletion_status not in ('deleted','legal_hold')),
    'deleted', (select count(*) from public.deletion_receipts where result = 'deleted'),
    'deidentified', (select count(*) from public.design_quote_learning_records),
    'legal_hold', count(*) filter (where legal_hold_at is not null),
    'failed', count(*) filter (where deletion_status = 'failed_retryable'),
    'retry_limit_reached', count(*) filter (where deletion_status = 'failed_retryable' and deletion_attempt_count >= 5),
    'overdue_48h', count(*) filter (where retention_due_at <= now() - interval '48 hours' and deletion_status not in ('deleted','legal_hold')),
    'last_completed_at', (select max(completed_at) from public.retention_worker_runs)
  ) from public.design_quotes;
$$;

create or replace function public.record_retention_worker_run(p_mode text, p_candidates integer, p_deleted integer, p_deidentified integer, p_failed integer)
returns void language sql security definer set search_path = public as $$
  insert into public.retention_worker_runs(mode, completed_at, candidates, deleted, deidentified, failed)
  values(case when p_mode = 'delete' then 'delete' else 'dry_run' end, now(), greatest(p_candidates,0), greatest(p_deleted,0), greatest(p_deidentified,0), greatest(p_failed,0));
$$;

create or replace function public.place_design_quote_legal_hold(p_id uuid, p_reason text, p_created_by text)
returns void language sql security definer set search_path = public as $$
  update public.design_quotes set legal_hold_at = now(), legal_hold = true, legal_hold_reason = left(p_reason, 500),
    legal_hold_created_by = left(p_created_by, 200), deletion_status = 'legal_hold', updated_at = now() where id = p_id;
$$;
create or replace function public.release_design_quote_legal_hold(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.design_quotes set legal_hold_at = null, legal_hold = false, legal_hold_reason = null,
    legal_hold_created_by = null, deletion_status = 'active', updated_at = now() where id = p_id;
$$;
create or replace function public.request_design_quote_deletion(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.design_quotes set retention_due_at = now(), deletion_status = 'active', updated_at = now()
  where id = p_id and legal_hold_at is null;
$$;

create or replace function public.complete_design_quote_retention(p_id uuid, p_systems_purged jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare q public.design_quotes%rowtype; h text;
begin
  select * into q from public.design_quotes where id = p_id and deletion_status in ('pending_deletion','purging') for update;
  if not found then return exists(select 1 from public.deletion_receipts where hashed_record_reference = encode(extensions.digest(p_id::text, 'sha256'), 'hex')); end if;
  if q.legal_hold_at is not null then return false; end if;
  h := encode(extensions.digest(q.id::text, 'sha256'), 'hex');
  if q.learning_consent_at is not null and q.learning_consent_withdrawn_at is null then
    insert into public.design_quote_learning_records(service_category, square_footage_bucket, bedroom_bucket, bathroom_bucket,
      budget_bucket, design_level, pricing_components, specialty_space_categories, conversion_outcome, policy_version)
    values (
      q.service_id,
      case when (q.input_snapshot#>>'{property,livingArea}')::numeric < 1000 then '<1000'
           when (q.input_snapshot#>>'{property,livingArea}')::numeric < 2000 then '1000-1999'
           when (q.input_snapshot#>>'{property,livingArea}')::numeric < 3500 then '2000-3499' else '3500+' end,
      case when (q.input_snapshot#>>'{property,bedrooms}')::numeric <= 2 then '0-2' when (q.input_snapshot#>>'{property,bedrooms}')::numeric <= 4 then '3-4' else '5+' end,
      case when (q.input_snapshot#>>'{property,bathrooms}')::numeric <= 2 then '0-2' when (q.input_snapshot#>>'{property,bathrooms}')::numeric <= 4 then '2.5-4' else '4.5+' end,
      case when coalesce((q.input_snapshot#>>'{scope,declaredConstructionBudget}')::numeric,0) = 0 then 'not_supplied'
           when (q.input_snapshot#>>'{scope,declaredConstructionBudget}')::numeric < 50000 then '<50k'
           when (q.input_snapshot#>>'{scope,declaredConstructionBudget}')::numeric < 150000 then '50k-149k' else '150k+' end,
      coalesce(q.input_snapshot#>>'{scope,designLevel}', q.input_snapshot->>'grade'),
      (select coalesce(jsonb_agg(jsonb_build_object('code', x->>'code', 'amount_bucket',
        case when (x->>'amount')::numeric < 1000 then '<1000' when (x->>'amount')::numeric < 5000 then '1000-4999' else '5000+' end)), '[]'::jsonb)
       from jsonb_array_elements(q.line_items) x),
      case when jsonb_array_length(coalesce(q.input_snapshot#>'{scope,specialtySpaceSelections}','[]'::jsonb)) between 1 and 3
        then q.input_snapshot#>'{scope,specialtySpaceSelections}' else '[]'::jsonb end,
      case when q.status in ('converted','completed') then 'converted' else 'unconverted' end,
      q.retention_policy_version
    );
  end if;
  insert into public.deletion_receipts(hashed_record_reference, retention_class, policy_version, scheduled_deletion_at,
    actual_deletion_at, systems_purged, result, legal_hold_override)
  values(h, q.retention_class, q.retention_policy_version, q.retention_due_at, now(), p_systems_purged, 'deleted', false)
  on conflict (hashed_record_reference) do nothing;
  delete from public.design_quotes where id = p_id;
  return true;
end $$;

create or replace function public.fail_design_quote_retention(p_id uuid, p_failure_code text, p_max_attempts integer)
returns void language sql security definer set search_path = public as $$
  update public.design_quotes set deletion_status = 'failed_retryable',
    last_deletion_error = left(regexp_replace(p_failure_code, '[^A-Z0-9_:-]', '', 'g'), 100), updated_at = now()
  where id = p_id and legal_hold_at is null;
$$;

revoke all on function public.claim_retention_batch(integer, boolean, integer), public.retention_status(),
  public.place_design_quote_legal_hold(uuid,text,text), public.release_design_quote_legal_hold(uuid),
  public.request_design_quote_deletion(uuid), public.complete_design_quote_retention(uuid,jsonb),
  public.fail_design_quote_retention(uuid,text,integer), public.record_retention_worker_run(text,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.claim_retention_batch(integer, boolean, integer), public.retention_status(),
  public.place_design_quote_legal_hold(uuid,text,text), public.release_design_quote_legal_hold(uuid),
  public.request_design_quote_deletion(uuid), public.complete_design_quote_retention(uuid,jsonb),
  public.fail_design_quote_retention(uuid,text,integer), public.record_retention_worker_run(text,integer,integer,integer,integer) to service_role;
