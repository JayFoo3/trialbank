-- Match students to the class list by the name they enter, not just their email.

-- first and last word of a roster name must both appear as words in the entered name
create or replace function public.roster_match_name(p_name text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  given text[] := regexp_split_to_array(regexp_replace(lower(coalesce(p_name, '')), '[^a-z\s-]', '', 'g'), '[\s-]+');
  r record; w text[];
begin
  if coalesce(trim(p_name), '') = '' then return null; end if;
  for r in select name from public.roster loop
    w := regexp_split_to_array(regexp_replace(lower(trim(r.name)), '[^a-z\s-]', '', 'g'), '[\s-]+');
    if array_length(w, 1) >= 2 and w[1] = any(given) and w[array_length(w, 1)] = any(given) then
      return r.name;
    end if;
  end loop;
  return null;
end $$;

drop function if exists public.admin_users();
create function public.admin_users()
returns table (email text, given_name text, created_at timestamptz, last_sign_in_at timestamptz, attempts bigint, roster_name text, matched_by text)
language sql security definer stable set search_path = public as $$
  select u.email::text,
         u.raw_user_meta_data->>'first_name',
         u.created_at, u.last_sign_in_at,
         (select count(*) from public.attempts a where a.user_id = u.id),
         coalesce(public.roster_match(u.email), public.roster_match_name(u.raw_user_meta_data->>'first_name')),
         case when public.roster_match(u.email) is not null then 'email'
              when public.roster_match_name(u.raw_user_meta_data->>'first_name') is not null then 'name' end
  from auth.users u
  where public.is_admin()
  order by u.created_at desc
$$;

-- alert when someone enters a name that matches nobody on the list (and their email didn't either)
create or replace function public.notify_name()
returns trigger language plpgsql security definer set search_path = public as $$
declare n text := new.raw_user_meta_data->>'first_name';
begin
  if n is not null and n is distinct from (old.raw_user_meta_data->>'first_name')
     and exists (select 1 from public.roster)
     and public.roster_match(new.email) is null
     and public.roster_match_name(n) is null
     and not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    perform public.send_alert('Trialbank: name not on class list', new.email || ' says they are "' || n || '". Tap to review.');
  end if;
  return new;
exception when others then
  return new;
end $$;
grant execute on function public.notify_name() to supabase_auth_admin;
drop trigger if exists notify_name on auth.users;
create trigger notify_name after update of raw_user_meta_data on auth.users for each row execute function public.notify_name();
