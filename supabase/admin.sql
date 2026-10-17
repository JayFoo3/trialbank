-- Admin + whitelist. Run after schema.sql (safe to re-run).

insert into settings (key, value) values
  ('signup_mode',  'whitelist'),                 -- 'whitelist' (must be in allowed_emails) or 'domain' (any school address)
  ('admin_emails', 'jaydenvujic@gmail.com')      -- comma-separated
on conflict (key) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select lower(coalesce(auth.email(), '')) = any (
    select trim(lower(e)) from unnest(string_to_array((select value from settings where key = 'admin_emails'), ',')) e)
$$;

-- sign-up gate, now with whitelist mode
create or replace function public.check_signup()
returns trigger language plpgsql security definer as $$
declare
  dom  text := (select value from settings where key = 'allowed_domain');
  code text := (select value from settings where key = 'invite_code');
  mode text := coalesce((select value from settings where key = 'signup_mode'), 'domain');
  listed boolean := exists (select 1 from allowed_emails where lower(email) = lower(new.email));
begin
  if mode = 'whitelist' then
    if not listed then
      raise exception 'That email is not on the class list';
    end if;
  elsif lower(new.email) not like '%@' || lower(dom) and not listed then
    raise exception 'Use your school email address';
  end if;
  if code <> '' and coalesce(new.raw_user_meta_data->>'invite', '') <> code then
    raise exception 'Wrong invite code';
  end if;
  return new;
end $$;

-- admins can read and change settings and the whitelist
drop policy if exists "admin settings" on settings;
create policy "admin settings" on settings for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "admin allowed_emails" on allowed_emails;
create policy "admin allowed_emails" on allowed_emails for all to authenticated using (is_admin()) with check (is_admin());

-- registered users, for the admin page
create or replace function public.admin_users()
returns table (email text, created_at timestamptz, last_sign_in_at timestamptz, attempts bigint)
language sql security definer stable as $$
  select u.email::text, u.created_at, u.last_sign_in_at,
         (select count(*) from attempts a where a.user_id = u.id)
  from auth.users u
  where is_admin()
  order by u.created_at desc
$$;

create or replace function public.admin_remove_user(target text)
returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  delete from auth.users where lower(email) = lower(target);
end $$;
