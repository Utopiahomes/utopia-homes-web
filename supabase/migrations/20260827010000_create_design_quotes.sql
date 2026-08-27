-- Versioned preliminary Utopia Design estimates. Browser roles receive no table access.
create table if not exists public.design_quotes (
  id uuid primary key,
  quote_number text not null unique,
  status text not null check (status in ('generated', 'acknowledged', 'consultation_scheduled', 'under_designer_review', 'revised', 'converted', 'declined', 'expired', 'abandoned', 'completed')),
  audience text not null check (audience in ('rental', 'personal')),
  service_id text not null check (service_id in ('rental_readiness_audit', 'room_design_plan', 'whole_home_design_plan', 'renovation_design_plan', 'turnkey_furnishing')),
  rule_set_version text not null,
  input_snapshot jsonb not null,
  line_items jsonb not null,
  raw_total numeric(12,2) not null check (raw_total >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  total integer not null check (total >= 0),
  assumptions jsonb not null,
  exclusions jsonb not null,
  manual_review_reasons jsonb not null default '[]'::jsonb,
  internal_pricing_review jsonb,
  completeness_score integer not null check (completeness_score between 0 and 100),
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  reopen_token_hash text not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  disclaimer_version text,
  acknowledged_at timestamptz,
  retention_policy_version text not null default '2026-08-27.v1',
  model_improvement_consent boolean not null default false,
  model_improvement_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists design_quotes_status_created_idx on public.design_quotes (status, created_at desc);
create unique index if not exists design_quotes_reopen_token_hash_unique on public.design_quotes (reopen_token_hash);
alter table public.design_quotes enable row level security;
revoke all on table public.design_quotes from anon, authenticated;
grant select, insert, update on table public.design_quotes to service_role;
comment on table public.design_quotes is 'Server-written, versioned, nonbinding Utopia Design estimates retained indefinitely; customer-approved model-improvement use is tracked separately.';
comment on column public.design_quotes.model_improvement_consent is 'Affirmative, optional consent for de-identified project information to improve future Utopia tools and models.';
