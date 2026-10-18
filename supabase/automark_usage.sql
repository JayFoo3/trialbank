-- A student's own auto-marking use this month, for the "3 of 4 left" counter. Admins are unlimited.
create or replace function public.my_automark_usage()
returns table (used_usd numeric, limit_usd numeric, unlimited boolean)
language sql security definer set search_path = public as $$
  select coalesce((select sum(cost_usd) from automark_runs
                    where user_id = auth.uid() and created_at >= date_trunc('month', now() at time zone 'utc')), 0),
         coalesce((select value::numeric from settings where key = 'automark_user_monthly_usd'), 2),
         is_admin();
$$;
grant execute on function public.my_automark_usage() to authenticated;
