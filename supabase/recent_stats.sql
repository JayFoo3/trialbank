-- Recent progress: a student's accuracy per topic counts only their last 50 answers in that topic,
-- so getting better shows up (old mistakes stop dragging the number down). Safe to re-run.
--   score, out_of, attempts : the last 50 answers, equally weighted (what students see)
--   w_score, w_out          : the same 50, newest counting most (each step back counts 0.97 as much),
--                             used to lean Quick, Mixed and Today's 5 towards weak topics
-- Everything that reads my_topic_stats (Practise %, weak spots, Progress, custom papers, the tutor) picks this up.
create or replace view my_topic_stats as
  with r as (
    select p.subject, q.topic, a.score, a.out_of,
           row_number() over (partition by p.subject, q.topic order by a.created_at desc, a.id desc) as n
    from attempts a
    join questions q on q.id = a.question_id
    join papers p    on p.id = q.paper_id
    where a.user_id = auth.uid()
  )
  select subject, topic,
         count(*)     as attempts,
         sum(score)   as score,
         sum(out_of)  as out_of,
         sum(score  * power(0.97, n - 1))::float8 as w_score,
         sum(out_of * power(0.97, n - 1))::float8 as w_out
  from r
  where n <= 50
  group by subject, topic;


select 'recent stats ready' as status, count(*) as my_topics from my_topic_stats;
