-- Player cards: friends see each other's title. Safe to re-run.
-- friends: also their chosen title (picked on their player card)
drop function if exists public.my_friends();
create function public.my_friends() returns table(friend_id uuid, name text, streak int, best int, done_today boolean, level int, pet text, color text, border text, photo text, wins int, title text)
language sql stable security definer set search_path = public as $$
  with t as (select (now() at time zone 'Australia/Sydney')::date as today)
  select f.friend_id,
         split_part(coalesce(nullif(trim(u.raw_user_meta_data->>'first_name'), ''), 'Friend'), ' ', 1),
         case when (u.raw_user_meta_data->'streak'->>'last')::date >= t.today - 1 then coalesce((u.raw_user_meta_data->'streak'->>'n')::int, 0) else 0 end,
         coalesce((u.raw_user_meta_data->'streak'->>'best')::int, 0),
         coalesce((u.raw_user_meta_data->'streak'->>'last')::date = t.today, false),
         public.level_of(public.xp_of(f.friend_id)),
         u.raw_user_meta_data->'profile'->>'pet',
         u.raw_user_meta_data->'profile'->>'color',
         u.raw_user_meta_data->'profile'->>'border',
         case when u.raw_user_meta_data->'profile'->>'pet' = 'photo' and coalesce((u.raw_user_meta_data->'prefs'->>'av')::bigint, 0) > 0
              then f.friend_id::text || '/avatar-' || (u.raw_user_meta_data->'prefs'->>'av') end,
         public.duel_wins(f.friend_id),
         nullif(regexp_replace(coalesce(u.raw_user_meta_data->'profile'->>'title', ''), '[^a-z0-9-]', '', 'g'), '')
  from friends f join auth.users u on u.id = f.friend_id, t
  where f.user_id = auth.uid();
$$;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

select 'titles ready' as status;
