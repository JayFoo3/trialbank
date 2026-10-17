-- original PDFs: paper only, and paper with solutions (private bucket, signed URLs)
alter table public.papers add column if not exists pdf_path text;
alter table public.papers add column if not exists pdf_sol_path text;
