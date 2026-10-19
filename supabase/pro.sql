-- Trialbank Pro subscriptions (Stripe): monthly or annual. A live subscription makes the account Pro until its period ends.
-- Safe to re-run. Sales start admin-only: set pro_sales to 'on' once Stripe is approved.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer text, sub_id text unique, plan text check (plan in ('monthly', 'annual')),
  status text, period_end timestamptz, cancel_at_period_end boolean default false,
  updated_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "own subscription" on public.subscriptions;
create policy "own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
-- written only by the stripe-webhook function (service key)

insert into public.settings (key, value) values ('pro_sales', 'admin'), ('tutor_user_monthly_msgs', '300') on conflict (key) do nothing;

create or replace function public.has_pro_sub(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from subscriptions where user_id = uid and status in ('active', 'trialing', 'past_due') and period_end > now());
$$;
revoke execute on function public.has_pro_sub(uuid) from public, anon, authenticated;
grant execute on function public.has_pro_sub(uuid) to service_role;

-- access_info: a paying Pro subscriber is Pro (after admin and an admin's pinned level)
create or replace function public.access_info(uid uuid)
returns json language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid),
  s as (select coalesce(nullif((select value from settings where key = 'release_cohort'), '')::int, 100) as rc,
               coalesce(nullif((select value from settings where key = 'release_public'), '')::int, 10) as rp,
               coalesce((select value from settings where key = 'cohort_lite'), 'off') = 'on' as lite),
  f as (select (select e from u) = any (select trim(lower(x)) from unnest(string_to_array((select value from settings where key = 'admin_emails'), ',')) x) as adm,
               exists (select 1 from allowed_emails a, u where lower(a.email) = u.e) or public.roster_match((select e from u)) is not null as coh,
               public.has_bought(uid) as bought,
               public.has_pro_sub(uid) as sub,
               (select level from user_access where user_id = uid) as ov),
  l as (select f.*, s.*,
               case when f.adm then 'admin' when f.ov is not null then f.ov
                    when f.sub then 'pro'
                    when f.coh then case when s.lite then 'lite' else 'full' end
                    when f.bought then 'full' else 'free' end as lvl,
               case when f.adm then 100
                    when f.ov = 'free' then s.rp
                    when f.ov is not null then 100
                    when f.sub then 100
                    when f.coh then s.rc
                    when f.bought then 100 else s.rp end as dial
        from f, s)
  select json_build_object(
    'dial', dial,
    'features', case when lvl = 'lite' then least(dial, 20) else dial end,
    'level', lvl,
    'tier', case when adm then 'admin' when sub then 'paid' when coh then 'cohort' when bought then 'paid' else 'public' end,
    'lite', lvl = 'lite',
    'pinned', ov is not null,
    'sub', sub)
  from l
$$;
revoke execute on function public.access_info(uuid) from public, anon, authenticated;
grant execute on function public.access_info(uuid) to service_role;

-- what the site shows on the Pro card
create or replace function public.my_pro()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'sale', coalesce((select value from settings where key = 'pro_sales'), 'admin'),
    'plan', s.plan, 'status', s.status, 'period_end', s.period_end, 'cancel_at_period_end', s.cancel_at_period_end,
    'active', public.has_pro_sub(auth.uid()))
  from (select 1) x left join subscriptions s on s.user_id = auth.uid();
$$;
grant execute on function public.my_pro() to authenticated;
select 'pro ready' as status;
