-- Tutor message packs: anyone can buy messages (150 or 300). Pro uses its monthly messages first, then pack messages.
-- Pack messages never expire. Sales start admin-only: set tutor_packs to 'on' to open them. Safe to re-run.
create table if not exists public.tutor_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz default now()
);
alter table public.tutor_credits enable row level security;
drop policy if exists "own tutor credits" on public.tutor_credits;
create policy "own tutor credits" on public.tutor_credits for select to authenticated using (auth.uid() = user_id);

create table if not exists public.tutor_credit_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null, kind text not null, ref text, note text,
  created_at timestamptz default now()
);
create unique index if not exists tutor_credit_ledger_purchase on public.tutor_credit_ledger (ref) where kind = 'purchase';
alter table public.tutor_credit_ledger enable row level security;   -- only the functions below touch it

alter table public.tutor_runs add column if not exists from_pack boolean not null default false;
insert into public.settings (key, value) values ('tutor_packs', 'admin') on conflict (key) do nothing;

-- add (or take back) messages; a Stripe purchase is only ever added once
create or replace function public.add_tutor_msgs(uid uuid, n int, k text, r text, nt text default null)
returns int language plpgsql security definer set search_path = public as $$
declare added int; bal int;
begin
  insert into tutor_credit_ledger (user_id, delta, kind, ref, note) values (uid, n, k, r, nt)
    on conflict (ref) where kind = 'purchase' do nothing;
  get diagnostics added = row_count;
  if added = 0 then return coalesce((select balance from tutor_credits where user_id = uid), 0); end if;
  insert into tutor_credits (user_id, balance) values (uid, greatest(n, 0))
    on conflict (user_id) do update set balance = greatest(tutor_credits.balance + n, 0), updated_at = now()
    returning balance into bal;
  return bal;
end $$;
revoke execute on function public.add_tutor_msgs(uuid, int, text, text, text) from public, anon, authenticated;
grant execute on function public.add_tutor_msgs(uuid, int, text, text, text) to service_role;

-- spend one pack message; false if there are none
create or replace function public.use_tutor_msg(uid uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update tutor_credits set balance = balance - 1, updated_at = now() where user_id = uid and balance > 0;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke execute on function public.use_tutor_msg(uuid) from public, anon, authenticated;
grant execute on function public.use_tutor_msg(uuid) to service_role;

-- the site's view: monthly allowance (0 without Pro), used this month (not counting pack messages), pack balance
create or replace function public.my_tutor_left() returns json language sql stable security definer set search_path = public as $$
  with s as (
    select case when (public.access_info(auth.uid()) ->> 'level') in ('pro', 'admin') then public.tutor_allowance(auth.uid()) else 0 end as allowance,
           coalesce(lower(auth.email()) = any (regexp_split_to_array(lower(coalesce((select value from settings where key = 'admin_emails'), '')), '[\s,]+')), false) as admin,
           (date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney') as since,
           date_trunc('month', now()) as utc_since
  ),
  site as (
    select coalesce(sum(cost_usd), 0) as spent,
           coalesce(sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0) + coalesce(cache_write, 0) + coalesce(cache_read, 0)), 0) as tokens,
           count(*) filter (where error is null) as msgs
    from tutor_runs, s where created_at >= s.utc_since
  )
  select json_build_object(
    'allowance', s.allowance,
    'used', (select count(*) from tutor_runs r where r.user_id = auth.uid() and r.created_at >= s.since and r.error is null and not r.from_pack),
    'credits', coalesce((select balance from tutor_credits where user_id = auth.uid()), 0),
    'packs', coalesce((select value from settings where key = 'tutor_packs'), 'admin'),
    'unlimited', s.admin,
    'refills', (date_trunc('month', now() at time zone 'Australia/Sydney') + interval '1 month')::date,
    'site', case when s.admin then json_build_object(
      'cap_usd', coalesce(nullif((select value from settings where key = 'tutor_monthly_cap_usd'), '')::numeric, 15),
      'spent_usd', round(site.spent::numeric, 4), 'tokens', site.tokens, 'msgs', site.msgs,
      'refills', (date_trunc('month', now()) + interval '1 month')::date) end)
  from s, site;
$$;
grant execute on function public.my_tutor_left() to authenticated;
select 'tutor packs ready' as status;
