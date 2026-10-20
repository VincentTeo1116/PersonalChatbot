-- Fixes uploads failing with "Bucket not found" even though the bucket exists: the Storage API returns that when an insert/update/delete on storage.objects is denied by RLS because the write policies are missing.
--
-- Safe to run any number of times: each policy is dropped first if present, then recreated, so this never errors on "already exists" and never duplicates a policy.

drop policy if exists "public read portfolio-content" on storage.objects;
drop policy if exists "authenticated insert portfolio-content" on storage.objects;
drop policy if exists "authenticated update portfolio-content" on storage.objects;
drop policy if exists "authenticated delete portfolio-content" on storage.objects;

create policy "public read portfolio-content" on storage.objects for select
  using (bucket_id = 'portfolio-content');
create policy "authenticated insert portfolio-content" on storage.objects for insert
  with check (bucket_id = 'portfolio-content' and auth.role() = 'authenticated');
create policy "authenticated update portfolio-content" on storage.objects for update
  using (bucket_id = 'portfolio-content' and auth.role() = 'authenticated');
create policy "authenticated delete portfolio-content" on storage.objects for delete
  using (bucket_id = 'portfolio-content' and auth.role() = 'authenticated');
