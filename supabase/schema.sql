-- Cohort question bank: run this once in the Supabase SQL editor.

-- ---------- settings ----------
create table if not exists settings (
  key   text primary key,
  value text not null
);
insert into settings (key, value) values
  ('allowed_domain', 'education.nsw.gov.au'),
  ('invite_code',    'CHANGE-ME')
on conflict (key) do nothing;

-- extra addresses allowed outside the school domain (your own, for testing)
create table if not exists allowed_emails (
  email text primary key
);

-- ---------- sign-up gate: school email + invite code ----------
create or replace function public.check_signup()
returns trigger language plpgsql security definer as $$
declare
  dom  text := (select value from settings where key = 'allowed_domain');
  code text := (select value from settings where key = 'invite_code');
begin
  if lower(new.email) not like '%@' || lower(dom)
     and not exists (select 1 from allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'Use your school email address';
  end if;
  if coalesce(new.raw_user_meta_data->>'invite', '') <> code then
    raise exception 'Wrong invite code';
  end if;
  return new;
end $$;

drop trigger if exists check_signup on auth.users;
create trigger check_signup before insert on auth.users
  for each row execute function public.check_signup();

-- ---------- content ----------
create table if not exists papers (
  id         serial primary key,
  slug       text unique not null,
  subject    text not null,
  school     text not null,
  year       int,
  difficulty text,
  sha256     text unique,
  pages      int,
  scanned    boolean default false
);

create table if not exists questions (
  id            text primary key,              -- '<slug>/<qid>'
  paper_id      int references papers(id) on delete cascade,
  qid           text not null,                 -- 'q07', 'q11a'
  number        int not null,
  part          text,
  type          text not null,                 -- 'mcq' | 'short'
  marks         int,
  topic         text,
  topics        text[],
  subparts      text[],
  answer        text,                          -- MCQ letter
  image_path    text,
  solution_path text,
  coarse        boolean default false,
  text          text
);
create index if not exists questions_topic on questions (topic);
create index if not exists questions_paper on questions (paper_id);

-- ---------- attempts ----------
create table if not exists attempts (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  score       int not null,                    -- marks awarded
  out_of      int not null,
  chosen      text,                            -- MCQ letter picked
  created_at  timestamptz default now()
);
create index if not exists attempts_user on attempts (user_id, created_at desc);

-- ---------- row level security ----------
alter table settings       enable row level security;
alter table allowed_emails enable row level security;
alter table papers         enable row level security;
alter table questions      enable row level security;
alter table attempts       enable row level security;

create policy "read papers"    on papers    for select to authenticated using (true);
create policy "read questions" on questions for select to authenticated using (true);
create policy "own attempts"   on attempts  for all    to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- views the app reads ----------
-- question counts per subject/topic (for the picker)
create or replace view topic_counts as
  select p.subject, q.topic, q.type, count(*) as n
  from questions q join papers p on p.id = q.paper_id
  where q.topic is not null
  group by p.subject, q.topic, q.type;

-- my accuracy per topic
create or replace view my_topic_stats as
  select p.subject, q.topic,
         count(*)            as attempts,
         sum(a.score)        as score,
         sum(a.out_of)       as out_of
  from attempts a
  join questions q on q.id = a.question_id
  join papers p    on p.id = q.paper_id
  where a.user_id = auth.uid()
  group by p.subject, q.topic;

-- whole cohort accuracy per topic (anonymous)
create or replace function cohort_topic_stats(subj text)
returns table (topic text, students bigint, attempts bigint, score bigint, out_of bigint)
language sql security definer stable as $$
  select q.topic, count(distinct a.user_id), count(*), sum(a.score), sum(a.out_of)
  from attempts a
  join questions q on q.id = a.question_id
  join papers p    on p.id = q.paper_id
  where p.subject = subj and q.topic is not null
  group by q.topic
$$;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('questions', 'questions', false)
on conflict (id) do nothing;
create policy "signed-in can read question images" on storage.objects
  for select to authenticated using (bucket_id = 'questions');
