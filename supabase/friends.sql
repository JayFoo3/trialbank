-- Friends: add each other with a 6-letter code, see each other's first name, Daily 5 streak and whether today's is done. Safe to re-run.
create table if not exists public.friend_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  created_at timestamptz default now()
);
alter table public.friend_codes enable row level security;   -- no policies: only the functions below touch it

create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;
drop policy if exists "own friends" on public.friends;
create policy "own friends" on public.friends for select to authenticated using (auth.uid() = user_id);

-- your code, made the first time you ask (no 0/O/1/I/L so it reads out loud easily)
create or replace function public.my_friend_code() returns text language plpgsql security definer set search_path = public as $$
declare c text; abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select code into c from friend_codes where user_id = auth.uid();
  while c is null loop
    c := (select string_agg(substr(abc, 1 + floor(random() * length(abc))::int, 1), '') from generate_series(1, 6));
    begin insert into friend_codes(user_id, code) values (auth.uid(), c);
    exception when unique_violation then c := null; end;
  end loop;
  return c;
end $$;

-- add someone by their code; friendship goes both ways; returns their first name
create or replace function public.add_friend(friend_code text) returns text language plpgsql security definer set search_path = public as $$
declare fid uuid; nm text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select user_id into fid from friend_codes where code = upper(regexp_replace(friend_code, '[^A-Za-z0-9]', '', 'g'));
  if fid is null then raise exception 'No one has that code. Check the letters.'; end if;
  if fid = auth.uid() then raise exception 'That''s your own code.'; end if;
  if (select count(*) from friends where user_id = auth.uid()) >= 50 then raise exception 'You can have up to 50 friends.'; end if;
  insert into friends(user_id, friend_id) values (auth.uid(), fid), (fid, auth.uid()) on conflict do nothing;
  select split_part(coalesce(nullif(trim(raw_user_meta_data->>'first_name'), ''), 'your friend'), ' ', 1) into nm from auth.users where id = fid;
  return nm;
end $$;

create or replace function public.remove_friend(fid uuid) returns void language sql security definer set search_path = public as $$
  delete from friends where (user_id = auth.uid() and friend_id = fid) or (user_id = fid and friend_id = auth.uid());
$$;

-- your friends: first name only, their live streak (0 once a day is missed) and whether today's 5 is done (Sydney days)
create or replace function public.my_friends() returns table(friend_id uuid, name text, streak int, best int, done_today boolean)
language sql stable security definer set search_path = public as $$
  with t as (select (now() at time zone 'Australia/Sydney')::date as today)
  select f.friend_id,
         split_part(coalesce(nullif(trim(u.raw_user_meta_data->>'first_name'), ''), 'Friend'), ' ', 1),
         case when (u.raw_user_meta_data->'streak'->>'last')::date >= t.today - 1 then coalesce((u.raw_user_meta_data->'streak'->>'n')::int, 0) else 0 end,
         coalesce((u.raw_user_meta_data->'streak'->>'best')::int, 0),
         coalesce((u.raw_user_meta_data->'streak'->>'last')::date = t.today, false)
  from friends f join auth.users u on u.id = f.friend_id, t
  where f.user_id = auth.uid();
$$;
revoke execute on function public.my_friend_code(), public.add_friend(text), public.remove_friend(uuid), public.my_friends() from public, anon;
grant execute on function public.my_friend_code(), public.add_friend(text), public.remove_friend(uuid), public.my_friends() to authenticated;
select 'friends ready' as status;
