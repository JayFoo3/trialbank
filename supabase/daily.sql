-- Daily 5 with spaced repetition (Albert's idea). Safe to re-run.
-- 1. an estimated difficulty 1-5 for every question: how far into its section it sits, nudged by the paper's difficulty and big marks
alter table public.questions add column if not exists level smallint;
create or replace function public.refresh_levels() returns int language sql security definer as $$
  with pos as (
    select q.id, q.type, q.marks, p.difficulty,
           percent_rank() over (partition by q.paper_id, (q.type = 'mcq') order by q.number, q.part) as pr
    from public.questions q join public.papers p on p.id = q.paper_id)
  , upd as (
    update public.questions q set level = greatest(1, least(5, 1 + floor(pos.pr * 4.999)::int
        + case pos.difficulty when 'Easier' then -1 when 'Hard' then 1 else 0 end
        + case when pos.type <> 'mcq' and coalesce(pos.marks, 0) >= 4 then 1 else 0 end))
    from pos where pos.id = q.id and q.level is distinct from greatest(1, least(5, 1 + floor(pos.pr * 4.999)::int
        + case pos.difficulty when 'Easier' then -1 when 'Hard' then 1 else 0 end
        + case when pos.type <> 'mcq' and coalesce(pos.marks, 0) >= 4 then 1 else 0 end))
    returning 1)
  select count(*)::int from upd;
$$;
revoke execute on function public.refresh_levels() from public, anon, authenticated;
select public.refresh_levels() as levels_set;
create index if not exists questions_topic_level on public.questions (topic, level);

-- 2. where each student is on each topic: the difficulty they're at, a Leitner box, and when it's next due
create table if not exists public.topic_srs (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic   text not null,
  level   smallint not null default 1,
  box     smallint not null default 0,
  due     date not null default current_date,
  right_n int not null default 0,
  wrong_n int not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, subject, topic)
);
alter table public.topic_srs enable row level security;
drop policy if exists "own srs" on public.topic_srs;
create policy "own srs" on public.topic_srs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. each day's 5 per subject, so it stays the same all day and can be resumed
create table if not exists public.daily_sets (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  day     date not null,
  question_ids text[] not null,
  kinds   text[] not null default '{}',       -- 'redo' | 'review' | 'new' per question
  answered text[] not null default '{}',
  score   int not null default 0,
  out_of  int not null default 0,
  finished_at timestamptz,
  created_at timestamptz default now(),
  primary key (user_id, subject, day)
);
alter table public.daily_sets enable row level security;
drop policy if exists "own daily" on public.daily_sets;
create policy "own daily" on public.daily_sets for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
select 'daily ready' as status;

-- 4. new questions get a level as soon as they're uploaded
create or replace function public.levels_after_insert() returns trigger language plpgsql security definer as $$
begin perform public.refresh_levels(); return null; end $$;
drop trigger if exists questions_levels on public.questions;
create trigger questions_levels after insert or update of number, part, marks, type on public.questions for each statement execute function public.levels_after_insert();
