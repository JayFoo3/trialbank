-- Admin: this month's AI spending, Pro numbers and the heaviest users, in one call. Safe to re-run.
create or replace function public.admin_usage()
returns json language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := date_trunc('month', now()); r json;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  with t as (select user_id, count(*) filter (where error is null) msgs, coalesce(sum(cost_usd), 0) usd, count(*) filter (where off_topic) off,
                    coalesce(sum(coalesce(input_tokens,0) + coalesce(output_tokens,0) + coalesce(cache_write,0) + coalesce(cache_read,0)), 0) tokens
             from tutor_runs where created_at >= since group by user_id),
       a as (select user_id, count(*) runs, coalesce(sum(cost_usd), 0) usd from automark_runs where created_at >= since group by user_id),
       u as (select coalesce(t.user_id, a.user_id) uid, coalesce(t.msgs, 0) msgs, coalesce(t.usd, 0) tusd, coalesce(t.off, 0) off, coalesce(t.tokens, 0) tokens,
                    coalesce(a.runs, 0) runs, coalesce(a.usd, 0) ausd
             from t full join a on a.user_id = t.user_id)
  select json_build_object(
    'since', since,
    'tutor', json_build_object('spent', round((select coalesce(sum(usd), 0) from t)::numeric, 2),
                               'cap', coalesce(nullif((select value from settings where key = 'tutor_monthly_cap_usd'), '')::numeric, 15),
                               'msgs', (select coalesce(sum(msgs), 0) from t), 'tokens', (select coalesce(sum(tokens), 0) from t),
                               'users', (select count(*) from t where msgs > 0), 'off_topic', (select coalesce(sum(off), 0) from t)),
    'automark', json_build_object('spent', round((select coalesce(sum(usd), 0) from a)::numeric, 2), 'runs', (select coalesce(sum(runs), 0) from a)),
    'pro', json_build_object(
      'monthly', (select count(*) from subscriptions where plan = 'monthly' and status in ('active', 'trialing', 'past_due') and period_end > now()),
      'annual', (select count(*) from subscriptions where plan = 'annual' and status in ('active', 'trialing', 'past_due') and period_end > now()),
      'on_pass', (select count(distinct user_id) from pro_passes where starts <= now() and ends > now()),
      'trials', (select count(*) from pro_passes where reason = 'trial'),
      'trials_month', (select count(*) from pro_passes where reason = 'trial' and created_at >= since),
      'ref_rewarded', (select count(*) from referrals where rewarded), 'ref_pending', (select count(*) from referrals where not rewarded),
      'packs_month', (select count(*) from tutor_credit_ledger where kind = 'purchase' and created_at >= since),
      'pack_msgs_month', (select coalesce(sum(delta), 0) from tutor_credit_ledger where kind = 'purchase' and created_at >= since)),
    'settings', (select json_object_agg(key, value) from settings where key in ('pro_sales', 'pro_trials', 'tutor_packs', 'tutor_monthly_cap_usd', 'tutor_user_monthly_msgs', 'tutor_trial_msgs')),
    'top', coalesce((select json_agg(x) from (
      select au.email, u.msgs, round(u.tusd::numeric, 2) tutor_usd, u.off, u.tokens, u.runs, round(u.ausd::numeric, 2) mark_usd,
             (public.access_info(u.uid) ->> 'tier') tier
      from u join auth.users au on au.id = u.uid
      order by (u.tusd + u.ausd) desc limit 25) x), '[]'::json)
  ) into r;
  return r;
end $$;
revoke execute on function public.admin_usage() from public, anon;
grant execute on function public.admin_usage() to authenticated;
select 'admin usage ready' as status;
