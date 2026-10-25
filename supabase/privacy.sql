-- Data protection (Oct 2026). Safe to re-run.

-- 1. Download my data: everything Trialbank holds about the signed-in student, as one JSON document.
create or replace function public.my_data()
returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); out jsonb := '{}'::jsonb; t text; rows jsonb;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  select jsonb_build_object('email', email, 'created_at', created_at, 'last_sign_in_at', last_sign_in_at, 'profile_and_settings', raw_user_meta_data)
    into out from auth.users where id = uid;
  foreach t in array array['attempts', 'exams', 'bookmarks', 'topic_srs', 'daily_sets', 'tutor_notes', 'tutor_slips', 'tutor_runs', 'automark_runs',
                           'mark_credits', 'mark_ledger', 'mark_sessions', 'tutor_credits', 'tutor_credit_ledger', 'subscriptions', 'pro_passes',
                           'question_flags', 'friend_codes', 'visits', 'user_access'] loop
    begin
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.user_id = $1', t) into rows using uid;
      out := out || jsonb_build_object(t, rows);
    exception when undefined_table or undefined_column then null;
    end;
  end loop;
  out := out || jsonb_build_object(
    'friends', (select coalesce(jsonb_agg(jsonb_build_object('friend_id', friend_id)), '[]'::jsonb) from friends where user_id = uid),
    'referrals', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from referrals r where r.invitee = uid or r.referrer = uid),
    'exported_at', now());
  return out::json;
end $$;
revoke execute on function public.my_data() from public, anon;
grant execute on function public.my_data() to authenticated;

-- 2. Delete my account: removes the account and, through it, every row linked to it.
--    Uploaded photos are removed by the site first (each student can delete their own files); anything missed is swept up by the daily cleanup.
--    A running subscription must be cancelled first, so nobody is billed for an account that no longer exists.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from subscriptions where user_id = uid and status in ('active', 'trialing', 'past_due') and not coalesce(cancel_at_period_end, false)) then
    raise exception 'Cancel your Pro subscription first (Account, then Manage subscription), then delete your account.';
  end if;
  delete from friends where friend_id = uid;
  delete from auth.users where id = uid;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3. Clear what the tutor remembers about me.
create or replace function public.clear_my_tutor_memory()
returns void language sql security definer set search_path = public as $$
  delete from tutor_notes where user_id = auth.uid();
  delete from tutor_slips where user_id = auth.uid();
$$;
revoke execute on function public.clear_my_tutor_memory() from public, anon;
grant execute on function public.clear_my_tutor_memory() to authenticated;

-- 4. Year averages only for topics with at least 5 students, so nobody's own score can be picked out.
create or replace function public.cohort_topic_stats(subj text)
returns table (topic text, students bigint, attempts bigint, score bigint, out_of bigint)
language sql security definer stable set search_path = public as $$
  select q.topic, count(distinct a.user_id), count(*), sum(a.score), sum(a.out_of)
  from attempts a
  join questions q on q.id = a.question_id
  join papers p    on p.id = q.paper_id
  where p.subject = subj and q.topic is not null
  group by q.topic
  having count(distinct a.user_id) >= 5
$$;
revoke execute on function public.cohort_topic_stats(text) from public, anon;
grant execute on function public.cohort_topic_stats(text) to authenticated;

-- 5. Retention. Uploaded photos older than 7 days, and profile photos left behind by deleted accounts, are listed for the
--    cleanup function to delete. Page-visit logs are kept 13 months.
create or replace function public.expired_uploads(lim int default 1000)
returns table (bucket text, name text) language sql stable security definer set search_path = public, storage as $$
  (select o.bucket_id::text, o.name from storage.objects o
    where o.bucket_id = 'submissions' and o.created_at < now() - interval '7 days' limit lim)
  union all
  (select o.bucket_id::text, o.name from storage.objects o
    where o.bucket_id = 'profile' and not exists (select 1 from auth.users u where u.id::text = split_part(o.name, '/', 1)) limit lim)
$$;
revoke execute on function public.expired_uploads(int) from public, anon, authenticated;
grant execute on function public.expired_uploads(int) to service_role;

create or replace function public.privacy_cleanup()
returns json language plpgsql security definer set search_path = public as $$
declare v int := 0;
begin
  begin delete from visits where day < (now() - interval '13 months')::date; get diagnostics v = row_count; exception when undefined_table then null; end;
  return json_build_object('visits_deleted', v);
end $$;
revoke execute on function public.privacy_cleanup() from public, anon, authenticated;
grant execute on function public.privacy_cleanup() to service_role;

-- 6. Run the cleanup function every night at 3:17am Sydney time (16:17 UTC in daylight saving; close enough all year).
create extension if not exists pg_cron;
select cron.unschedule('trialbank-cleanup') where exists (select 1 from cron.job where jobname = 'trialbank-cleanup');
select cron.schedule('trialbank-cleanup', '17 16 * * *', $job$
  select net.http_post(url := 'https://xqkdggyksufbthskmmdz.supabase.co/functions/v1/cleanup',
                       headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb)
$job$);

select 'data protection ready' as status;
