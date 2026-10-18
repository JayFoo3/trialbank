-- packs_admin_only: while on, only admins see and can use "Buy marking packs" (testing before Stripe is live).
-- Turn it off (update settings set value = 'off' where key = 'packs_admin_only') to open packs to everyone outside
-- the cohort; the cohort then needs packs_cohort = 'on' as well (after trials).
insert into public.settings (key, value) values ('packs_admin_only', 'on') on conflict (key) do update set value = 'on';
update public.settings set value = 'off' where key = 'packs_cohort';

create or replace function public.can_buy_for(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid),
       adm as (select (select e from u) = any (select trim(lower(x)) from unnest(string_to_array(
                 (select value from settings where key = 'admin_emails'), ',')) x) as yes)
  select coalesce((select value from settings where key = 'packs_enabled'), 'off') = 'on'
     and case when coalesce((select value from settings where key = 'packs_admin_only'), 'on') = 'on'
              then coalesce((select yes from adm), false)
              else coalesce((select yes from adm), false)
                   or coalesce((select value from settings where key = 'packs_cohort'), 'off') = 'on'
                   or not (exists (select 1 from allowed_emails a, u where lower(a.email) = u.e)
                           or public.roster_match((select e from u)) is not null) end;
$$;
revoke execute on function public.can_buy_for(uuid) from public, anon, authenticated;
grant execute on function public.can_buy_for(uuid) to service_role;
