-- Flags tutor replies that declined an out-of-scope request (code, files, essays, batch marking). Safe to re-run.
alter table public.tutor_runs add column if not exists off_topic boolean not null default false;
create index if not exists tutor_runs_off_topic on public.tutor_runs (user_id, created_at) where off_topic;
select 'tutor scope ready' as status;
