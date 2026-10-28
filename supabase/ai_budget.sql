-- Never lose money on AI. Safe to re-run.
-- Every AI feature (tutor, auto-marking a question, Pro paper marking) counts toward one monthly budget per student,
-- set by what they pay. Pack purchases (tutor messages, marking packs) are paid per use and stay outside the budget.
-- Students who don't pay get a small free allowance, and all their free use together comes out of one shared pool
-- with a hard monthly total (qmark_free_pool_usd), so free use can never cost more than that.
--   ai_cap_sub_usd    Pro subscribers, per month (default 4: under what Pro annual brings in after Stripe and GST)
--   ai_cap_trial_usd  free week and Pro Mini, per month (default 0.30)
--   ai_cap_free_usd   everyone else, per month (default 0.30, about 15 auto-marked questions)
insert into public.settings (key, value) values ('ai_cap_sub_usd', '4') on conflict (key) do nothing;
insert into public.settings (key, value) values ('ai_cap_trial_usd', '0.30') on conflict (key) do nothing;
insert into public.settings (key, value) values ('ai_cap_free_usd', '0.30') on conflict (key) do nothing;

-- AI spend this (Sydney) month for one student, not counting what they bought by the message
create or replace function public.ai_spent(uid uuid) returns numeric language sql stable security definer set search_path = public as $$
  with m as (select (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney') as since)
  select coalesce((select sum(cost_usd) from tutor_runs, m where user_id = uid and created_at >= m.since and not coalesce(from_pack, false)), 0)
       + coalesce((select sum(cost_usd) from question_marks, m where user_id = uid and created_at >= m.since), 0)
       + coalesce((select sum(cost_usd) from automark_runs, m where user_id = uid and created_at >= m.since and paid
                   and session_id in (select id from mark_sessions where user_id = uid and source = 'pro')), 0)
$$;
-- what they may spend this month: null = no limit (admins)
create or replace function public.ai_budget(uid uuid) returns numeric language sql stable security definer set search_path = public as $$
  with a as (select public.access_info(uid) as j)
  select case when (j ->> 'level') = 'admin' then null
              when (j ->> 'sub')::boolean and not (j ->> 'trial')::boolean then coalesce(nullif((select value from settings where key = 'ai_cap_sub_usd'), '')::numeric, 4)
              when (j ->> 'sub')::boolean or (j ->> 'level') = 'pro' then coalesce(nullif((select value from settings where key = 'ai_cap_trial_usd'), '')::numeric, 0.3)
              else coalesce(nullif((select value from settings where key = 'ai_cap_free_usd'), '')::numeric, 0.3) end
  from a
$$;
-- true when this student can spend about `est` more on AI this month
create or replace function public.ai_ok(uid uuid, est numeric) returns boolean language sql stable security definer set search_path = public as $$
  select b is null or public.ai_spent(uid) + est <= b from (select public.ai_budget(uid) as b) t
$$;
revoke execute on function public.ai_spent(uuid) from public, anon, authenticated;
revoke execute on function public.ai_budget(uuid) from public, anon, authenticated;
revoke execute on function public.ai_ok(uuid, numeric) from public, anon, authenticated;
create or replace function public.ai_pays(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select (j ->> 'level') = 'admin' or ((j ->> 'sub')::boolean and not (j ->> 'trial')::boolean) from (select public.access_info(uid) as j) a
$$;
revoke execute on function public.ai_pays(uuid) from public, anon, authenticated;
grant execute on function public.ai_spent(uuid), public.ai_budget(uuid), public.ai_ok(uuid, numeric), public.ai_pays(uuid) to service_role;
select 'ai budget ready' as status;
