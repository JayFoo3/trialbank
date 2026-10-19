-- Levels: XP worked out from what each student has actually done, so it can't drift. Safe to re-run.
--   2 XP per question answered, +10 per mark scored, +50 per Daily 5 finished.
--   Level L needs 50 * L * (L - 1) XP: L2 100, L3 300, L5 1000, L10 4500, L20 19000.
create or replace function public.xp_of(uid uuid) returns int language sql stable security definer set search_path = public as $$
  select (coalesce((select 2 * count(*) + 10 * sum(least(greatest(score, 0), greatest(out_of, 0))) from attempts where user_id = uid), 0)
        + 50 * (select count(*) from daily_sets where user_id = uid and finished_at is not null))::int;
$$;
create or replace function public.level_of(xp int) returns int language sql immutable as $$
  select least(50, floor((1 + sqrt(1 + 4 * greatest(xp, 0) / 50.0)) / 2))::int;
$$;
revoke execute on function public.xp_of(uuid) from public, anon, authenticated;

create or replace function public.my_level() returns table(xp int, level int) language sql stable security definer set search_path = public as $$
  select x, public.level_of(x) from (select public.xp_of(auth.uid()) as x) s where auth.uid() is not null;
$$;
revoke execute on function public.my_level() from public, anon;
grant execute on function public.my_level() to authenticated;

-- friends now also show their pet, banner colour, border and level
drop function if exists public.my_friends();
create function public.my_friends() returns table(friend_id uuid, name text, streak int, best int, done_today boolean, level int, pet text, color text, border text)
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
         u.raw_user_meta_data->'profile'->>'border'
  from friends f join auth.users u on u.id = f.friend_id, t
  where f.user_id = auth.uid();
$$;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;
select 'levels ready' as status;
