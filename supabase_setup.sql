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

-- Arcade high score storage -------------------------------------------------

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  nickname text not null,
  score integer not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint game_scores_game_id_check
    check (game_id in ('pacman', 'tetris', 'galaga', 'arkanoid')),
  constraint game_scores_nickname_check
    check (nickname ~ '^[A-Z0-9]{3}$'),
  constraint game_scores_score_check
    check (score >= 0),
  constraint game_scores_meta_is_object
    check (jsonb_typeof(meta) = 'object')
);

comment on table public.game_scores is
  'PC-TONGSIN arcade high scores, kept to top 10 rows per game.';
comment on column public.game_scores.game_id is 'Game identifier: pacman, tetris, galaga, or arkanoid.';
comment on column public.game_scores.nickname is 'Three-character arcade nickname.';
comment on column public.game_scores.score is 'Final score submitted by the browser.';
comment on column public.game_scores.meta is 'Optional game metadata such as level, lines, wave, or stage.';

create index if not exists game_scores_leaderboard_idx
  on public.game_scores (game_id, score desc, created_at asc);

create or replace function public.prune_game_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.game_scores as stale
  where stale.game_id = new.game_id
    and stale.id not in (
      select kept.id
      from public.game_scores as kept
      where kept.game_id = new.game_id
      order by kept.score desc, kept.created_at asc
      limit 10
    );

  return new;
end;
$$;

drop trigger if exists prune_game_scores_after_insert on public.game_scores;
create trigger prune_game_scores_after_insert
after insert on public.game_scores
for each row
execute function public.prune_game_scores();

create or replace function public.get_game_leaderboard(
  p_game_id text,
  p_limit integer default 10
)
returns table (
  rank bigint,
  nickname text,
  score integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by gs.score desc, gs.created_at asc) as rank,
    gs.nickname,
    gs.score,
    gs.created_at
  from public.game_scores as gs
  where gs.game_id = p_game_id
  order by gs.score desc, gs.created_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 10);
$$;

alter table public.game_scores enable row level security;

drop policy if exists "Public can submit game scores" on public.game_scores;
create policy "Public can submit game scores"
on public.game_scores
for insert
to anon, authenticated
with check (true);

grant insert on table public.game_scores to anon, authenticated;
grant execute on function public.get_game_leaderboard(text, integer) to anon, authenticated;

-- Anonymous signup dashboard ------------------------------------------------

create or replace function public.get_signup_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select *
    from public.club_signups
  ),
  tool_items as (
    select value #>> '{}' as item
    from base, jsonb_array_elements(base.tools)
  ),
  interest_items as (
    select value #>> '{}' as item
    from base, jsonb_array_elements(base.interests)
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'levels', coalesce((
      select jsonb_object_agg(coalesce(level, '미응답'), cnt)
      from (
        select level, count(*) as cnt
        from base
        group by level
        order by count(*) desc
      ) as rows
    ), '{}'::jsonb),
    'meeting_styles', coalesce((
      select jsonb_object_agg(coalesce(meeting_style, '미응답'), cnt)
      from (
        select meeting_style, count(*) as cnt
        from base
        group by meeting_style
        order by count(*) desc
      ) as rows
    ), '{}'::jsonb),
    'tools', coalesce((
      select jsonb_object_agg(item, cnt)
      from (
        select item, count(*) as cnt
        from tool_items
        where item is not null and item <> ''
        group by item
        order by count(*) desc
        limit 8
      ) as rows
    ), '{}'::jsonb),
    'interests', coalesce((
      select jsonb_object_agg(item, cnt)
      from (
        select item, count(*) as cnt
        from interest_items
        where item is not null and item <> ''
        group by item
        order by count(*) desc
        limit 8
      ) as rows
    ), '{}'::jsonb)
  );
$$;

grant execute on function public.get_signup_dashboard() to anon, authenticated;

-- Optional admin query after setup:
-- select created_at, handle, level, tools, interests, meeting_style
-- from public.club_signups
-- order by created_at desc;
--
-- select * from public.get_game_leaderboard('pacman', 10);
-- select public.get_signup_dashboard();
