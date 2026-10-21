-- Syllabus steps a question needs within its topic (tagged once by AI through the tag-skills function). null = not tagged yet.
alter table public.questions add column if not exists skills text[];
select 'skills column ready' as status;
