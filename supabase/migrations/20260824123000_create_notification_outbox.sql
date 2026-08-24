-- Durable transactional-email outbox for Utopia Homes form notifications.
-- The insert trigger creates the outbox row in the same transaction as each lead.

create table if not exists public.notification_outbox (
  id uuid primary key,
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  kind text not null check (kind in ('owner-lead', 'contact', 'membership', 'design-inquiry')),
  recipient text,
  status text not null default 'pending' check (status in ('pending', 'failed', 'sent', 'dead')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  locked_until timestamptz,
  lease_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_outbox_due_idx
  on public.notification_outbox (next_attempt_at, created_at)
  where status in ('pending', 'failed');

alter table public.notification_outbox enable row level security;
revoke all on table public.notification_outbox from anon, authenticated;
grant select, insert, update on table public.notification_outbox to service_role;

create or replace function public.enqueue_submission_notification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.notification_outbox (id, submission_id, kind)
  values (new.id, new.id, new.kind)
  on conflict (submission_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.enqueue_submission_notification() from public, anon, authenticated;
grant execute on function public.enqueue_submission_notification() to service_role;

drop trigger if exists submissions_enqueue_notification on public.submissions;
create trigger submissions_enqueue_notification
after insert on public.submissions
for each row execute function public.enqueue_submission_notification();

create or replace function public.claim_notification_outbox(p_id uuid, p_lease_seconds integer default 300)
returns table (
  id uuid,
  submission_id uuid,
  kind text,
  status text,
  attempt_count integer,
  lease_token uuid,
  submission jsonb
)
language sql
security invoker
set search_path = ''
as $$
  with claimed as (
    update public.notification_outbox as n
    set attempt_count = n.attempt_count + 1,
        last_attempt_at = now(),
        locked_until = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 900))),
        lease_token = gen_random_uuid(),
        updated_at = now()
    where n.id = p_id
      and n.status in ('pending', 'failed')
      and n.next_attempt_at <= now()
      and (n.locked_until is null or n.locked_until <= now())
    returning n.*
  )
  select c.id, c.submission_id, c.kind, c.status, c.attempt_count, c.lease_token, to_jsonb(s)
  from claimed as c
  join public.submissions as s on s.id = c.submission_id;
$$;

create or replace function public.claim_notification_outbox_batch(p_limit integer default 20, p_lease_seconds integer default 300)
returns table (
  id uuid,
  submission_id uuid,
  kind text,
  status text,
  attempt_count integer,
  lease_token uuid,
  submission jsonb
)
language sql
security invoker
set search_path = ''
as $$
  with candidates as (
    select n.id
    from public.notification_outbox as n
    where n.status in ('pending', 'failed')
      and n.next_attempt_at <= now()
      and (n.locked_until is null or n.locked_until <= now())
    order by n.next_attempt_at, n.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  ), claimed as (
    update public.notification_outbox as n
    set attempt_count = n.attempt_count + 1,
        last_attempt_at = now(),
        locked_until = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 900))),
        lease_token = gen_random_uuid(),
        updated_at = now()
    from candidates as c
    where n.id = c.id
    returning n.*
  )
  select c.id, c.submission_id, c.kind, c.status, c.attempt_count, c.lease_token, to_jsonb(s)
  from claimed as c
  join public.submissions as s on s.id = c.submission_id;
$$;

create or replace function public.complete_notification_sent(
  p_id uuid,
  p_lease_token uuid,
  p_provider_message_id text,
  p_recipient text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.notification_outbox as n
  set status = 'sent', sent_at = now(), provider_message_id = p_provider_message_id,
      recipient = p_recipient, last_error = null, locked_until = null, lease_token = null,
      updated_at = now()
  where n.id = p_id and n.lease_token = p_lease_token and n.status in ('pending', 'failed');
  return found;
end;
$$;

create or replace function public.complete_notification_failed(
  p_id uuid,
  p_lease_token uuid,
  p_error text,
  p_recipient text,
  p_max_attempts integer default 6
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  update public.notification_outbox as n
  set status = case when n.attempt_count >= greatest(1, p_max_attempts) then 'dead' else 'failed' end,
      next_attempt_at = now() + make_interval(secs => least(21600, (300 * power(2, greatest(0, n.attempt_count - 1)))::integer)),
      recipient = p_recipient,
      last_error = left(coalesce(p_error, 'Unknown notification error'), 500),
      locked_until = null,
      lease_token = null,
      updated_at = now()
  where n.id = p_id and n.lease_token = p_lease_token and n.status in ('pending', 'failed')
  returning n.status into v_status;
  return v_status;
end;
$$;

revoke execute on function public.claim_notification_outbox(uuid, integer) from public, anon, authenticated;
revoke execute on function public.claim_notification_outbox_batch(integer, integer) from public, anon, authenticated;
revoke execute on function public.complete_notification_sent(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.complete_notification_failed(uuid, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(uuid, integer) to service_role;
grant execute on function public.claim_notification_outbox_batch(integer, integer) to service_role;
grant execute on function public.complete_notification_sent(uuid, uuid, text, text) to service_role;
grant execute on function public.complete_notification_failed(uuid, uuid, text, text, integer) to service_role;

comment on table public.notification_outbox is
  'Server-only durable outbox for retryable internal form notification emails.';
