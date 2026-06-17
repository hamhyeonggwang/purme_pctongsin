-- PC-TONGSIN :: Purme Club signup storage
-- Run this file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.club_signups (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  field text,
  tools jsonb not null default '[]'::jsonb,
  level text,
  pain_point text,
  interests jsonb not null default '[]'::jsonb,
  meeting_style text,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint club_signups_handle_length
    check (char_length(trim(handle)) between 1 and 20),
  constraint club_signups_field_length
    check (field is null or char_length(field) <= 40),
  constraint club_signups_pain_point_length
    check (pain_point is null or char_length(pain_point) <= 500),
  constraint club_signups_message_length
    check (message is null or char_length(message) <= 500),
  constraint club_signups_tools_is_array
    check (jsonb_typeof(tools) = 'array'),
  constraint club_signups_interests_is_array
    check (jsonb_typeof(interests) = 'array')
);

comment on table public.club_signups is
  'PC-TONGSIN join-in form submissions from the static website.';
comment on column public.club_signups.handle is 'Required nickname from question 1.';
comment on column public.club_signups.field is 'Meaningful work or life area from question 2.';
comment on column public.club_signups.tools is 'Selected AI tools from question 3.';
comment on column public.club_signups.level is 'AI usage level from question 4.';
comment on column public.club_signups.pain_point is 'Open-ended AI use case or frustration from question 5.';
comment on column public.club_signups.interests is 'Selected learning interests from question 6.';
comment on column public.club_signups.meeting_style is 'Preferred meeting style from question 7.';
comment on column public.club_signups.message is 'Optional message to organizers from question 8.';

create index if not exists club_signups_created_at_idx
  on public.club_signups (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_club_signups_updated_at on public.club_signups;
create trigger set_club_signups_updated_at
before update on public.club_signups
for each row
execute function public.set_updated_at();

alter table public.club_signups enable row level security;

-- The public website uses the Supabase anon key, so visitors need insert-only access.
-- No select/update/delete policy is created for anon users.
drop policy if exists "Public can submit club signups" on public.club_signups;
create policy "Public can submit club signups"
on public.club_signups
for insert
to anon, authenticated
with check (true);

grant usage on schema public to anon, authenticated;
grant insert on table public.club_signups to anon, authenticated;

-- Optional admin query after setup:
-- select created_at, handle, level, tools, interests, meeting_style
-- from public.club_signups
-- order by created_at desc;
