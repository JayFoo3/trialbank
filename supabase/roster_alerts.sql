-- Class-list (names) check + phone alerts for unknown sign-ups. Safe to re-run.
create extension if not exists pg_net;

create table if not exists public.roster (name text primary key);
alter table public.roster enable row level security;
drop policy if exists "admin roster" on public.roster;
create policy "admin roster" on public.roster for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.settings (key, value)
values ('ntfy_topic', 'trialbank-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16))
on conflict (key) do nothing;
update public.settings set value = 'domain' where key = 'signup_mode';   -- any school email + invite code

-- which class-list name an email belongs to (first name and surname both appear in the address), or null
create or replace function public.roster_match(p_email text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  l text := regexp_replace(lower(split_part(p_email, '@', 1)), '[^a-z]', '', 'g');
  r record; w text[]; f text; s text;
begin
  for r in select name from public.roster loop
    w := regexp_split_to_array(lower(trim(r.name)), '\s+');
    f := regexp_replace(w[1], '[^a-z]', '', 'g');
    s := regexp_replace(w[array_length(w, 1)], '[^a-z]', '', 'g');
    if f <> '' and s <> '' and position(f in l) > 0 and position(s in l) > 0 then
      return r.name;
    end if;
  end loop;
  return null;
end $$;

create or replace function public.send_alert(p_title text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare topic text := (select value from public.settings where key = 'ntfy_topic');
begin
  if coalesce(topic, '') = '' then return; end if;
  perform net.http_post(
    url  := 'https://ntfy.sh',
    body := jsonb_build_object('topic', topic, 'title', p_title, 'message', p_message,
                               'tags', jsonb_build_array('warning'), 'priority', 4,
                               'click', 'https://jayfoo3.github.io/trialbank/#admin'));
end $$;

-- after every sign-up: alert if the email matches nobody on the class list
create or replace function public.notify_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.roster)
     and public.roster_match(new.email) is null
     and not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    perform public.send_alert('Trialbank: unknown sign-up', new.email || ' is not on the class list. Tap to review.');
  end if;
  return new;
exception when others then
  return new;   -- an alert failure must never block a sign-up
end $$;
grant execute on function public.notify_signup() to supabase_auth_admin;
drop trigger if exists notify_signup on auth.users;
create trigger notify_signup after insert on auth.users for each row execute function public.notify_signup();

create or replace function public.admin_test_alert()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform public.send_alert('Trialbank: test alert', 'Alerts are working.');
end $$;

drop function if exists public.admin_users();
create function public.admin_users()
returns table (email text, created_at timestamptz, last_sign_in_at timestamptz, attempts bigint, roster_name text)
language sql security definer stable set search_path = public as $$
  select u.email::text, u.created_at, u.last_sign_in_at,
         (select count(*) from public.attempts a where a.user_id = u.id),
         public.roster_match(u.email)
  from auth.users u
  where public.is_admin()
  order by u.created_at desc
$$;

select key, value from public.settings where key in ('signup_mode', 'ntfy_topic');
