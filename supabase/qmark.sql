-- One written question auto-marked at a time (practice sets and 1v1 battles). Safe to re-run.
-- Kept apart from paper marking, so marking single questions never uses up a student's paper marks or daily paper limit.
-- Limits live in settings: qmark_daily (per student per day, default 80), qmark_monthly_cap_usd (everyone together, default 20),
-- qmark_enabled ('off' switches it off).
create table if not exists public.question_marks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text,
  duel boolean not null default false,
  awarded int, out_of int,
  cost_usd numeric not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists question_marks_user on public.question_marks (user_id, created_at);
create index if not exists question_marks_month on public.question_marks (created_at);
alter table public.question_marks enable row level security;   -- no policies: only the server reads and writes it
revoke all on public.question_marks from anon, authenticated;

create or replace function public.qmark_reserve(uid uuid, per_day int, month_cap numeric, est numeric, is_duel boolean, qid text)
returns json language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  perform pg_advisory_xact_lock(hashtext('qm:' || uid::text));
  if month_cap > 0 and (select coalesce(sum(cost_usd), 0) from question_marks where created_at >= date_trunc('month', now())) >= month_cap
    then return json_build_object('err', 'pool'); end if;
  if per_day > 0 and (select count(*) from question_marks where user_id = uid and created_at > now() - interval '1 day') >= per_day
    then return json_build_object('err', 'day'); end if;
  insert into question_marks (user_id, question_id, duel, cost_usd, error) values (uid, qid, is_duel, est, 'pending') returning id into rid;
  return json_build_object('id', rid);
end $$;
revoke execute on function public.qmark_reserve(uuid, int, numeric, numeric, boolean, text) from public, anon, authenticated;
grant execute on function public.qmark_reserve(uuid, int, numeric, numeric, boolean, text) to service_role;
select 'question marking ready' as status;
