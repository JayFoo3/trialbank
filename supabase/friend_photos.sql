-- Profile photos as profile pictures: friends can see a friend's photo (only the avatar, never backgrounds). Safe to re-run.
drop policy if exists "friends see avatar" on storage.objects;
create policy "friends see avatar" on storage.objects for select to authenticated using (
  bucket_id = 'profile' and name like '%/avatar-%'
  and exists (select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id::text = (storage.foldername(name))[1]));

drop function if exists public.my_friends();
create function public.my_friends() returns table(friend_id uuid, name text, streak int, best int, done_today boolean, level int, pet text, color text, border text, photo text)
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
              then f.friend_id::text || '/avatar-' || (u.raw_user_meta_data->'prefs'->>'av') end
  from friends f join auth.users u on u.id = f.friend_id, t
  where f.user_id = auth.uid();
$$;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;
select 'friend photos ready' as status;
