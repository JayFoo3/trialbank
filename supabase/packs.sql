-- Marking packs: students buy auto-marks with Stripe; each one is theirs, separate from the free monthly pool.
-- Run once in the Supabase SQL editor (safe to re-run).

-- 1. each student's balance, and a history of every change to it
create table if not exists public.mark_credits (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.mark_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      int not null,                                   -- +25 bought, -1 used, +1 refunded
  kind       text not null check (kind in ('purchase', 'use', 'refund', 'grant', 'adjust')),
  ref        text,                                           -- Stripe checkout session id, or the marking session
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists mark_ledger_user on public.mark_ledger (user_id, created_at desc);
-- a Stripe payment can only ever add marks once, even if Stripe sends the same event twice
create unique index if not exists mark_ledger_one_purchase on public.mark_ledger (ref) where kind = 'purchase';

-- one paper upload = one mark: the auto-marker is called once per section, so the first section claims the mark
-- and the other sections (and re-marks of the same upload) ride on the same session
create table if not exists public.mark_sessions (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  paper_id   int,
  created_at timestamptz not null default now()
);

alter table public.mark_credits enable row level security;
alter table public.mark_ledger enable row level security;
alter table public.mark_sessions enable row level security;
drop policy if exists "own credits" on public.mark_credits;
drop policy if exists "own ledger" on public.mark_ledger;
drop policy if exists "admin credits" on public.mark_credits;
drop policy if exists "admin ledger" on public.mark_ledger;
create policy "own credits" on public.mark_credits for select to authenticated using (user_id = auth.uid());
create policy "own ledger" on public.mark_ledger for select to authenticated using (user_id = auth.uid());
create policy "admin credits" on public.mark_credits for select to authenticated using (public.is_admin());
create policy "admin ledger" on public.mark_ledger for select to authenticated using (public.is_admin());
-- no insert/update policies: balances only change through the functions below, run by the server

alter table public.automark_runs add column if not exists paid boolean not null default false;
alter table public.automark_runs add column if not exists session_id text;

insert into public.settings (key, value) values
  ('packs_enabled', 'off'),             -- show the Buy marks button at all
  ('packs_cohort', 'off'),              -- let the cohort buy (off until after trials)
  ('automark_paid_cap_usd', '50'),      -- safety cap on paid marking spend per month
  ('automark_paid_daily_calls', '60')   -- paid sections per student per day (a paper is several sections)
on conflict (key) do nothing;

-- 2. add marks (Stripe receiver, admin grants). Idempotent for purchases: the same Stripe session adds once.
create or replace function public.add_marks(uid uuid, n int, k text, r text, nt text default null)
returns int language plpgsql security definer set search_path = public as $$
declare added int; bal int;
begin
  if n = 0 then return coalesce((select balance from mark_credits where user_id = uid), 0); end if;
  insert into mark_ledger (user_id, delta, kind, ref, note) values (uid, n, k, r, nt)
    on conflict (ref) where kind = 'purchase' do nothing;
  get diagnostics added = row_count;
  if added = 0 then return coalesce((select balance from mark_credits where user_id = uid), 0); end if;
  insert into mark_credits (user_id, balance) values (uid, greatest(n, 0))
    on conflict (user_id) do update set balance = greatest(mark_credits.balance + n, 0), updated_at = now()
    returning balance into bal;
  return bal;
end $$;
revoke execute on function public.add_marks(uuid, int, text, text, text) from public, anon, authenticated;

-- 3. claim a mark for a marking session. True if this session is (now) paid for.
create or replace function public.use_mark(uid uuid, sess text, paper int)
returns boolean language plpgsql security definer set search_path = public as $$
declare s record; claimed int;
begin
  select * into s from mark_sessions where id = sess;
  if found then
    return s.user_id = uid and s.paper_id is not distinct from paper and s.created_at > now() - interval '6 hours';
  end if;
  update mark_credits set balance = balance - 1, updated_at = now() where user_id = uid and balance > 0;
  get diagnostics claimed = row_count;
  if claimed = 0 then return false; end if;
  insert into mark_sessions (id, user_id, paper_id) values (sess, uid, paper) on conflict (id) do nothing;
  get diagnostics claimed = row_count;
  if claimed = 0 then   -- another section claimed it at the same moment: give this one back
    update mark_credits set balance = balance + 1 where user_id = uid;
    return exists (select 1 from mark_sessions where id = sess and user_id = uid);
  end if;
  insert into mark_ledger (user_id, delta, kind, ref) values (uid, -1, 'use', sess);
  return true;
end $$;
revoke execute on function public.use_mark(uuid, text, int) from public, anon, authenticated;

-- is this session already paid for (so its other sections can run on the paid path)?
create or replace function public.session_paid(uid uuid, sess text, paper int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mark_sessions where id = sess and user_id = uid
                 and paper_id is not distinct from paper and created_at > now() - interval '6 hours');
$$;
revoke execute on function public.session_paid(uuid, text, int) from public, anon, authenticated;

-- has this person ever bought marks? (buyers outside the cohort get the full site)
create or replace function public.has_bought(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mark_ledger where user_id = uid and kind = 'purchase');
$$;
revoke execute on function public.has_bought(uuid) from public, anon, authenticated;

-- 4. may this person buy? Packs must be switched on, and the cohort only once packs_cohort is on (after trials)
create or replace function public.can_buy_for(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid)
  select coalesce((select value from settings where key = 'packs_enabled'), 'off') = 'on'
     and (coalesce((select value from settings where key = 'packs_cohort'), 'off') = 'on'
          or not (exists (select 1 from allowed_emails a, u where lower(a.email) = u.e)
                  or public.roster_match((select e from u)) is not null));
$$;
revoke execute on function public.can_buy_for(uuid) from public, anon, authenticated;

-- what the site shows: balance, and whether this person may buy
create or replace function public.my_marks()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'balance', coalesce((select balance from mark_credits where user_id = auth.uid()), 0),
    'bought', public.has_bought(auth.uid()),
    'can_buy', public.can_buy_for(auth.uid()));
