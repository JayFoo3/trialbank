-- Pro free week + referrals. Safe to re-run.
-- A "pass" is free Pro time: the one-off 7-day trial, or a week earned by referring a friend. Passes stack end to end.
-- Trials start admin-only: set pro_trials to 'on' to open them to everyone.
create table if not exists public.pro_passes (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts timestamptz not null default now(),
  ends timestamptz not null,
  reason text not null check (reason in ('trial', 'referral', 'admin')),
  created_at timestamptz default now()
);
create index if not exists pro_passes_user on public.pro_passes (user_id, ends);
alter table public.pro_passes enable row level security;
drop policy if exists "own passes" on public.pro_passes;
create policy "own passes" on public.pro_passes for select to authenticated using (auth.uid() = user_id);

create table if not exists public.referrals (
  invitee uuid primary key references auth.users(id) on delete cascade,
  referrer uuid not null references auth.users(id) on delete cascade,
  rewarded boolean not null default false,
  created_at timestamptz default now(),
  check (invitee <> referrer)
);
alter table public.referrals enable row level security;   -- only the functions below touch it

insert into public.settings (key, value) values ('pro_trials', 'admin'), ('pro_trial_days', '7'), ('pro_trial_marks', '1'),
  ('tutor_trial_msgs', '60'), ('referral_days', '7'), ('referral_max', '10'), ('referral_min_attempts', '10')
  on conflict (key) do nothing;

create or replace function public.has_pro_pass(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pro_passes where user_id = uid and starts <= now() and ends > now());
$$;
revoke execute on function public.has_pro_pass(uuid) from public, anon, authenticated;
grant execute on function public.has_pro_pass(uuid) to service_role;

