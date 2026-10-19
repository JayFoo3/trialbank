-- A test account the admin can switch into from the Admin page (supabase/functions/test-account).
-- It gets past the sign-up gate, and can buy marking packs while packs are admin-only.
insert into public.settings (key, value) values ('test_email', 'jaydenvujic+trialbank-test@gmail.com') on conflict (key) do nothing;

create or replace function public.signup_reason(p_email text, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  dom  text := (select value from public.settings where key = 'allowed_domain');
  code text := coalesce((select value from public.settings where key = 'invite_code'), '');
  mode text := coalesce((select value from public.settings where key = 'signup_mode'), 'domain');
  listed boolean := exists (select 1 from public.allowed_emails where lower(email) = lower(p_email));
begin
  if lower(p_email) = lower(coalesce((select value from public.settings where key = 'test_email'), '-')) then return null; end if;
  if mode = 'whitelist' then
    if not listed then return 'That email is not on the class list'; end if;
  elsif lower(p_email) not like '%@' || lower(dom) and not listed then
    return 'Use your school email address';
  end if;
  if code <> '' and coalesce(p_code, '') <> code then
    return 'Wrong invite code';
  end if;
  return null;
end $$;
grant execute on function public.signup_reason(text, text) to anon, authenticated;

create or replace function public.can_buy_for(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid),
       adm as (select (select e from u) = any (select trim(lower(x)) from unnest(string_to_array(
                 (select value from settings where key = 'admin_emails'), ',')) x)
              or (select e from u) = lower(coalesce((select value from settings where key = 'test_email'), '-')) as yes)
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

select key, value from public.settings where key = 'test_email';

-- the test-account function looks the account up by email
create or replace function public.admin_user_id(target_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(target_email) limit 1
$$;
revoke execute on function public.admin_user_id(text) from public, anon, authenticated;
grant execute on function public.admin_user_id(text) to service_role;