$$;
grant execute on function public.my_marks() to authenticated;

-- 5. admins can give marks (testing, prizes, sorting out a problem)
create or replace function public.admin_grant_marks(target_email text, n int, why text default null)
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select id into uid from auth.users where lower(email) = lower(target_email);
  if uid is null then raise exception 'No account with that email'; end if;
  return public.add_marks(uid, n, case when n >= 0 then 'grant' else 'adjust' end, null, why);
end $$;
grant execute on function public.admin_grant_marks(text, int, text) to authenticated;

-- 6. buyers outside the cohort get the full site (dial 100); the cohort stays on its own dial
create or replace function public.my_release()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('dial', d, 'tier', t) from (
    select case when public.is_admin() then 100
                when public.is_cohort() then coalesce(nullif((select value from public.settings where key = 'release_cohort'), '')::int, 100)
                when public.has_bought(auth.uid()) then 100
                else coalesce(nullif((select value from public.settings where key = 'release_public'), '')::int, 10) end as d,
           case when public.is_admin() then 'admin' when public.is_cohort() then 'cohort'
                when public.has_bought(auth.uid()) then 'paid' else 'public' end as t) x
$$;
grant execute on function public.my_release() to authenticated;

create or replace function public.release_for(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid)
  select case
    when (select e from u) = any (select trim(lower(x)) from unnest(string_to_array((select value from public.settings where key = 'admin_emails'), ',')) x) then 100
    when exists (select 1 from public.allowed_emails a, u where lower(a.email) = u.e) or public.roster_match((select e from u)) is not null
      then coalesce(nullif((select value from public.settings where key = 'release_cohort'), '')::int, 100)
    when public.has_bought(uid) then 100
    else coalesce(nullif((select value from public.settings where key = 'release_public'), '')::int, 10) end
$$;
revoke execute on function public.release_for(uuid) from public, anon, authenticated;
grant execute on function public.release_for(uuid) to service_role;

grant execute on function public.add_marks(uuid, int, text, text, text) to service_role;
grant execute on function public.use_mark(uuid, text, int) to service_role;
grant execute on function public.session_paid(uuid, text, int) to service_role;
grant execute on function public.has_bought(uuid) to service_role;
grant execute on function public.can_buy_for(uuid) to service_role;
