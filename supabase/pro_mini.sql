-- Pro Mini: what a referral earns. Every Pro feature in small amounts: 30 tutor messages and 1 marked paper a month, 3 practice papers a week; no Pro looks. Safe to re-run.
insert into public.settings (key, value) values ('pro_mini_marks', '1') on conflict (key) do update set value = excluded.value;

-- on full Pro time right now? (a subscription, the free week, or time an admin gave)
create or replace function public.has_full_pass(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pro_passes where user_id = uid and reason in ('trial', 'admin') and starts <= now() and ends > now());
$$;
revoke execute on function public.has_full_pass(uuid) from public, anon, authenticated;
grant execute on function public.has_full_pass(uuid) to service_role;

create or replace function public.pro_left(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when public.access_info(uid) ->> 'level' = 'pro' then greatest(0,
           case when public.has_pro_sub(uid) then coalesce(nullif((select value from settings where key = 'pro_monthly_marks'), '')::int, 5)
                when public.has_full_pass(uid) then coalesce(nullif((select value from settings where key = 'pro_trial_marks'), '')::int, 1)
                else coalesce(nullif((select value from settings where key = 'pro_mini_marks'), '')::int, 1) end
           - (select count(*)::int from mark_sessions where user_id = uid and source = 'pro'
                and created_at >= (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney')))
         else 0 end
$$;
revoke execute on function public.pro_left(uuid) from public, anon, authenticated;
grant execute on function public.pro_left(uuid) to service_role;

create or replace function public.my_pro()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'sale', coalesce((select value from settings where key = 'pro_sales'), 'admin'),
    'trials', coalesce((select value from settings where key = 'pro_trials'), 'admin'),
    'plan', s.plan, 'status', s.status, 'period_end', s.period_end, 'cancel_at_period_end', s.cancel_at_period_end,
    'active', public.has_pro_sub(auth.uid()),
    'pass', public.has_pro_pass(auth.uid()),
    'mini', public.has_pro_pass(auth.uid()) and not public.has_full_pass(auth.uid()) and not public.has_pro_sub(auth.uid()),
    'pass_end', (select max(ends) from pro_passes where user_id = auth.uid() and ends > now()),
    'trial_used', exists (select 1 from pro_passes where user_id = auth.uid() and reason = 'trial'),
    'referred', (select count(*) from referrals where referrer = auth.uid() and rewarded),
    'referral_pending', (select count(*) from referrals where referrer = auth.uid() and not rewarded),
    'referral_days', coalesce(nullif((select value from settings where key = 'referral_days'), '')::int, 7),
    'referral_max', coalesce(nullif((select value from settings where key = 'referral_max'), '')::int, 3),
    'referral_msgs', coalesce(nullif((select value from settings where key = 'tutor_referral_msgs'), '')::int, 30),
    'trial_msgs', coalesce(nullif((select value from settings where key = 'tutor_trial_msgs'), '')::int, 60),
    'trial_days', coalesce(nullif((select value from settings where key = 'pro_trial_days'), '')::int, 7))
  from (select 1) x left join subscriptions s on s.user_id = auth.uid();
$$;
grant execute on function public.my_pro() to authenticated;
select 'pro mini ready' as status;
