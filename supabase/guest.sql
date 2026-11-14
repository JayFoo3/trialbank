-- Papers without an account (Nov 2026). Safe to re-run.
-- Guests (no sign-in) can browse the Papers page, see the covers and open trial paper PDFs, within the public release
-- dial. HSC papers still link out to NESA. Questions, practice, timed papers and marking still need an account.
-- Off by default. Turn on:  update public.settings set value = 'on'  where key = 'guest_papers';
--                Turn off: update public.settings set value = 'off' where key = 'guest_papers';
insert into public.settings (key, value) values ('guest_papers', 'off') on conflict (key) do nothing;

create or replace function public.guest_papers_on()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.settings where key = 'guest_papers'), 'off') = 'on'
$$;
grant execute on function public.guest_papers_on() to anon, authenticated;

-- a guest gets the public dial (my_release already falls through to release_public when nobody is signed in)
grant execute on function public.my_release() to anon;
grant execute on function public.my_dial() to anon;

grant select on public.papers to anon;
drop policy if exists "guests read papers" on public.papers;
create policy "guests read papers" on public.papers for select to anon
  using (public.guest_papers_on() and (difficulty = 'HSC' or coalesce(release_pct, 0) < public.my_dial()));

-- covers only (slug/thumb.webp), and only for papers a guest can see
drop policy if exists "guests see covers" on storage.objects;
create policy "guests see covers" on storage.objects for select to anon
  using (bucket_id = 'questions' and name like '%/thumb.webp' and split_part(name, '/', 1) in (select slug from public.papers));
