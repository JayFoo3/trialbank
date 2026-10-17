-- Trialbank v2: starred questions, exam history, paper summary view. Safe to re-run.
create table if not exists public.bookmarks (
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, question_id)
);
alter table public.bookmarks enable row level security;
drop policy if exists "own bookmarks" on public.bookmarks;
create policy "own bookmarks" on public.bookmarks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.exams (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  paper_id     int  not null references public.papers(id) on delete cascade,
  started_at   timestamptz not null,
  seconds_used int,
  score        int,
  out_of       int,
  work_minutes int,
  created_at   timestamptz default now()
);
create index if not exists exams_user on public.exams (user_id, started_at desc);
alter table public.exams enable row level security;
drop policy if exists "own exams" on public.exams;
create policy "own exams" on public.exams for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.paper_summary as
  select paper_id,
         count(*)                                         as n_questions,
         coalesce(sum(marks), 0)                          as total_marks,
         count(*) filter (where coalesce(coarse, false))  as n_coarse,
         count(*) filter (where image_path is not null)   as n_images
  from public.questions group by paper_id;
grant select on public.paper_summary to authenticated;

select count(*) as papers_ready from public.paper_summary where n_images >= 0.9 * n_questions and n_coarse <= 0.1 * n_questions and n_questions >= 10;
