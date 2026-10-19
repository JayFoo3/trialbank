-- Referrals: at most 3 per person, and free days earned by referring get a smaller tutor allowance than the free week. Safe to re-run.
insert into public.settings (key, value) values ('referral_max', '3'), ('tutor_referral_msgs', '30')
  on conflict (key) do update set value = excluded.value;

create or replace function public.tutor_allowance(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case
    when public.has_pro_sub(uid) or not public.has_pro_pass(uid)
      then coalesce(nullif((select value from settings where key = 'tutor_user_monthly_msgs'), '')::int, 300)
    when exists (select 1 from pro_passes where user_id = uid and reason in ('trial', 'admin') and starts <= now() and ends > now())
      then coalesce(nullif((select value from settings where key = 'tutor_trial_msgs'), '')::int, 60)
    else coalesce(nullif((select value from settings where key = 'tutor_referral_msgs'), '')::int, 30) end
$$;
revoke execute on function public.tutor_allowance(uuid) from public, anon, authenticated;
grant execute on function public.tutor_allowance(uuid) to service_role;

create or replace function public.my_pro()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'sale', coalesce((select value from settings where key = 'pro_sales'), 'admin'),
    'trials', coalesce((select value from settings where key = 'pro_trials'), 'admin'),
    'plan', s.plan, 'status', s.status, 'period_end', s.period_end, 'cancel_at_period_end', s.cancel_at_period_end,
    'active', public.has_pro_sub(auth.uid()),
    'pass', public.has_pro_pass(auth.uid()),
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
select 'referral limits ready' as status;
