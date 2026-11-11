-- Two hand-picked practice papers for the 2026 Year 12 Mathematics Advanced Task 1 (Fri 27 Nov):
-- graph transformations, logarithms and exponentials (no calculus), sequences and series.
-- Same shape as the test: 5 multiple choice + 32 marks written = 37 marks, 60 minutes + 5 reading.
-- Run after practice_papers.sql. Safe to re-run (replaces the two papers).
do $$
declare
  uid uuid := (select id from auth.users where lower(email) = 'jaydenvujic@gmail.com' limit 1);
  a text[] := array[
    'adv-sydney-grammar-2025/q05','adv-killara-2026/q01','adv-caringbah-2023/q04','adv-roseville-2023/q04','adv-sydney-girls-2024/q05',
    'adv-trinity-grammar-2022/q24','adv-hurlstone-2026/q12','adv-blacktown-boys-2024/q12','adv-sydney-tech-2022/q14','adv-barker-2025/q23',
    'adv-st-george-girls-2023/q20','adv-killara-2026/q24','adv-sydney-tech-2026/q25','adv-sydney-tech-2026/q12','adv-north-sydney-girls-2025/q25b',
    'adv-trinity-grammar-2022/q23','adv-north-sydney-boys-2021/q11b','adv-girraween-2024/q30a'];
  b text[] := array[
    'adv-sydney-grammar-2020/q06','adv-blacktown-boys-2024/q05','adv-north-sydney-boys-2024/q03','adv-baulkham-hills-2023/q09','adv-north-sydney-girls-2024/q04',
    'adv-barker-2025/q22','adv-sydney-tech-2026/q19','adv-barker-2025/q11','adv-st-george-girls-2023/q19','adv-barker-2025/q13',
    'adv-hurlstone-2026/q16','adv-hunters-hill-2026/q22','adv-hunters-hill-2026/q13','adv-sydney-grammar-2024/q32b','adv-sydney-grammar-2023/q31a',
    'adv-sydney-grammar-2026/q33b','adv-north-sydney-boys-2024/q20b'];
  tps text[] := array['Graphing Techniques','Exponential and Logarithmic Functions','Sequences and Series'];
  r record;
begin
  if uid is null then raise exception 'No account for jaydenvujic@gmail.com'; end if;
  delete from public.practice_papers where user_id = uid and source = 'admin' and title like 'Task 1 practice %';
  for r in select * from (values ('Task 1 practice A', a), ('Task 1 practice B', b)) v(title, ids) loop
    insert into public.practice_papers (user_id, subject, title, mins, reading, question_ids, marks, topics, source)
    select uid, 'Adv', r.title, 60, 5, array_agg(q.id order by u.n), sum(case when q.type = 'mcq' then 1 else coalesce(q.marks, 0) end)::int, tps, 'admin'
    from unnest(r.ids) with ordinality u(id, n) join public.questions q on q.id = u.id;   -- only questions that are in the bank
  end loop;
end $$;
select title, marks, cardinality(question_ids) as questions from public.practice_papers where source = 'admin' and title like 'Task 1 practice %' order by title;
