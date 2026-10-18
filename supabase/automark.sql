-- Automarker: students upload their written paper, an Edge Function asks Claude to mark it.

-- 1. private bucket for uploaded pages; each student can only touch their own folder
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false)
  on conflict (id) do nothing;
drop policy if exists "own submissions read" on storage.objects;
drop policy if exists "own submissions write" on storage.objects;
drop policy if exists "own submissions delete" on storage.objects;
create policy "own submissions read" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own submissions write" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own submissions delete" on storage.objects for delete to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. spend log (written only by the Edge Function with the service key)
create table if not exists public.automark_runs (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  paper_id    int references public.papers(id) on delete set null,
  created_at  timestamptz default now(),
  n_questions int,
  n_pages     int,
  input_tokens int, output_tokens int, cache_write int, cache_read int,
  cost_usd    numeric(10,5) not null default 0,
  error       text
);
alter table public.automark_runs enable row level security;
drop policy if exists "admin reads automark runs" on public.automark_runs;
create policy "admin reads automark runs" on public.automark_runs for select to authenticated using (is_admin());

-- 3. limits (editable on the Admin page)
insert into public.settings (key, value) values
  ('automark_enabled', 'on'),
  ('automark_monthly_cap_usd', '20'),
  ('automark_daily_calls', '16')
on conflict (key) do nothing;

-- 4. admin summary
create or replace function public.automark_spend()
returns table (month_usd numeric, month_runs bigint, all_usd numeric)
language sql security definer set search_path = public as $$
  select coalesce(sum(cost_usd) filter (where created_at >= date_trunc('month', now() at time zone 'utc')), 0),
         count(*) filter (where created_at >= date_trunc('month', now() at time zone 'utc')),
         coalesce(sum(cost_usd), 0)
  from automark_runs where is_admin();
$$;
grant execute on function public.automark_spend() to authenticated;

-- per-student monthly budget (US$), editable on the Admin page
insert into public.settings (key, value) values ('automark_user_monthly_usd', '2') on conflict (key) do nothing;
