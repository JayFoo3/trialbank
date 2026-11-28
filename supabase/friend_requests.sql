-- Friend requests: find a student by name, send a request, they accept or decline. Safe to re-run.
-- Search shows only first name, last initial, level and pet (the same things friends already see), needs 2+ letters,
-- returns at most 8, and skips anyone who has turned off "Let people find me by name" (prefs.findable = false).
-- Adding by code or invite link still makes you friends straight away: sharing your code is the invitation.
create table if not exists public.friend_requests (
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
alter table public.friend_requests enable row level security;   -- no policies: only the functions below touch it
create index if not exists friend_requests_to on public.friend_requests (to_id);

-- display name: first word of their name, plus a last initial (from a second word, or a first.last email)
create or replace function public.fr_display(meta jsonb, email text) returns text language sql immutable set search_path = public as $$
  select split_part(coalesce(nullif(trim(meta->>'first_name'), ''), 'Student'), ' ', 1)
         || coalesce(' ' || upper(left(coalesce(nullif(split_part(trim(meta->>'first_name'), ' ', 2), ''),
                                                nullif(regexp_replace(split_part(split_part(email, '@', 1), '.', 2), '[^A-Za-z]', '', 'g'), '')), 1)) || '.', '');
$$;

create or replace function public.search_students(q text)
returns table(id uuid, name text, level int, pet text, color text, border text, photo text, status text)
language sql stable security definer set search_path = public as $$
  with s as (select lower(trim(regexp_replace(coalesce(q, ''), '[%_\\]', '', 'g'))) as t)
  select u.id, public.fr_display(u.raw_user_meta_data, u.email), public.level_of(public.xp_of(u.id)),
         u.raw_user_meta_data->'profile'->>'pet', u.raw_user_meta_data->'profile'->>'color', u.raw_user_meta_data->'profile'->>'border',
         case when u.raw_user_meta_data->'profile'->>'pet' = 'photo' and coalesce((u.raw_user_meta_data->'prefs'->>'av')::bigint, 0) > 0
              then u.id::text || '/avatar-' || (u.raw_user_meta_data->'prefs'->>'av') end,
         case when exists (select 1 from friends f where f.user_id = auth.uid() and f.friend_id = u.id) then 'friend'
              when exists (select 1 from friend_requests r where r.from_id = auth.uid() and r.to_id = u.id) then 'sent'
              when exists (select 1 from friend_requests r where r.from_id = u.id and r.to_id = auth.uid()) then 'received'
              else 'none' end
  from auth.users u, s
  where auth.uid() is not null and length(s.t) >= 2 and u.id <> auth.uid()
    and coalesce(u.raw_user_meta_data->'prefs'->>'findable', 'true') <> 'false'
    and (lower(trim(u.raw_user_meta_data->>'first_name')) like s.t || '%'
         or lower(trim(u.raw_user_meta_data->>'first_name')) like '% ' || s.t || '%')
  order by lower(trim(u.raw_user_meta_data->>'first_name')), u.created_at
  limit 8;
$$;

-- send a request (if they already asked you, you become friends instead); returns 'sent' or 'friends'
create or replace function public.send_friend_request(fid uuid) returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if fid = auth.uid() then raise exception 'That''s you.'; end if;
  if exists (select 1 from friends where user_id = auth.uid() and friend_id = fid) then return 'friends'; end if;
  if exists (select 1 from friend_requests where from_id = fid and to_id = auth.uid()) then
    perform public.respond_friend_request(fid, true); return 'friends';
  end if;
  if (select count(*) from friend_requests where from_id = auth.uid()) >= 30 then raise exception 'You have 30 requests waiting. Wait for some answers first.'; end if;
  insert into friend_requests(from_id, to_id) values (auth.uid(), fid) on conflict do nothing;
  return 'sent';
end $$;

-- accept or decline a request someone sent you
create or replace function public.respond_friend_request(fid uuid, accept boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from friend_requests where from_id = fid and to_id = auth.uid()) then raise exception 'That request has gone.'; end if;
  delete from friend_requests where (from_id = fid and to_id = auth.uid()) or (from_id = auth.uid() and to_id = fid);
  if accept then
    if (select count(*) from friends where user_id = auth.uid()) >= 50 then raise exception 'You can have up to 50 friends.'; end if;
    insert into friends(user_id, friend_id) values (auth.uid(), fid), (fid, auth.uid()) on conflict do nothing;
  end if;
end $$;

-- take back a request you sent
create or replace function public.cancel_friend_request(fid uuid) returns void language sql security definer set search_path = public as $$
  delete from friend_requests where from_id = auth.uid() and to_id = fid;
$$;

-- requests waiting for you to answer
create or replace function public.my_friend_requests()
returns table(id uuid, name text, level int, pet text, color text, border text, photo text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select u.id, public.fr_display(u.raw_user_meta_data, u.email), public.level_of(public.xp_of(u.id)),
         u.raw_user_meta_data->'profile'->>'pet', u.raw_user_meta_data->'profile'->>'color', u.raw_user_meta_data->'profile'->>'border',
         case when u.raw_user_meta_data->'profile'->>'pet' = 'photo' and coalesce((u.raw_user_meta_data->'prefs'->>'av')::bigint, 0) > 0
              then u.id::text || '/avatar-' || (u.raw_user_meta_data->'prefs'->>'av') end,
         r.created_at
  from friend_requests r join auth.users u on u.id = r.from_id
  where r.to_id = auth.uid()
  order by r.created_at desc;
$$;

revoke execute on function public.fr_display(jsonb, text), public.search_students(text), public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean),
  public.cancel_friend_request(uuid), public.my_friend_requests() from public, anon;
grant execute on function public.search_students(text), public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean),
  public.cancel_friend_request(uuid), public.my_friend_requests() to authenticated;

select 'friend requests ready' as status;
