-- my_tutor_left, plus the whole-site tutor budget for admins (dollars and tokens this month). Safe to re-run.
create or replace function public.my_tutor_left() returns json language sql stable security definer set search_path = public as $$
  with s as (
    select public.tutor_allowance(auth.uid()) as allowance,
           coalesce(lower(auth.email()) = any (regexp_split_to_array(lower(coalesce((select value from settings where key = 'admin_emails'), '')), '[\s,]+')), false) as admin,
           (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney') as since,
           date_trunc('month', now()) as utc_since
  ),
  site as (   -- the tutor function's spending cap runs on UTC months
    select coalesce(sum(cost_usd), 0) as spent,
           coalesce(sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0) + coalesce(cache_write, 0) + coalesce(cache_read, 0)), 0) as tokens,
           count(*) filter (where error is null) as msgs
    from tutor_runs, s where created_at >= s.utc_since
  )
  select json_build_object(
    'allowance', s.allowance,
    'used', (select count(*) from tutor_runs r where r.user_id = auth.uid() and r.created_at >= s.since and r.error is null),
    'unlimited', s.admin,
    'refills', (date_trunc('month', now() at time zone 'Australia/Sydney') + interval '1 month')::date,
    'site', case when s.admin then json_build_object(
      'cap_usd', coalesce(nullif((select value from settings where key = 'tutor_monthly_cap_usd'), '')::numeric, 15),
      'spent_usd', round(site.spent::numeric, 4), 'tokens', site.tokens, 'msgs', site.msgs,
      'refills', (date_trunc('month', now()) + interval '1 month')::date) end)
  from s, site;
$$;
grant execute on function public.my_tutor_left() to authenticated;
select public.my_tutor_left() is not null as ready;
