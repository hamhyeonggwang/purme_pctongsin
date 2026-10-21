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


-- ---------------------------------------------------------------------------
-- AI News
-- ---------------------------------------------------------------------------

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  title text not null,
  summary text,
  source_url text not null,
  image_url text,
  published_at timestamptz not null,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_posts_published_idx
  on public.news_posts (is_published, published_at desc);

create index if not exists news_posts_featured_idx
  on public.news_posts (is_featured, published_at desc);

drop trigger if exists set_news_posts_updated_at on public.news_posts;
create trigger set_news_posts_updated_at
before update on public.news_posts
for each row execute function public.set_updated_at();

alter table public.news_posts enable row level security;

revoke all on table public.news_posts from anon, authenticated;
grant select on table public.news_posts to anon, authenticated;
grant insert, update, delete on table public.news_posts to authenticated;

drop policy if exists "Public can read published news"
  on public.news_posts;
create policy "Public can read published news"
on public.news_posts
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admins can manage news"
  on public.news_posts;
create policy "Admins can manage news"
on public.news_posts
for all
to authenticated
using (public.is_pc_admin())
with check (public.is_pc_admin());

-- Seed the current homepage items once. The source URL is the natural key here.
insert into public.news_posts (
  source_name, title, summary, source_url, image_url,
  published_at, is_featured, is_published
)
select * from (
  values
    (
      'OPENAI / CHATGPT',
      'ChatGPT 안에서 슬라이드를 만들고, 팀과 함께 편집한다',
      '대화에서 초안을 만드는 데서 끝나지 않고 텍스트·이미지·도형·차트를 직접 편집하고, 팀원과 같은 덱에서 협업하는 흐름으로 확장됐습니다.',
      'https://help.openai.com/en/articles/6825453-chatgpt-release-notes',
      'https://learn.chatgpt.com/images/codex/app/artifact-viewer-dark.webp',
      '2026-10-16T00:00:00+09:00'::timestamptz,
      true,
      true
    ),
    (
      'GOOGLE',
      'Gemini 4 Argon, Gemini 앱에서 복잡한 작업과 코딩을 더 깊게 처리',
      null,
      'https://blog.google/innovation-and-ai/products/gemini-app/gemini-4-argon-availability/',
      null,
      '2026-10-13T00:00:00+09:00'::timestamptz,
      false,
      true
    ),
    (
      'MICROSOFT',
      'Copilot in SharePoint, 사이트·목록·문서 작업까지 AI 지원 확대',
      null,
      'https://techcommunity.microsoft.com/blog/spblog/what%E2%80%99s-new-in-copilot-in-sharepoint-october-2026/4535423',
      null,
      '2026-10-10T00:00:00+09:00'::timestamptz,
      false,
      true
    ),
    (
      'ANTHROPIC',
      'Claude Haiku 5.5, 빠르고 반복적인 대량 작업을 위한 소형 모델',
      null,
      'https://www.anthropic.com/claude-haiku-5-5',
      null,
      '2026-10-07T00:00:00+09:00'::timestamptz,
      false,
      true
    ),
    (
      'TOOLS',
      'Gemini Connected Apps, 프로젝트·디자인·일상 도구를 채팅 안으로 연결',
      null,
      'https://blog.google/innovation-and-ai/products/gemini-app/new-connected-apps-gemini/',
      null,
      '2026-09-23T00:00:00+09:00'::timestamptz,
      false,
      true
    )
) as seed (
  source_name, title, summary, source_url, image_url,
  published_at, is_featured, is_published
)
where not exists (
  select 1 from public.news_posts n where n.source_url = seed.source_url
);


-- ---------------------------------------------------------------------------
-- AI News Automation v0.1
-- Source registry -> candidates -> human review -> news_posts
-- ---------------------------------------------------------------------------

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null default 'rss',
  source_url text not null unique,
  domain text not null,
  trust_score integer not null default 90,
  enabled boolean not null default true,
  check_interval_minutes integer not null default 360,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint news_sources_type_check
    check (source_type in ('rss', 'page', 'api')),
  constraint news_sources_trust_check
    check (trust_score between 0 and 100),
  constraint news_sources_interval_check
    check (check_interval_minutes >= 60)
);

