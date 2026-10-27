-- 1v1 battles that count. Safe to re-run.
-- Each player records their own result. A battle only counts when both players' rows agree (one says win, the other lose,
-- or both draw), so nobody can award themselves wins without the other person's account.
--   XP: +50 per battle won (up to 5 a day), +100 the first day-battle each day, on top of the usual XP for every answer.
--   Friends see each other's battle wins (ranks), and everyone gets their head-to-head record against each friend.

create table if not exists public.duel_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opp_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{4,8}$'),
  started_at timestamptz not null,
  my_score numeric not null check (my_score between 0 and 300),
  opp_score numeric not null check (opp_score between 0 and 300),
  result text not null check (result in ('win', 'lose', 'draw')),
  stakes text check (stakes is null or length(stakes) <= 60),
  created_at timestamptz not null default now(),
  unique (user_id, code, started_at)
);
create index if not exists duel_results_opp on public.duel_results (opp_id, code, started_at);
alter table public.duel_results enable row level security;
drop policy if exists "see my battles" on public.duel_results;
create policy "see my battles" on public.duel_results for select to authenticated using (user_id = auth.uid() or opp_id = auth.uid());
drop policy if exists "record my battle" on public.duel_results;
create policy "record my battle" on public.duel_results for insert to authenticated with check (
  user_id = auth.uid() and opp_id <> auth.uid()
  and exists (select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id = opp_id)
  and started_at > now() - interval '3 hours' and started_at < now() + interval '5 minutes');
revoke update, delete on public.duel_results from authenticated, anon;
revoke all on public.duel_results from anon;

-- battles both players agree on, from one player's side
create or replace function public.duels_confirmed(uid uuid) returns table(opp_id uuid, result text, day date)
language sql stable security definer set search_path = public as $$
  select a.opp_id, a.result, (a.started_at at time zone 'Australia/Sydney')::date
  from duel_results a join duel_results b
    on b.user_id = a.opp_id and b.opp_id = a.user_id and b.code = a.code and b.started_at = a.started_at
  where a.user_id = uid
    and ((a.result = 'win' and b.result = 'lose') or (a.result = 'lose' and b.result = 'win') or (a.result = 'draw' and b.result = 'draw'));
$$;
create or replace function public.duel_wins(uid uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.duels_confirmed(uid) where result = 'win';
$$;
revoke execute on function public.duels_confirmed(uuid) from public, anon, authenticated;
revoke execute on function public.duel_wins(uuid) from public, anon, authenticated;

-- XP now includes battles
create or replace function public.xp_of(uid uuid) returns int language sql stable security definer set search_path = public as $$
  select (coalesce((select 2 * count(*) + 10 * sum(least(greatest(score, 0), greatest(out_of, 0))) from attempts where user_id = uid), 0)
        + 50 * (select count(*) from daily_sets where user_id = uid and finished_at is not null)
        + coalesce((select sum(50 * least(n, 5) + 100) from (select day, count(*) filter (where result = 'win') as n from public.duels_confirmed(uid) group by day) d), 0))::int;
$$;
revoke execute on function public.xp_of(uuid) from public, anon, authenticated;

-- friends: also their battle wins
drop function if exists public.my_friends();
create function public.my_friends() returns table(friend_id uuid, name text, streak int, best int, done_today boolean, level int, pet text, color text, border text, photo text, wins int)
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
         public.duel_wins(f.friend_id)
  from friends f join auth.users u on u.id = f.friend_id, t
  where f.user_id = auth.uid();
$$;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

-- me: total wins, today's battles, and my record against each friend
create or replace function public.my_duels() returns table(opp_id uuid, w int, l int, d int, today int)
language sql stable security definer set search_path = public as $$
  select opp_id, count(*) filter (where result = 'win')::int, count(*) filter (where result = 'lose')::int, count(*) filter (where result = 'draw')::int,
         count(*) filter (where day = (now() at time zone 'Australia/Sydney')::date)::int
  from public.duels_confirmed(auth.uid()) where auth.uid() is not null group by opp_id;
$$;
revoke execute on function public.my_duels() from public, anon;
grant execute on function public.my_duels() to authenticated;
select 'battles ready' as status;