-- give free Pro time, starting when their current free time ends
create or replace function public.grant_pass(uid uuid, days int, why text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare s timestamptz; e timestamptz;
begin
  s := greatest(now(), coalesce((select max(ends) from pro_passes where user_id = uid), now()));
  e := s + make_interval(days => days);
  insert into pro_passes (user_id, starts, ends, reason) values (uid, s, e, why);
  return e;
end $$;
revoke execute on function public.grant_pass(uuid, int, text) from public, anon, authenticated;
grant execute on function public.grant_pass(uuid, int, text) to service_role;

-- access_info: a subscriber or someone on a free pass is Pro (after admin and an admin's pinned level)
create or replace function public.access_info(uid uuid)
returns json language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid),
  s as (select coalesce(nullif((select value from settings where key = 'release_cohort'), '')::int, 100) as rc,
               coalesce(nullif((select value from settings where key = 'release_public'), '')::int, 10) as rp,
               coalesce((select value from settings where key = 'cohort_lite'), 'off') = 'on' as lite),
  f as (select (select e from u) = any (select trim(lower(x)) from unnest(string_to_array((select value from settings where key = 'admin_emails'), ',')) x) as adm,
               exists (select 1 from allowed_emails a, u where lower(a.email) = u.e) or public.roster_match((select e from u)) is not null as coh,
               public.has_bought(uid) as bought,
               public.has_pro_sub(uid) as paidsub,
               public.has_pro_pass(uid) as pass,
               (select level from user_access where user_id = uid) as ov),
  l as (select f.*, s.*, (f.paidsub or f.pass) as sub,
               case when f.adm then 'admin' when f.ov is not null then f.ov
                    when f.paidsub or f.pass then 'pro'
                    when f.coh then case when s.lite then 'lite' else 'full' end
                    when f.bought then 'full' else 'free' end as lvl,
               case when f.adm then 100
                    when f.ov = 'free' then s.rp
                    when f.ov is not null then 100
                    when f.paidsub or f.pass then 100
                    when f.coh then s.rc
                    when f.bought then 100 else s.rp end as dial
        from f, s)
  select json_build_object(
    'dial', dial,
    'features', case when lvl = 'lite' then least(dial, 20) else dial end,
    'level', lvl,
    'tier', case when adm then 'admin' when paidsub then 'paid' when pass then 'trial' when coh then 'cohort' when bought then 'paid' else 'public' end,
    'lite', lvl = 'lite',
    'pinned', ov is not null,
    'sub', sub,
    'trial', pass and not paidsub)
  from l
$$;
revoke execute on function public.access_info(uuid) from public, anon, authenticated;
grant execute on function public.access_info(uuid) to service_role;

-- Pro marks: 5 a month for subscribers, fewer on a free pass
create or replace function public.pro_left(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when public.access_info(uid) ->> 'level' = 'pro' then greatest(0,
           case when public.has_pro_sub(uid) then coalesce(nullif((select value from settings where key = 'pro_monthly_marks'), '')::int, 5)
                else coalesce(nullif((select value from settings where key = 'pro_trial_marks'), '')::int, 1) end
           - (select count(*)::int from mark_sessions where user_id = uid and source = 'pro'
                and created_at >= (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney')))
         else 0 end
$$;
revoke execute on function public.pro_left(uuid) from public, anon, authenticated;
grant execute on function public.pro_left(uuid) to service_role;

-- tutor messages a month: subscribers get the full amount, free passes a taster
create or replace function public.tutor_allowance(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when public.has_pro_pass(uid) and not public.has_pro_sub(uid)
              then coalesce(nullif((select value from settings where key = 'tutor_trial_msgs'), '')::int, 60)
              else coalesce(nullif((select value from settings where key = 'tutor_user_monthly_msgs'), '')::int, 300) end
$$;
revoke execute on function public.tutor_allowance(uuid) from public, anon, authenticated;
grant execute on function public.tutor_allowance(uuid) to service_role;

create or replace function public.my_tutor_left() returns json language sql stable security definer set search_path = public as $$
  with s as (
    select public.tutor_allowance(auth.uid()) as allowance,
           coalesce(lower(auth.email()) = any (regexp_split_to_array(lower(coalesce((select value from settings where key = 'admin_emails'), '')), '[\s,]+')), false) as admin,
           (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney') as since
  )
  select json_build_object(
    'allowance', s.allowance,
    'used', (select count(*) from tutor_runs r where r.user_id = auth.uid() and r.created_at >= s.since and r.error is null),
    'unlimited', s.admin,
    'refills', (date_trunc('month', now() at time zone 'Australia/Sydney') + interval '1 month')::date)
  from s;
$$;
grant execute on function public.my_tutor_left() to authenticated;

-- start the one free week
create or replace function public.start_trial()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare mode text := coalesce((select value from settings where key = 'pro_trials'), 'admin');
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if mode = 'off' or (mode = 'admin' and not public.is_admin()) then raise exception 'Free trials are not open yet.'; end if;
  if public.has_pro_sub(auth.uid()) then raise exception 'You''re already on Pro.'; end if;
  if exists (select 1 from pro_passes where user_id = auth.uid() and reason = 'trial') then raise exception 'You''ve already had your free week.'; end if;
  return public.grant_pass(auth.uid(), coalesce(nullif((select value from settings where key = 'pro_trial_days'), '')::int, 7), 'trial');
end $$;
grant execute on function public.start_trial() to authenticated;

-- a new account that joined through a friend's link: remember who invited them (rewarded later)
create or replace function public.claim_referral(friend_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if auth.uid() is null then return false; end if;
  select user_id into rid from friend_codes where code = upper(regexp_replace(friend_code, '[^A-Za-z0-9]', '', 'g'));
  if rid is null or rid = auth.uid() then return false; end if;
  if (select created_at from auth.users where id = auth.uid()) < now() - interval '14 days' then return false; end if;   -- only new accounts count
  insert into referrals (invitee, referrer) values (auth.uid(), rid) on conflict (invitee) do nothing;
  return found;
end $$;
grant execute on function public.claim_referral(text) to authenticated;

-- once the new friend has actually studied a bit, both of you get a free week (the inviter up to referral_max times)
create or replace function public.settle_referral()
returns json language plpgsql security definer set search_path = public as $$
declare r record; days int := coalesce(nullif((select value from settings where key = 'referral_days'), '')::int, 7);
begin
  select * into r from referrals where invitee = auth.uid() and not rewarded;
  if not found then return null; end if;
  if (select count(*) from attempts where user_id = auth.uid()) < coalesce(nullif((select value from settings where key = 'referral_min_attempts'), '')::int, 10) then
    return json_build_object('pending', true);
  end if;
  update referrals set rewarded = true where invitee = auth.uid();
  perform public.grant_pass(auth.uid(), days, 'referral');
  if (select count(*) from referrals where referrer = r.referrer and rewarded) <= coalesce(nullif((select value from settings where key = 'referral_max'), '')::int, 10) then
    perform public.grant_pass(r.referrer, days, 'referral');
  end if;
  return json_build_object('rewarded', true, 'days', days);
end $$;
grant execute on function public.settle_referral() to authenticated;

-- what the site shows on the Pro card
create or replace function public.my_pro()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'sale', coalesce((select value from settings where key = 'pro_sales'), 'admin'),
    'trials', coalesce((select value from settings where key = 'pro_trials'), 'admin'),
    'plan', s.plan, 'status', s.status, 'period_end', s.period_end, 'cancel_at_period_end', s.cancel_at_period_end,
    'active', public.has_pro_sub(auth.uid()),
    'pass', public.has_pro_pass(auth.uid()),
    'pass_end', (select max(ends) from pro_passes where user_id = auth.uid() and ends > now()),
    'trial_used', exists (select 1 from pro_passes where user_id = auth.uid() and reason = 'trial'),
    'referred', (select count(*) from referrals where referrer = auth.uid() and rewarded),
    'referral_pending', (select count(*) from referrals where referrer = auth.uid() and not rewarded),
    'referral_days', coalesce(nullif((select value from settings where key = 'referral_days'), '')::int, 7),
    'trial_days', coalesce(nullif((select value from settings where key = 'pro_trial_days'), '')::int, 7))
  from (select 1) x left join subscriptions s on s.user_id = auth.uid();
$$;
grant execute on function public.my_pro() to authenticated;
select 'pro trial ready' as status;
