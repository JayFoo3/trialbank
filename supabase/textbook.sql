-- Private sets (the Margaret textbook): papers marked private are seen only by admins. Safe to re-run.
-- Their questions and images follow automatically (both policies only show questions of papers you can see).
-- Textbook sets use subject 'Book', so they never mix into practice, the Daily 5, papers or exams.
alter table public.papers add column if not exists private boolean not null default false;
alter policy "read papers" on public.papers using (
  (not private or (select public.is_admin()))
  and (((select public.my_dial()) >= 100) or (coalesce(release_pct, 0::numeric) < ((select public.my_dial()))::numeric)));
select 'private sets ready' as status;
