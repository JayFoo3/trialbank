-- Practice papers the tutor makes for a student ("make me a 1 hour paper on logs and series, 5 multiple choice"),
-- kept on their account so they can come back to them. Safe to re-run.
create table if not exists public.practice_papers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject      text not null,
  title        text not null check (char_length(title) between 1 and 80),
  mins         int check (mins between 5 and 240),
  reading      int check (reading between 0 and 30),
  question_ids text[] not null check (cardinality(question_ids) between 1 and 80),   -- in paper order: multiple choice first
  marks        int,
  topics       text[] not null default '{}',
  source       text not null default 'tutor',   -- tutor | admin
  created_at   timestamptz not null default now()
);
create index if not exists practice_papers_user on public.practice_papers (user_id, created_at desc);
alter table public.practice_papers enable row level security;
drop policy if exists "own papers read" on public.practice_papers;
create policy "own papers read" on public.practice_papers for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own papers add" on public.practice_papers;
create policy "own papers add" on public.practice_papers for insert to authenticated
  with check (auth.uid() = user_id and source = 'tutor'
    and (select count(*) from public.practice_papers p where p.user_id = auth.uid()) < 30);   -- 30 kept per student: delete one to make room
drop policy if exists "own papers delete" on public.practice_papers;
create policy "own papers delete" on public.practice_papers for delete to authenticated using (auth.uid() = user_id);
grant select, insert, delete on public.practice_papers to authenticated;

-- The questions a paper can be built from: printable, with a solution or answer, on one of the chosen topics only.
-- Runs as the student (security invoker), so Free accounts only get questions from the papers they can see.
create or replace function public.paper_pool_topics(subj text, tps text[])
returns table(id text, topic text, level smallint, type text, marks int, skills text[])
language sql stable security invoker set search_path = public as $$
  select q.id, q.topic, q.level, q.type, coalesce(q.marks, 1)::int, q.skills
  from questions q join papers p on p.id = q.paper_id
  where p.subject = subj and q.topic = any(tps) and coalesce(q.marks, 1) <= 6 and q.syllabus_note is null
    and coalesce(cardinality(q.topics), 1) <= 1          -- no questions that also need another topic
    and q.image_path is not null and q.content is null and not coalesce(q.coarse, false)
    and ((q.type = 'mcq' and q.answer is not null) or (q.type <> 'mcq' and q.solution_path is not null))
  order by random() limit 1000;
$$;
revoke execute on function public.paper_pool_topics(text, text[]) from public, anon;
grant execute on function public.paper_pool_topics(text, text[]) to authenticated;
select 'practice papers ready' as status;
