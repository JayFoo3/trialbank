-- Engagement stats for the Admin page. Safe to re-run.

-- one row per student per Sydney day per page, with a hit count
create table if not exists public.visits (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  view     text not null,
  hits     int  not null default 1,
  first_at timestamptz not null default now(),
  last_at  timestamptz not null default now(),
  primary key (user_id, day, view)
);
alter table public.visits enable row level security;   -- no policies: written and read only through the functions below

create or replace function public.log_visit(v text) returns void
language sql security definer as $$
  insert into public.visits (user_id, day, view)
  select auth.uid(), (now() at time zone 'Australia/Sydney')::date, left(coalesce(nullif(v, ''), 'home'), 20)
  where auth.uid() is not null
  on conflict (user_id, day, view) do update set hits = public.visits.hits + 1, last_at = now();
$$;
grant execute on function public.log_visit(text) to authenticated;

create or replace function public.admin_stats(days int default 30, with_admins boolean default false) returns json
language plpgsql security definer stable as $$
declare
  today  date := (now() at time zone 'Australia/Sydney')::date;
  t0     date := today - (days - 1);
  admins uuid[];
  res    json;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select coalesce(array_agg(u.id), '{}') into admins from auth.users u
   where not with_admins and lower(u.email) = any (
     select trim(lower(e)) from unnest(string_to_array((select value from public.settings where key = 'admin_emails'), ',')) e);
  with att as (
    select a.user_id, a.question_id, (a.created_at at time zone 'Australia/Sydney')::date as day
    from public.attempts a where not (a.user_id = any (admins))
  ), vis as (
    select * from public.visits v where not (v.user_id = any (admins))
  ), act as (                        -- every (student, day) with any activity
    select user_id, day from vis union select user_id, day from att
  ), cal as (
    select generate_series(t0, today, interval '1 day')::date as day
  )
  select json_build_object(
    'users',        (select count(*) from auth.users u where not (u.id = any (admins))),
    'new_period',   (select count(*) from auth.users u where not (u.id = any (admins)) and (u.created_at at time zone 'Australia/Sydney')::date >= t0),
    'active_today', (select count(distinct user_id) from act where day = today),
    'active_7',     (select count(distinct user_id) from act where day > today - 7),
    'active_period',(select count(distinct user_id) from act where day >= t0),
    'returning',    (select count(*) from (select user_id from act where day >= t0 group by user_id having count(distinct day) >= 2) r),
    'answered',     (select count(*) from att),
    'answered_period', (select count(*) from att where day >= t0),
    'exams',        (select count(*) from public.exams e where not (e.user_id = any (admins))),
    'views_period', (select coalesce(sum(hits), 0) from vis where day >= t0),
    'since',        (select min(day) from vis),
    'daily', (select json_agg(json_build_object(
                'day', c.day,
                'active',   (select count(distinct user_id) from act a where a.day = c.day),
                'answered', (select count(*) from att a where a.day = c.day),
                'views',    (select coalesce(sum(hits), 0) from vis v where v.day = c.day),
                'signups',  (select count(*) from auth.users u where not (u.id = any (admins)) and (u.created_at at time zone 'Australia/Sydney')::date = c.day)
              ) order by c.day) from cal c),
    'pages', (select json_agg(r) from (
                select view, sum(hits) as hits, count(distinct user_id) as people from vis where day >= t0
                group by view order by 2 desc limit 8) r),
    'subjects', (select json_agg(r) from (
                select p.subject, count(*) as n from att a join public.questions q on q.id = a.question_id join public.papers p on p.id = q.paper_id
                where a.day >= t0 group by 1 order by 2 desc) r),
    'topics', (select json_agg(r) from (
                select q.topic, count(*) as n from att a join public.questions q on q.id = a.question_id
                where a.day >= t0 and q.topic is not null group by 1 order by 2 desc limit 8) r)
  ) into res;
  return res;
end $$;
grant execute on function public.admin_stats(int, boolean) to authenticated;

select 1 as ready;
