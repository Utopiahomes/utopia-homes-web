-- Durable storage for the four Utopia Homes V1 public forms.
-- Browser roles receive no table access; writes use the server-only secret key.

create table if not exists public.submissions (
  id uuid primary key,
  kind text not null check (kind in ('owner-lead', 'contact', 'membership', 'design-inquiry')),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'closed', 'spam')),
  name text not null,
  email text not null check (email = lower(email)),
  consent boolean not null,

  phone text,
  property_address text,
  city_state text,
  property_type text,
  bedrooms integer,
  current_rental_status text,
  listing_url text,
  notes text,

  zip text,
  travel_interests text,

  inquiry_type text,
  message text,
  project_type text,

  source text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text
);

create unique index if not exists submissions_membership_email_unique
  on public.submissions (email)
  where kind = 'membership';

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

create index if not exists submissions_kind_status_idx
  on public.submissions (kind, status, created_at desc);

alter table public.submissions enable row level security;

revoke all on table public.submissions from anon, authenticated;
grant select, insert, update on table public.submissions to service_role;

comment on table public.submissions is
  'Server-written owner leads, contact requests, membership signups, and Utopia Interiors inquiries.';
