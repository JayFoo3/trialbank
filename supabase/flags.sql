-- Question flags: students (or the tutor) report a broken question: cropped wrong, question text missing, options not visible,
-- wrong answer or solution. One flag per student per question per reason. Admins see and resolve them. Safe to re-run.
create table if not exists public.question_flags (
  id bigserial primary key,
  question_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('crop', 'missing', 'options', 'answer', 'solution', 'other')),
  note text check (char_length(note) <= 300),
  source text not null default 'student' check (source in ('student', 'tutor')),
  resolved_at timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists question_flags_once on public.question_flags (question_id, user_id, reason, source) where resolved_at is null;
create index if not exists question_flags_open on public.question_flags (created_at desc) where resolved_at is null;
alter table public.question_flags enable row level security;
drop policy if exists "flag a question" on public.question_flags;
create policy "flag a question" on public.question_flags for insert to authenticated with check (auth.uid() = user_id and source = 'student');
drop policy if exists "own flags" on public.question_flags;
create policy "own flags" on public.question_flags for select to authenticated using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admins resolve flags" on public.question_flags;
create policy "admins resolve flags" on public.question_flags for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin list: open flags grouped by question, with where it came from
create or replace function public.admin_flags()
returns table (question_id text, reasons text[], notes text[], students bigint, tutor boolean, first_at timestamptz, last_at timestamptz,
               school text, year int, subject text, number int, part text, image_path text)
language sql stable security definer set search_path = public as $$
  select f.question_id, array_agg(distinct f.reason), array_remove(array_agg(distinct f.note), null),
         count(distinct f.user_id) filter (where f.source = 'student'), bool_or(f.source = 'tutor'), min(f.created_at), max(f.created_at),
         p.school, p.year::int, p.subject, q.number::int, q.part, q.image_path
  from question_flags f left join questions q on q.id = f.question_id left join papers p on p.id = q.paper_id
  where f.resolved_at is null and public.is_admin()
  group by f.question_id, p.school, p.year, p.subject, q.number, q.part, q.image_path
  order by count(distinct f.user_id) desc, max(f.created_at) desc
  limit 200;
$$;
grant execute on function public.admin_flags() to authenticated;

create or replace function public.admin_resolve_flags(qid text)
returns void language sql security definer set search_path = public as $$
  update question_flags set resolved_at = now() where question_id = qid and resolved_at is null and public.is_admin();
$$;
grant execute on function public.admin_resolve_flags(text) to authenticated;
select 'flags ready' as status;