drop trigger if exists set_news_sources_updated_at on public.news_sources;
create trigger set_news_sources_updated_at
before update on public.news_sources
for each row execute function public.set_updated_at();

alter table public.news_sources enable row level security;
revoke all on table public.news_sources from anon, authenticated;
grant select, insert, update, delete on table public.news_sources to authenticated;

drop policy if exists "Admins can manage news sources" on public.news_sources;
create policy "Admins can manage news sources"
on public.news_sources
for all
to authenticated
using (public.is_pc_admin())
with check (public.is_pc_admin());

insert into public.news_sources (
  name, source_type, source_url, domain, trust_score, enabled, check_interval_minutes
)
values
  ('OpenAI News', 'rss', 'https://openai.com/news/rss.xml', 'openai.com', 100, true, 360),
  ('Google AI', 'rss', 'https://blog.google/innovation-and-ai/technology/ai/rss/', 'blog.google', 100, true, 360),
  ('Google DeepMind', 'rss', 'https://deepmind.google/blog/rss.xml', 'deepmind.google', 100, true, 360),
  ('GitHub Changelog', 'rss', 'https://github.blog/changelog/feed/', 'github.blog', 95, true, 360),
  ('Anthropic News', 'page', 'https://www.anthropic.com/news', 'anthropic.com', 100, false, 360),
  ('Microsoft AI', 'page', 'https://www.microsoft.com/en-us/ai', 'microsoft.com', 100, false, 360)
on conflict (source_url) do nothing;

create table if not exists public.news_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.news_sources(id) on delete set null,
  source_name text not null,
  source_url text not null,
  canonical_url text,
  original_title text not null,
  original_summary text,
  published_at timestamptz,
  image_url text,
  content_fingerprint text,

  title_ko text,
  summary_ko text,
  why_it_matters text,
  category text,
  relevance_score integer,
  confidence_score integer,
  recommendation text,
  featured_recommended boolean not null default false,

  status text not null default 'discovered',
  duplicate_of uuid references public.news_candidates(id) on delete set null,
  retry_count integer not null default 0,
  error_message text,

  discovered_at timestamptz not null default now(),
  processed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_post_id uuid references public.news_posts(id) on delete set null,
  updated_at timestamptz not null default now(),

  constraint news_candidates_status_check
    check (status in ('discovered','processing','review','published','rejected','duplicate','failed')),
  constraint news_candidates_category_check
    check (category is null or category in ('MODEL','PRODUCT','WORK','AUTOMATION','BUILD','EDUCATION','OTHER')),
  constraint news_candidates_relevance_check
    check (relevance_score is null or relevance_score between 0 and 100),
  constraint news_candidates_confidence_check
    check (confidence_score is null or confidence_score between 0 and 100),
  constraint news_candidates_recommendation_check
    check (recommendation is null or recommendation in ('HIGH','REVIEW','LOW','SKIP')),
  constraint news_candidates_retry_check
    check (retry_count between 0 and 10)
);

create unique index if not exists news_candidates_canonical_url_unique
  on public.news_candidates (canonical_url)
  where canonical_url is not null;

create index if not exists news_candidates_status_score_idx
  on public.news_candidates (status, relevance_score desc, discovered_at desc);

create index if not exists news_candidates_source_idx
  on public.news_candidates (source_id, discovered_at desc);

drop trigger if exists set_news_candidates_updated_at on public.news_candidates;
create trigger set_news_candidates_updated_at
before update on public.news_candidates
for each row execute function public.set_updated_at();

alter table public.news_candidates enable row level security;
revoke all on table public.news_candidates from anon, authenticated;
grant select, update on table public.news_candidates to authenticated;

