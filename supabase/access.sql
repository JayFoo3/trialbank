-- Per-account access levels. An admin can pin anyone to Free, Lite, Full or Pro from the Accounts table;
-- "Auto" (no row here) keeps the normal rules: cohort -> Lite or Full (cohort_lite), buyers -> Full, everyone else -> Free.
-- Run once in the Supabase SQL editor (safe to re-run).

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level   text not null check (level in ('free', 'lite', 'full', 'pro')),
  set_by  text,
  set_at  timestamptz not null default now()
);
alter table public.user_access enable row level security;
drop policy if exists "admin access" on public.user_access;
create policy "admin access" on public.user_access for select to authenticated using (public.is_admin());
-- no write policies: only admin_set_access below changes it

insert into public.settings (key, value) values ('pro_monthly_marks', '5') on conflict (key) do nothing;

-- Pro marks are personal monthly marks: they are recorded as marking sessions with source 'pro'
alter table public.mark_sessions add column if not exists source text not null default 'credit';

-- 1. one place that works out what an account gets
create or replace function public.access_info(uid uuid)
returns json language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid),
  s as (select coalesce(nullif((select value from settings where key = 'release_cohort'), '')::int, 100) as rc,
               coalesce(nullif((select value from settings where key = 'release_public'), '')::int, 10) as rp,
               coalesce((select value from settings where key = 'cohort_lite'), 'off') = 'on' as lite),
  f as (select (select e from u) = any (select trim(lower(x)) from unnest(string_to_array((select value from settings where key = 'admin_emails'), ',')) x) as adm,
               exists (select 1 from allowed_emails a, u where lower(a.email) = u.e) or public.roster_match((select e from u)) is not null as coh,
               public.has_bought(uid) as bought,
               (select level from user_access where user_id = uid) as ov),
  l as (select f.*, s.*,
               case when f.adm then 'admin' when f.ov is not null then f.ov
                    when f.coh then case when s.lite then 'lite' else 'full' end
                    when f.bought then 'full' else 'free' end as lvl,
               case when f.adm then 100
                    when f.ov = 'free' then s.rp
                    when f.ov is not null then 100
                    when f.coh then s.rc
                    when f.bought then 100 else s.rp end as dial
        from f, s)
  select json_build_object(
    'dial', dial,
    'features', case when lvl = 'lite' then least(dial, 20) else dial end,
    'level', lvl,
    'tier', case when adm then 'admin' when coh then 'cohort' when bought then 'paid' else 'public' end,
    'lite', lvl = 'lite',
    'pinned', ov is not null)
  from l
$$;
revoke execute on function public.access_info(uuid) from public, anon, authenticated;

-- 2. the site and the auto-marker both read it
create or replace function public.my_release()
returns json language sql stable security definer set search_path = public as $$
  select public.access_info(auth.uid())
$$;
grant execute on function public.my_release() to authenticated;

create or replace function public.release_for(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select (public.access_info(uid) ->> 'features')::int
$$;
revoke execute on function public.release_for(uuid) from public, anon, authenticated;
grant execute on function public.release_for(uuid) to service_role;

-- 3. Pro: personal auto-marks each month (Sydney months), used before any bought marks
create or replace function public.pro_left(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when public.access_info(uid) ->> 'level' = 'pro' then greatest(0,
           coalesce(nullif((select value from settings where key = 'pro_monthly_marks'), '')::int, 5)
           - (select count(*)::int from mark_sessions where user_id = uid and source = 'pro'
                and created_at >= (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney')))
         else 0 end
$$;
revoke execute on function public.pro_left(uuid) from public, anon, authenticated;
grant execute on function public.pro_left(uuid) to service_role;

-- can this account start a paid (personal) marking session right now?
create or replace function public.can_claim(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.pro_left(uid) > 0 or coalesce((select balance from mark_credits where user_id = uid), 0) > 0
$$;
revoke execute on function public.can_claim(uuid) from public, anon, authenticated;
grant execute on function public.can_claim(uuid) to service_role;

-- claim one mark for a session: a Pro monthly mark first, otherwise a bought one (use_mark)
create or replace function public.claim_mark(uid uuid, sess text, paper int)
returns boolean language plpgsql security definer set search_path = public as $$
declare s record; n int;
begin
  select * into s from mark_sessions where id = sess;
  if found then
    return s.user_id = uid and s.paper_id is not distinct from paper and s.created_at > now() - interval '6 hours';
  end if;
  if public.pro_left(uid) > 0 then
    insert into mark_sessions (id, user_id, paper_id, source) values (sess, uid, paper, 'pro') on conflict (id) do nothing;
    get diagnostics n = row_count;
    return n > 0 or exists (select 1 from mark_sessions where id = sess and user_id = uid);
  end if;
  return public.use_mark(uid, sess, paper);
end $$;
revoke execute on function public.claim_mark(uuid, text, int) from public, anon, authenticated;
grant execute on function public.claim_mark(uuid, text, int) to service_role;

-- what the site shows next to "Upload your working"
create or replace function public.my_marks()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'balance', coalesce((select balance from mark_credits where user_id = auth.uid()), 0),
    'pro_left', public.pro_left(auth.uid()),
    'bought', public.has_bought(auth.uid()),
    'can_buy', public.can_buy_for(auth.uid()));
$$;
grant execute on function public.my_marks() to authenticated;

-- 4. admin: the accounts list now carries each account's level, and a way to change it
drop function if exists public.admin_users();
create function public.admin_users()
returns table (email text, given_name text, created_at timestamptz, last_sign_in_at timestamptz, attempts bigint,
               roster_name text, matched_by text, level text, pinned text, marks int)
language sql security definer stable set search_path = public as $$
  select u.email::text,
         u.raw_user_meta_data->>'first_name',
         u.created_at, u.last_sign_in_at,
         (select count(*) from public.attempts a where a.user_id = u.id),
         coalesce(public.roster_match(u.email), public.roster_match_name(u.raw_user_meta_data->>'first_name')),
         case when public.roster_match(u.email) is not null then 'email'
              when public.roster_match_name(u.raw_user_meta_data->>'first_name') is not null then 'name' end,
         public.access_info(u.id) ->> 'level',
         (select level from public.user_access x where x.user_id = u.id),
         coalesce((select balance from public.mark_credits c where c.user_id = u.id), 0)
  from auth.users u
  where public.is_admin()
  order by u.created_at desc
$$;
grant execute on function public.admin_users() to authenticated;

create or replace function public.admin_set_access(target_email text, lvl text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select id into uid from auth.users where lower(email) = lower(target_email);
  if uid is null then raise exception 'No account with that email'; end if;
  if lvl = 'auto' then
    delete from user_access where user_id = uid;
  elsif lvl in ('free', 'lite', 'full', 'pro') then
    insert into user_access (user_id, level, set_by) values (uid, lvl, auth.email())
      on conflict (user_id) do update set level = excluded.level, set_by = excluded.set_by, set_at = now();
  else
    raise exception 'Unknown level %', lvl;
  end if;
  return public.access_info(uid) ->> 'level';
end $$;
grant execute on function public.admin_set_access(text, text) to authenticated;

select u.email, public.access_info(u.id) ->> 'level' as level from auth.users u order by u.created_at desc limit 8;
