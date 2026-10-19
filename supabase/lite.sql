-- Trialbank Lite: the cohort keeps every paper its dial allows, but the study tools (weak spots, timed exams,
-- Progress, lost-mark tagging, auto-marking) stay off until cohort_lite is switched off (after trials).
-- "dial" still controls which papers students can open; "features" controls the tools.
insert into public.settings (key, value) values ('cohort_lite', 'on') on conflict (key) do update set value = 'on';

create or replace function public.my_release()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('dial', d, 'features', case when t = 'cohort' and lite then least(d, 20) else d end, 'tier', t, 'lite', t = 'cohort' and lite) from (
    select case when public.is_admin() then 100
                when public.is_cohort() then coalesce(nullif((select value from public.settings where key = 'release_cohort'), '')::int, 100)
                when public.has_bought(auth.uid()) then 100
                else coalesce(nullif((select value from public.settings where key = 'release_public'), '')::int, 10) end as d,
           case when public.is_admin() then 'admin' when public.is_cohort() then 'cohort'
                when public.has_bought(auth.uid()) then 'paid' else 'public' end as t,
           coalesce((select value from public.settings where key = 'cohort_lite'), 'off') = 'on' as lite) x
$$;
grant execute on function public.my_release() to authenticated;

-- what the auto-marker checks: the feature level (Lite keeps the cohort below auto-marking)
create or replace function public.release_for(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid)
  select case
    when (select e from u) = any (select trim(lower(x)) from unnest(string_to_array((select value from public.settings where key = 'admin_emails'), ',')) x) then 100
    when exists (select 1 from public.allowed_emails a, u where lower(a.email) = u.e) or public.roster_match((select e from u)) is not null
      then case when coalesce((select value from public.settings where key = 'cohort_lite'), 'off') = 'on'
                then least(coalesce(nullif((select value from public.settings where key = 'release_cohort'), '')::int, 100), 20)
                else coalesce(nullif((select value from public.settings where key = 'release_cohort'), '')::int, 100) end
    when public.has_bought(uid) then 100
    else coalesce(nullif((select value from public.settings where key = 'release_public'), '')::int, 10) end
$$;
revoke execute on function public.release_for(uuid) from public, anon, authenticated;
grant execute on function public.release_for(uuid) to service_role;
select key, value from public.settings where key in ('cohort_lite', 'release_cohort', 'release_public') order by key;
