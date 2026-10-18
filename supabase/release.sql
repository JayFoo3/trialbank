-- Release dial: how much of Trialbank each kind of student gets. Safe to re-run.
--   settings.release_cohort  0-100  students on the class list (allowed_emails) or the roster
--   settings.release_public  0-100  everyone else
-- Admins always get 100. The dial controls which trial papers are visible (HSC papers always are; older and
-- easier ones come first, Smiths Hill's last) and which features unlock (see FEATURE_AT in site/app.js).
insert into public.settings (key, value) values ('release_cohort', '100'), ('release_public', '10')
on conflict (key) do nothing;

create or replace function public.is_cohort()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_emails where lower(email) = lower(coalesce(auth.email(), '')))
      or (auth.email() is not null and public.roster_match(auth.email()) is not null)
$$;

create or replace function public.my_release()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('dial', d, 'tier', t) from (
    select case when public.is_admin() then 100
                when public.is_cohort() then coalesce(nullif((select value from public.settings where key = 'release_cohort'), '')::int, 100)
                else coalesce(nullif((select value from public.settings where key = 'release_public'), '')::int, 10) end as d,
           case when public.is_admin() then 'admin' when public.is_cohort() then 'cohort' else 'public' end as t) x
$$;
grant execute on function public.my_release() to authenticated;

create or replace function public.my_dial()
returns int language sql stable security definer set search_path = public as $$
  select (public.my_release() ->> 'dial')::int
$$;
grant execute on function public.my_dial() to authenticated;

-- each trial paper's place in the release order, 0-100 within its subject
alter table public.papers add column if not exists release_pct numeric;
create or replace function public.refresh_release_order()
returns void language sql security definer set search_path = public as $$
  update public.papers set release_pct = 0 where difficulty = 'HSC';
  update public.papers p set release_pct = r.pct from (
    select id, 100.0 * (row_number() over (partition by subject order by
              case when school ilike 'smiths hill%' then 1 else 0 end,                 -- our own school's trials go last
              year asc,
              case difficulty when 'Easier' then 0 when 'Medium' then 1 when 'Hard' then 2 else 1 end,
              slug) - 1) / count(*) over (partition by subject) as pct
    from public.papers where difficulty is distinct from 'HSC') r
  where r.id = p.id;
$$;
create or replace function public.papers_release_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.refresh_release_order(); return null; end $$;
drop trigger if exists papers_release_order on public.papers;
create trigger papers_release_order after insert on public.papers
  for each statement execute function public.papers_release_trigger();
select public.refresh_release_order();

-- who sees what: papers by the dial, questions and their images only for visible papers
drop policy if exists "read papers" on public.papers;
create policy "read papers" on public.papers for select to authenticated
  using (public.my_dial() >= 100 or coalesce(release_pct, 0) < public.my_dial());
drop policy if exists "read questions" on public.questions;
create policy "read questions" on public.questions for select to authenticated
  using (paper_id in (select id from public.papers));
drop policy if exists "signed-in can read question images" on storage.objects;
create policy "signed-in can read question images" on storage.objects for select to authenticated
  using (bucket_id = 'questions' and split_part(name, '/', 1) in (select slug from public.papers));
-- counts follow the same rules
alter view public.topic_counts set (security_invoker = on);
alter view public.paper_summary set (security_invoker = on);

-- 'open' sign-up mode: anyone can make an account (they get the public dial)
create or replace function public.signup_reason(p_email text, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  dom  text := (select value from public.settings where key = 'allowed_domain');
  code text := coalesce((select value from public.settings where key = 'invite_code'), '');
  mode text := coalesce((select value from public.settings where key = 'signup_mode'), 'domain');
  listed boolean := exists (select 1 from public.allowed_emails where lower(email) = lower(p_email));
begin
  if mode = 'open' then return null; end if;
  if mode = 'whitelist' then
    if not listed then return 'That email is not on the class list'; end if;
  elsif lower(p_email) not like '%@' || lower(dom) and not listed then
    return 'Use your school email address';
  end if;
  if code <> '' and coalesce(p_code, '') <> code then
    return 'Wrong invite code';
  end if;
  return null;
end $$;

select subject, count(*) filter (where release_pct < 10 or difficulty = 'HSC') as public_at_10, count(*) as papers
from public.papers group by 1 order by 1;

-- the dial for any user (the automark Edge Function checks it with the service key)
create or replace function public.release_for(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  with u as (select lower(email) as e from auth.users where id = uid)
  select case
    when (select e from u) = any (select trim(lower(x)) from unnest(string_to_array((select value from public.settings where key = 'admin_emails'), ',')) x) then 100
    when exists (select 1 from public.allowed_emails a, u where lower(a.email) = u.e) or public.roster_match((select e from u)) is not null
      then coalesce(nullif((select value from public.settings where key = 'release_cohort'), '')::int, 100)
    else coalesce(nullif((select value from public.settings where key = 'release_public'), '')::int, 10) end
$$;
revoke execute on function public.release_for(uuid) from public, anon, authenticated;
