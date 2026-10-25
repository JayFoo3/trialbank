-- Security hardening (Oct 2026). Safe to re-run.

-- 1. Signed-out visitors can call no database functions except the sign-up check.
--    (Supabase grants every new function to anon by default; take that away, now and for future functions.)
revoke execute on all functions in schema public from anon, public;
alter default privileges in schema public revoke execute on functions from anon, public;
grant execute on function public.signup_reason(text, text) to anon, authenticated;
-- everything the site calls while signed in keeps working (explicit, in case any relied on the PUBLIC grant)
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = any (array['my_tutor_left','my_pro','my_release','my_friend_code','my_automark_usage','add_friend',
             'start_trial','settle_referral','remove_friend','paper_pool','my_marks','my_level','my_friends','log_visit','is_admin','daily_pool',
             'cohort_topic_stats','claim_referral','automark_spend','automark_pool','admin_users','admin_usage','admin_test_alert','admin_stats',
             'admin_set_access','admin_resolve_flags','admin_remove_user','admin_flags','my_dial','admin_grant_marks']) loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- 2. Internal helpers that only other functions should use: nobody can call them directly.
--    send_alert pushes to the admin's phone; the roster ones would reveal who is on the class list.
do $$
declare f text;
begin
  foreach f in array array['send_alert(text,text)', 'roster_match(text)', 'roster_match_name(text)', 'refresh_release_order()', 'is_cohort()'] loop
    begin execute format('revoke execute on function public.%s from authenticated', f); exception when undefined_function then null; end;
  end loop;
end $$;

-- 3. Sanity limits on what students can write themselves.
alter table public.attempts drop constraint if exists attempts_score_range;
alter table public.attempts add constraint attempts_score_range
  check (out_of between 0 and 100 and score between 0 and out_of) not valid;   -- old rows are left alone
alter table public.question_flags drop constraint if exists question_flags_note_len;
alter table public.question_flags add constraint question_flags_note_len check (note is null or length(note) <= 500) not valid;

-- 4. "Name not on class list" alert: only the first time a name is set, so changing it over and over can't spam the admin's phone.
create or replace function public.notify_name()
returns trigger language plpgsql security definer set search_path = public as $$
declare n text := new.raw_user_meta_data->>'first_name';
begin
  if n is not null and (old.raw_user_meta_data->>'first_name') is null
     and exists (select 1 from public.roster)
     and public.roster_match(new.email) is null
     and public.roster_match_name(n) is null
     and not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    perform public.send_alert('Trialbank: name not on class list', new.email || ' says they are "' || left(n, 60) || '". Tap to review.');
  end if;
  return new;
exception when others then
  return new;
end $$;


-- 5. Auto-marking: reserve a run under a per-student lock before calling the AI, so parallel requests can't slip past the caps.
--    Sums run in the database (no 1,000-row limit). The pending row is updated with the real cost afterwards.
alter table public.automark_runs add column if not exists paid boolean default false;
alter table public.automark_runs add column if not exists session_id text;
create or replace function public.automark_reserve(uid uuid, is_paid boolean, est numeric, per_day int, user_cap numeric, pool_cap numeric, sess text, paper int, npages int)
returns json language plpgsql security definer set search_path = public as $$
declare rid bigint; m timestamptz := date_trunc('month', now());
begin
  perform pg_advisory_xact_lock(hashtext('am:' || uid::text));
  perform pg_advisory_xact_lock(hashtext('am-pool:' || is_paid::text));
  if (select coalesce(sum(cost_usd), 0) from automark_runs where paid = is_paid and created_at >= m) >= pool_cap then return json_build_object('err', 'pool'); end if;
  if (select count(*) from automark_runs where user_id = uid and paid = is_paid and created_at > now() - interval '1 day') >= per_day then return json_build_object('err', 'day'); end if;
  if not is_paid and user_cap > 0 and (select coalesce(sum(cost_usd), 0) from automark_runs where user_id = uid and not paid and created_at >= m) >= user_cap then
    return json_build_object('err', 'user'); end if;
  insert into automark_runs (user_id, paper_id, n_questions, n_pages, cost_usd, error, paid, session_id)
    values (uid, paper, 0, npages, est, 'pending', is_paid, sess) returning id into rid;
  return json_build_object('id', rid);
