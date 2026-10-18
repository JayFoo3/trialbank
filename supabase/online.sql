-- online questions: stored as content and answered on screen (the Software Engineering HSC is online)
alter table public.questions add column if not exists content jsonb;
alter table public.papers add column if not exists online boolean not null default false;
