-- Daily 5: a random sample of the questions a student can see in one subject, in one round trip. Safe to re-run.
-- Runs as the student (security invoker), so Free accounts only get questions from the free papers.
create or replace function public.daily_pool(subj text) returns table(id text, topic text, level smallint, type text, marks int)
language sql stable security invoker set search_path = public as $$
  select q.id, q.topic, q.level, q.type, q.marks::int
  from questions q join papers p on p.id = q.paper_id
  where p.subject = subj and coalesce(q.marks, 1) <= 3 and q.syllabus_note is null and q.topic is not null
    and (q.image_path is not null or q.content is not null)
    and (q.content is not null or (q.type = 'mcq' and q.answer is not null) or (q.type <> 'mcq' and q.solution_path is not null))
  order by random() limit 2000;
$$;
revoke execute on function public.daily_pool(text) from public, anon;
grant execute on function public.daily_pool(text) to authenticated;
select 'daily pool ready' as status, (select data_type from information_schema.columns where table_name='questions' and column_name='id') id_type, (select data_type from information_schema.columns where table_name='questions' and column_name='marks') marks_type;
