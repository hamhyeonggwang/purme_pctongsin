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


-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  code text not null unique,
  title text not null,
  project_type text not null,
  status text not null default 'recruiting',
  capacity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projects_status_check
    check (status in ('recruiting', 'active', 'completed', 'paused')),
  constraint projects_capacity_check
    check (capacity is null or capacity > 0)
);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

insert into public.projects (slug, code, title, project_type, status, capacity)
values
  ('real-ai', 'PROJECT 001', '진짜 쓰는 AI', 'team', 'recruiting', 6),
  ('solo-ai', 'PROJECT 002', '1인 AI 미션', 'solo', 'recruiting', null)
on conflict (slug) do update
set
  code = excluded.code,
  title = excluded.title,
  project_type = excluded.project_type,
  capacity = excluded.capacity;

alter table public.projects enable row level security;
revoke all on table public.projects from anon, authenticated;
grant select on table public.projects to anon, authenticated;

drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects"
on public.projects
for select
to anon, authenticated
using (true);

-- ---------------------------------------------------------------------------
-- Project applications
-- ---------------------------------------------------------------------------

create table if not exists public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,

  constraint project_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint project_applications_unique_member
    unique (project_id, user_id)
);

create index if not exists project_applications_status_idx
  on public.project_applications (status, created_at desc);

create index if not exists project_applications_user_idx
  on public.project_applications (user_id, created_at desc);

alter table public.project_applications enable row level security;
revoke all on table public.project_applications from anon, authenticated;
grant select, insert on table public.project_applications to authenticated;

drop policy if exists "Members can read own project applications"
  on public.project_applications;
create policy "Members can read own project applications"
on public.project_applications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Active members can apply to recruiting projects"
  on public.project_applications;
create policy "Active members can apply to recruiting projects"
on public.project_applications
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
  )
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.status = 'recruiting'
  )
);

-- Public project cards: aggregate counts only.
create or replace function public.get_open_projects()
returns table (
  id uuid,
  slug text,
  code text,
  title text,
  project_type text,
  status text,
  capacity integer,
  approved_count bigint,
  pending_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.slug,
    p.code,
    p.title,
    p.project_type,
    p.status,
    p.capacity,
    count(pa.id) filter (where pa.status = 'approved') as approved_count,
    count(pa.id) filter (where pa.status = 'pending') as pending_count
  from public.projects p
  left join public.project_applications pa on pa.project_id = p.id
  where p.status in ('recruiting', 'active')
  group by p.id
  order by p.code;
$$;

revoke all on function public.get_open_projects() from public;
grant execute on function public.get_open_projects() to anon, authenticated;

-- Admin project application list. Applicant PII is admin-only.
create or replace function public.get_admin_project_applications(
  p_status text default 'pending'
)
returns table (
  id uuid,
  project_id uuid,
  project_code text,
  project_title text,
  applicant_name text,
  applicant_department text,
  applicant_email text,
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
    pa.id,
    pa.project_id,
    p.code,
    p.title,
    m.name,
    m.department,
    m.email,
    pa.status,
    pa.created_at,
    pa.reviewed_at
  from public.project_applications pa
  join public.projects p on p.id = pa.project_id
  join public.members m on m.user_id = pa.user_id
  where p_status is null or pa.status = p_status
  order by
    case when pa.status = 'pending' then 0 else 1 end,
    pa.created_at desc;
end;
$$;

revoke all on function public.get_admin_project_applications(text) from public;
grant execute on function public.get_admin_project_applications(text) to authenticated;

-- Admin approval / rejection with capacity check.
create or replace function public.review_project_application(
  p_application_id uuid,
  p_decision text
)
returns public.project_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.project_applications;
  v_capacity integer;
  v_approved bigint;
begin
  if not public.is_pc_admin() then
    raise exception 'not authorized';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  select pa.*
  into v_application
  from public.project_applications pa
  where pa.id = p_application_id
    and pa.status = 'pending';

  if v_application.id is null then
    raise exception 'pending application not found';
  end if;

  select p.capacity
  into v_capacity
  from public.projects p
  where p.id = v_application.project_id;

  if p_decision = 'approved' and v_capacity is not null then
    select count(*)
    into v_approved
    from public.project_applications
    where project_id = v_application.project_id
      and status = 'approved';

    if v_approved >= v_capacity then
      raise exception 'project capacity reached';
    end if;
  end if;

  update public.project_applications
  set
    status = p_decision,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

revoke all on function public.review_project_application(uuid, text) from public;
grant execute on function public.review_project_application(uuid, text) to authenticated;


-- ---------------------------------------------------------------------------
-- Member project application RPC
-- Server-side validation for membership, recruiting state, capacity and duplicate.
-- ---------------------------------------------------------------------------

create or replace function public.apply_to_project(
  p_project_id uuid
)
returns public.project_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects;
  v_application public.project_applications;
  v_approved bigint;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
  ) then
    raise exception 'active membership required';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'project not found';
  end if;

  if v_project.status <> 'recruiting' then
    raise exception 'project is not recruiting';
  end if;

  if exists (
    select 1
    from public.project_applications pa
    where pa.project_id = p_project_id
      and pa.user_id = auth.uid()
  ) then
    raise exception 'application already exists';
  end if;

  if v_project.capacity is not null then
    select count(*)
    into v_approved
    from public.project_applications
    where project_id = p_project_id
      and status = 'approved';

    if v_approved >= v_project.capacity then
      raise exception 'project capacity reached';
    end if;
  end if;

  insert into public.project_applications (
    project_id,
    user_id,
    status
  )
  values (
    p_project_id,
    auth.uid(),
    'pending'
  )
  returning * into v_application;

  return v_application;
end;
$$;

revoke all on function public.apply_to_project(uuid) from public;
grant execute on function public.apply_to_project(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- Member Archive
-- ---------------------------------------------------------------------------

create table if not exists public.archive_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text,
  file_name text not null,
  object_path text not null unique,
  mime_type text,
  file_size bigint,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint archive_items_category_check
    check (category in ('start', 'work', 'automate', 'build', 'learn', 'club'))
);

create index if not exists archive_items_category_idx
  on public.archive_items (category, created_at desc);

drop trigger if exists set_archive_items_updated_at on public.archive_items;
create trigger set_archive_items_updated_at
before update on public.archive_items
for each row execute function public.set_updated_at();

alter table public.archive_items enable row level security;

revoke all on table public.archive_items from anon, authenticated;
grant select, insert, update, delete on table public.archive_items to authenticated;

drop policy if exists "Active members can read published archive items"
  on public.archive_items;
create policy "Active members can read published archive items"
on public.archive_items
for select
to authenticated
using (
  is_published = true
  and exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "Admins can manage archive items"
  on public.archive_items;
create policy "Admins can manage archive items"
on public.archive_items
for all
to authenticated
using (public.is_pc_admin())
with check (public.is_pc_admin());

insert into storage.buckets (id, name, public)
values ('member-archive', 'member-archive', false)
on conflict (id) do update
set public = false;

drop policy if exists "Active members can read archive files"
  on storage.objects;
create policy "Active members can read archive files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-archive'
  and exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "Admins can upload archive files"
  on storage.objects;
create policy "Admins can upload archive files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-archive'
  and public.is_pc_admin()
);

drop policy if exists "Admins can update archive files"
  on storage.objects;
create policy "Admins can update archive files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-archive'
  and public.is_pc_admin()
)
with check (
  bucket_id = 'member-archive'
  and public.is_pc_admin()
);

drop policy if exists "Admins can delete archive files"
  on storage.objects;
create policy "Admins can delete archive files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-archive'
  and public.is_pc_admin()
);
