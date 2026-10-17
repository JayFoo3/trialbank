-- which marks were lost on an attempt, and why: [{"mark":3,"reason":"concept"}, ...]
alter table public.attempts add column if not exists lost jsonb;
