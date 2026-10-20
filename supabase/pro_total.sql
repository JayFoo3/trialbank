-- How many Pro auto-marks an account gets a month (5 on a subscription, fewer on a free week or Pro Mini), so the Pro card shows "1 of 1", not "1 of 5". Safe to re-run.
create or replace function public.pro_total(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when public.access_info(uid) ->> 'level' <> 'pro' then 0
              when public.has_pro_sub(uid) then coalesce(nullif((select value from settings where key = 'pro_monthly_marks'), '')::int, 5)
              when public.has_full_pass(uid) then coalesce(nullif((select value from settings where key = 'pro_trial_marks'), '')::int, 1)
              else coalesce(nullif((select value from settings where key = 'pro_mini_marks'), '')::int, 1) end
$$;
revoke execute on function public.pro_total(uuid) from public, anon, authenticated;
grant execute on function public.pro_total(uuid) to service_role;
create or replace function public.my_marks()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'balance', coalesce((select balance from mark_credits where user_id = auth.uid()), 0),
    'pro_left', public.pro_left(auth.uid()),
    'pro_total', public.pro_total(auth.uid()),
    'bought', public.has_bought(auth.uid()),
    'can_buy', public.can_buy_for(auth.uid()));
$$;
grant execute on function public.my_marks() to authenticated;
