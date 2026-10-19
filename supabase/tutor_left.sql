-- How many tutor messages you have left this month (Sydney months). Admins are unlimited. Safe to re-run.
create or replace function public.my_tutor_left() returns json language sql stable security definer set search_path = public as $$
  with s as (
    select coalesce((select value from settings where key = 'tutor_user_monthly_msgs'), '300')::int as allowance,
           coalesce(lower(auth.email()) = any (regexp_split_to_array(lower(coalesce((select value from settings where key = 'admin_emails'), '')), '[\s,]+')), false) as admin,
           (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney') as since
  )
  select json_build_object(
    'allowance', s.allowance,
    'used', (select count(*) from tutor_runs r where r.user_id = auth.uid() and r.created_at >= s.since and r.error is null),
    'unlimited', s.admin,
    'refills', (date_trunc('month', now() at time zone 'Australia/Sydney') + interval '1 month')::date)
  from s;
$$;
revoke execute on function public.my_tutor_left() from public, anon;
grant execute on function public.my_tutor_left() to authenticated;
select public.my_tutor_left() is not null as ready;
