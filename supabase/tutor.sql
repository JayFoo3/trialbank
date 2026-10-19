-- Trialbank tutor (prototype): cost log, the slips it notices, and what it learns about how each student learns.
-- Safe to re-run.
create table if not exists public.tutor_runs (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  question_id   text,
  mode          text,
  input_tokens  int, output_tokens int, cache_write int, cache_read int,
  cost_usd      numeric(10,5) not null default 0,
  error         text,
  created_at    timestamptz default now()
);
create index if not exists tutor_runs_user on public.tutor_runs (user_id, created_at desc);
alter table public.tutor_runs enable row level security;   -- written by the tutor function only

create table if not exists public.tutor_slips (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text not null,
  question_id text,
  topic       text,
  kind        text,          -- concept | method | algebra | careless
  what        text not null, -- 'dropped the chain rule on e^(2x)'
  created_at  timestamptz default now()
);
create index if not exists tutor_slips_user on public.tutor_slips (user_id, created_at desc);
alter table public.tutor_slips enable row level security;
drop policy if exists "own slips" on public.tutor_slips;
create policy "own slips" on public.tutor_slips for select to authenticated using (auth.uid() = user_id);

create table if not exists public.tutor_notes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject    text not null,
  notes      text[] not null default '{}',   -- how this student learns best, newest last (kept to 8)
  updated_at timestamptz default now(),
  primary key (user_id, subject)
);
alter table public.tutor_notes enable row level security;
drop policy if exists "own notes" on public.tutor_notes;
create policy "own notes" on public.tutor_notes for select to authenticated using (auth.uid() = user_id);

-- who gets the tutor: admin (prototype) | pro | all
insert into public.settings (key, value) values
  ('tutor_access', 'admin'),
  ('tutor_enabled', 'on'),
  ('tutor_daily_msgs', '150'),
  ('tutor_monthly_cap_usd', '15')
on conflict (key) do nothing;

select 'tutor ready' as status;
