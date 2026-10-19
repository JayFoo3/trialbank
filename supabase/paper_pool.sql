-- Custom practice papers: a random sample of printable questions (with an image, and a solution or MCQ answer), up to 5 marks. Safe to re-run.
-- Runs as the student (security invoker), so Free accounts only get questions from the papers they can see.
create or replace function public.paper_pool(subj text) returns table(id text, topic text, level smallint, type text, marks int)
language sql stable security invoker set search_path = public as $$
  select q.id, q.topic, q.level, q.type, coalesce(q.marks, 1)::int
  from questions q join papers p on p.id = q.paper_id
  where p.subject = subj and coalesce(q.marks, 1) <= 5 and q.syllabus_note is null and q.topic is not null
    and q.image_path is not null and q.content is null
    and ((q.type = 'mcq' and q.answer is not null) or (q.type <> 'mcq' and q.solution_path is not null))
  order by random() limit 1500;
$$;
revoke execute on function public.paper_pool(text) from public, anon;
grant execute on function public.paper_pool(text) to authenticated;
select 'paper pool ready' as status;