end $$;
revoke execute on function public.automark_reserve(uuid, boolean, numeric, int, numeric, numeric, text, int, int) from public, anon, authenticated;
grant execute on function public.automark_reserve(uuid, boolean, numeric, int, numeric, numeric, text, int, int) to service_role;

-- one bought or Pro mark = one upload: tie a paid session to the exact pages it was opened with
alter table public.mark_sessions add column if not exists pages_key text;
create or replace function public.mark_session_pages(uid uuid, sess text, pk text)
returns boolean language plpgsql security definer set search_path = public as $$
declare k text;
begin
  update mark_sessions set pages_key = coalesce(pages_key, pk) where id = sess and user_id = uid returning pages_key into k;
  return k is not distinct from pk;
end $$;
revoke execute on function public.mark_session_pages(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_session_pages(uuid, text, text) to service_role;

-- a mark claimed for a run that then failed goes back, unless another run in that session is still going or worked
create or replace function public.refund_mark(uid uuid, sess text, keep bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare src text;
begin
  perform pg_advisory_xact_lock(hashtext('am:' || uid::text));
  if exists (select 1 from automark_runs where session_id = sess and user_id = uid and id is distinct from keep and (error is null or error = 'pending')) then return; end if;
  delete from mark_sessions where id = sess and user_id = uid returning source into src;
  if not found then return; end if;
  if coalesce(src, '') <> 'pro' then perform public.add_marks(uid, 1, 'refund', 'refund:' || sess, 'marking failed'); end if;
end $$;
revoke execute on function public.refund_mark(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.refund_mark(uuid, text, bigint) to service_role;

-- 6. Tutor: the same reservation, and the decision to spend a pack message, made under one lock.
create or replace function public.tutor_reserve(uid uuid, is_admin boolean, allowance int, per_day int, pool_cap numeric, off_daily int, since_month timestamptz)
returns json language plpgsql security definer set search_path = public as $$
declare rid bigint; used int; pack boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('tu:' || uid::text));
  if (select coalesce(sum(cost_usd), 0) from tutor_runs where created_at >= date_trunc('month', now())) >= pool_cap then return json_build_object('err', 'pool'); end if;
  if not is_admin then
    if (select count(*) from tutor_runs where user_id = uid and created_at > now() - interval '1 day') >= per_day then return json_build_object('err', 'day'); end if;
    if (select count(*) from tutor_runs where user_id = uid and off_topic and created_at > now() - interval '1 day') >= off_daily then return json_build_object('err', 'off'); end if;
    select count(*) into used from tutor_runs where user_id = uid and not from_pack and (error is null or error = 'pending') and created_at >= since_month;
    if used >= allowance then
      if not public.use_tutor_msg(uid) then return json_build_object('err', 'out', 'used', used); end if;
      pack := true;
    end if;
  end if;
  insert into tutor_runs (user_id, from_pack, cost_usd, error) values (uid, pack, 0.02, 'pending') returning id into rid;
  return json_build_object('id', rid, 'from_pack', pack, 'used', coalesce(used, 0));
end $$;
revoke execute on function public.tutor_reserve(uuid, boolean, int, int, numeric, int, timestamptz) from public, anon, authenticated;
grant execute on function public.tutor_reserve(uuid, boolean, int, int, numeric, int, timestamptz) to service_role;

-- 7. Uploads: images only, at most 4 MB each.
update storage.buckets set file_size_limit = 4000000, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'submissions';
update storage.buckets set file_size_limit = 4000000, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'profile';

select 'security hardening done' as status;