drop policy if exists "Admins can review news candidates" on public.news_candidates;
create policy "Admins can review news candidates"
on public.news_candidates
for all
to authenticated
using (public.is_pc_admin())
with check (public.is_pc_admin());

create table if not exists public.news_automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source_count integer not null default 0,
  fetched_count integer not null default 0,
  new_count integer not null default 0,
  duplicate_count integer not null default 0,
  processed_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'running',
  error_message text,

  constraint news_automation_runs_status_check
    check (status in ('running','success','partial','failed'))
);

create index if not exists news_automation_runs_started_idx
  on public.news_automation_runs (started_at desc);

alter table public.news_automation_runs enable row level security;
revoke all on table public.news_automation_runs from anon, authenticated;
grant select on table public.news_automation_runs to authenticated;

drop policy if exists "Admins can read news automation runs" on public.news_automation_runs;
create policy "Admins can read news automation runs"
on public.news_automation_runs
for select
to authenticated
using (public.is_pc_admin());

create or replace function public.get_news_candidate_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_pc_admin() then
    raise exception 'not authorized';
  end if;

  return (
    select jsonb_build_object(
      'today', count(*) filter (
        where timezone('Asia/Seoul', discovered_at)::date =
              timezone('Asia/Seoul', now())::date
      ),
      'review', count(*) filter (where status = 'review'),
      'high', count(*) filter (
        where status = 'review'
          and recommendation = 'HIGH'
      ),
      'duplicate', count(*) filter (where status = 'duplicate'),
      'failed', count(*) filter (where status = 'failed')
    )
    from public.news_candidates
  );
end;
$$;

revoke all on function public.get_news_candidate_dashboard() from public;
grant execute on function public.get_news_candidate_dashboard() to authenticated;

create or replace function public.publish_news_candidate(
  p_candidate_id uuid,
  p_featured boolean default false,
  p_title text default null,
  p_summary text default null
)
returns public.news_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate public.news_candidates;
  v_post public.news_posts;
begin
  if not public.is_pc_admin() then
    raise exception 'not authorized';
  end if;

  select *
  into v_candidate
  from public.news_candidates
  where id = p_candidate_id
    and status = 'review';

  if v_candidate.id is null then
    raise exception 'review candidate not found';
  end if;

  if p_featured then
    update public.news_posts
    set is_featured = false
    where is_featured = true;
  end if;

  insert into public.news_posts (
    source_name,
    title,
    summary,
    source_url,
    image_url,
    published_at,
    is_featured,
    is_published,
    created_by
  )
  values (
    v_candidate.source_name,
    coalesce(nullif(trim(p_title), ''), v_candidate.title_ko, v_candidate.original_title),
    coalesce(nullif(trim(p_summary), ''), v_candidate.summary_ko),
    coalesce(v_candidate.canonical_url, v_candidate.source_url),
    v_candidate.image_url,
    coalesce(v_candidate.published_at, now()),
    p_featured,
    true,
    auth.uid()
  )
  returning * into v_post;

  update public.news_candidates
  set
    status = 'published',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    published_post_id = v_post.id,
    error_message = null
  where id = p_candidate_id;

  return v_post;
end;
$$;

revoke all on function public.publish_news_candidate(uuid, boolean, text, text) from public;
grant execute on function public.publish_news_candidate(uuid, boolean, text, text) to authenticated;

create or replace function public.reject_news_candidate(
  p_candidate_id uuid
)
returns public.news_candidates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate public.news_candidates;
begin
  if not public.is_pc_admin() then
    raise exception 'not authorized';
  end if;

  update public.news_candidates
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_candidate_id
    and status = 'review'
  returning * into v_candidate;

  if v_candidate.id is null then
    raise exception 'review candidate not found';
  end if;

  return v_candidate;
end;
$$;

revoke all on function public.reject_news_candidate(uuid) from public;
grant execute on function public.reject_news_candidate(uuid) to authenticated;
