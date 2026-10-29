-- Auto-marking lockout: a student whose working the marker found inappropriate can't auto-mark again.
-- To lift it for someone:  delete from public.qmark_blocks where user_id = '<their id>';   Safe to re-run.
create table if not exists public.qmark_blocks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  question_id text,
  created_at timestamptz not null default now()
);
alter table public.qmark_blocks enable row level security;   -- no policies: only the server reads and writes it
revoke all on public.qmark_blocks from anon, authenticated;
select 'marking lockout ready' as status;
