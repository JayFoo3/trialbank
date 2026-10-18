-- Personalisation: each student's profile picture and background photo, in their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile', 'profile', false, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "own profile read" on storage.objects;
drop policy if exists "own profile write" on storage.objects;
drop policy if exists "own profile update" on storage.objects;
drop policy if exists "own profile delete" on storage.objects;
create policy "own profile read" on storage.objects for select to authenticated
  using (bucket_id = 'profile' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own profile write" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own profile update" on storage.objects for update to authenticated
  using (bucket_id = 'profile' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own profile delete" on storage.objects for delete to authenticated
  using (bucket_id = 'profile' and (storage.foldername(name))[1] = auth.uid()::text);
