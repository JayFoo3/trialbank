-- The shared free auto-marking pool, for the Marking tab: this month's budget, what's been used, each student's share.
create or replace function public.automark_pool()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'cap_usd', coalesce((select value::numeric from settings where key = 'automark_monthly_cap_usd'), 20),
    'spent_usd', coalesce((select sum(cost_usd) from automark_runs
                           where paid = false and created_at >= date_trunc('month', now() at time zone 'utc')), 0),
    'per_user_usd', coalesce((select value::numeric from settings where key = 'automark_user_monthly_usd'), 2),
    'enabled', coalesce((select value from settings where key = 'automark_enabled'), 'on') <> 'off')
$$;
grant execute on function public.automark_pool() to authenticated;
select public.automark_pool();
