-- PC통신 membership schema + aggregate dashboard + review RPC
-- Safe to re-run. Existing join_requests rows are preserved.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Join requests
-- ---------------------------------------------------------------------------

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.join_requests
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table public.join_requests
  alter column status set default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'join_requests_status_check'
      and conrelid = 'public.join_requests'::regclass
  ) then
    alter table public.join_requests
      add constraint join_requests_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end;
$$;

create unique index if not exists join_requests_active_email_unique
  on public.join_requests (lower(trim(email)))
  where status in ('pending', 'approved');

create index if not exists join_requests_created_at_idx
  on public.join_requests (created_at desc);

create index if not exists join_requests_status_idx
  on public.join_requests (status, created_at desc);

drop trigger if exists set_join_requests_updated_at on public.join_requests;
create trigger set_join_requests_updated_at
before update on public.join_requests
for each row
execute function public.set_updated_at();

alter table public.join_requests enable row level security;

revoke all on table public.join_requests from anon, authenticated;

grant insert (name, department, email)
  on table public.join_requests
  to anon, authenticated;

drop policy if exists "Public can submit join requests"
  on public.join_requests;
drop policy if exists "Public can submit pending join requests"
  on public.join_requests;

create policy "Public can submit join requests"
on public.join_requests
for insert
to anon, authenticated
with check (
  status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
);

-- ---------------------------------------------------------------------------
-- Approved members
-- ---------------------------------------------------------------------------

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  department text not null,
  email text not null,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'members_role_check'
      and conrelid = 'public.members'::regclass
  ) then
    alter table public.members
      add constraint members_role_check
      check (role in ('member', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'members_status_check'
      and conrelid = 'public.members'::regclass
  ) then
    alter table public.members
      add constraint members_status_check
      check (status in ('active', 'suspended'));
  end if;
end;
$$;

create unique index if not exists members_email_unique
  on public.members (lower(trim(email)));

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

alter table public.members enable row level security;

revoke all on table public.members from anon, authenticated;
grant select on table public.members to authenticated;

drop policy if exists "Members can read their own profile"
  on public.members;

create policy "Members can read their own profile"
on public.members
for select
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Public aggregate dashboard
-- Returns counts only. No name/email/department values leave the database.
-- ---------------------------------------------------------------------------

create or replace function public.get_membership_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'approved', count(*) filter (where status = 'approved'),
    'rejected', count(*) filter (where status = 'rejected'),
    'last_7_days', count(*) filter (where created_at >= now() - interval '7 days'),
    'this_month', count(*) filter (
      where created_at >= date_trunc('month', now())
    )
  )
  from public.join_requests;
$$;

revoke all on function public.get_membership_dashboard() from public;
grant execute on function public.get_membership_dashboard() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin authorization + review RPC
-- This updates the request status only. Auth user invitation is a separate
-- server-side step and should use a Supabase secret key / Admin API.
-- ---------------------------------------------------------------------------

create or replace function public.is_pc_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

revoke all on function public.is_pc_admin() from public;
grant execute on function public.is_pc_admin() to authenticated;

create or replace function public.review_join_request(
  p_request_id uuid,
  p_decision text
)
returns public.join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.join_requests;
begin
  if not public.is_pc_admin() then
    raise exception 'not authorized';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  update public.join_requests
  set
    status = p_decision,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_request_id
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'pending request not found';
  end if;

  return v_request;
end;
$$;

revoke all on function public.review_join_request(uuid, text) from public;
grant execute on function public.review_join_request(uuid, text) to authenticated;

comment on function public.get_membership_dashboard() is
  'Public aggregate-only membership dashboard. Never returns applicant PII.';

comment on function public.review_join_request(uuid, text) is
  'Admin-only review transition for pending membership requests.';


-- Admin-only join request listing
create or replace function public.get_admin_join_requests(
  p_status text default null
)
returns table (
  id uuid,
  name text,
  department text,
  email text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_pc_admin() then
    raise exception 'not authorized';
  end if;

  if p_status is not null
     and p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  return query
  select
    jr.id,
    jr.name,
    jr.department,
    jr.email,
    jr.status,
    jr.created_at,
    jr.reviewed_at
  from public.join_requests jr
  where p_status is null or jr.status = p_status
  order by
    case when jr.status = 'pending' then 0 else 1 end,
    jr.created_at desc;
end;
$$;

revoke all on function public.get_admin_join_requests(text) from public;
grant execute on function public.get_admin_join_requests(text) to authenticated;
