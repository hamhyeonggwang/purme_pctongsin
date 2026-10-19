-- PC통신 membership migration
-- Non-destructive: preserves public.club_signups and public.game_scores.
-- Apply after restoring the pctongsin Supabase project.

create extension if not exists pgcrypto;

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
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,

  constraint join_requests_name_length
    check (char_length(trim(name)) between 1 and 60),
  constraint join_requests_department_length
    check (char_length(trim(department)) between 1 and 100),
  constraint join_requests_email_length
    check (char_length(trim(email)) between 3 and 254),
  constraint join_requests_email_shape
    check (position('@' in email) > 1 and position('.' in split_part(email, '@', 2)) > 1),
  constraint join_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create unique index if not exists join_requests_active_email_unique
  on public.join_requests (lower(trim(email)))
  where status in ('pending', 'approved');

create index if not exists join_requests_created_at_idx
  on public.join_requests (created_at desc);

create index if not exists join_requests_status_idx
  on public.join_requests (status, created_at desc);

comment on table public.join_requests is
  'Membership requests. A request is reviewed before an Auth account/member row is created.';

alter table public.join_requests enable row level security;

-- Start from deny-by-default for browser roles.
revoke all on table public.join_requests from anon, authenticated;

-- Public visitors may submit only the three application fields.
grant insert (name, department, email)
  on table public.join_requests
  to anon, authenticated;

drop policy if exists "Public can submit pending join requests"
  on public.join_requests;

create policy "Public can submit pending join requests"
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
  updated_at timestamptz not null default now(),

  constraint members_name_length
    check (char_length(trim(name)) between 1 and 60),
  constraint members_department_length
    check (char_length(trim(department)) between 1 and 100),
  constraint members_email_length
    check (char_length(trim(email)) between 3 and 254),
  constraint members_role_check
    check (role in ('member', 'admin')),
  constraint members_status_check
    check (status in ('active', 'suspended'))
);

create unique index if not exists members_email_unique
  on public.members (lower(trim(email)));

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

comment on table public.members is
  'Approved PC통신 members mapped 1:1 to auth.users. role is authoritative for app authorization.';

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

-- Admin create/update/review operations are intentionally NOT granted
-- to browser roles. They should run only from server-side code using a
-- Supabase secret key after an explicit admin authorization check.

-- ---------------------------------------------------------------------------
-- Legacy data
-- ---------------------------------------------------------------------------

comment on table public.club_signups is
  'Legacy PC통신 8-question signup survey. Preserved for historical analysis; not used for new membership requests.';
