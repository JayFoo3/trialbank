-- Sign-up gate v2: pre-check callable from the site (gives a real reason), trigger as backstop.

create or replace function public.signup_reason(p_email text, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  dom  text := (select value from public.settings where key = 'allowed_domain');
  code text := coalesce((select value from public.settings where key = 'invite_code'), '');
  mode text := coalesce((select value from public.settings where key = 'signup_mode'), 'domain');
  listed boolean := exists (select 1 from public.allowed_emails where lower(email) = lower(p_email));
begin
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

create or replace function public.check_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  reason text := public.signup_reason(new.email, new.raw_user_meta_data->>'invite');
begin
  if reason is not null then
    raise exception '%', reason;
  end if;
  return new;
end $$;
grant execute on function public.check_signup() to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.settings, public.allowed_emails to supabase_auth_admin;

-- is_admin() and admin_users() also need a fixed search path
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.email(), '')) = any (
    select trim(lower(e)) from unnest(string_to_array((select value from public.settings where key = 'admin_emails'), ',')) e)
$$;

select public.signup_reason('jaydenvujic@gmail.com', 'shhs-trials-2027') as should_be_null;
