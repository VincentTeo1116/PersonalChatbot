-- Makes "admin" mean one specific account instead of "anyone who has signed up", stops anonymous listing of the file bucket, and caps the size of what visitors can insert.
-- Run once in the Supabase SQL editor, after turning off "Allow new users to sign up" (Authentication -> Sign In / Providers).
-- It runs in one transaction: if anything fails (for example the email below matches nobody), nothing is changed.

begin;

-- 1. The admin accounts. Replace the email with the one you sign in to /admin with.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admin_users enable row level security; -- no policies on purpose: the API can neither read nor change this table

insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com')
on conflict do nothing;

-- Stop here if nobody matched: switching the policies below without an admin row would lock you out of /admin.
do $$
begin
  if not exists (select 1 from public.admin_users) then
    raise exception 'No admin user found. Put your real admin email in step 1 and run this script again.';
  end if;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Content tables: only an admin may write.
do $$
declare t text;
begin
  foreach t in array array[
    'profile', 'education', 'education_images', 'projects', 'project_images', 'research', 'hackathon_photos',
    'work_experience', 'work_experience_images', 'testimonials', 'fyp', 'fyp_images'
  ] loop
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- 3. Visitor data: only an admin may read, edit or delete it. Visitors can still insert.
drop policy if exists "admin read" on public.meeting_requests;
drop policy if exists "admin delete" on public.meeting_requests;
drop policy if exists "admin update" on public.meeting_requests;
create policy "admin read" on public.meeting_requests for select using (public.is_admin());
create policy "admin delete" on public.meeting_requests for delete using (public.is_admin());
create policy "admin update" on public.meeting_requests for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read" on public.chat_logs;
create policy "admin read" on public.chat_logs for select using (public.is_admin());

drop policy if exists "admin read" on public.chat_feedback;
drop policy if exists "admin delete" on public.chat_feedback;
create policy "admin read" on public.chat_feedback for select using (public.is_admin());
create policy "admin delete" on public.chat_feedback for delete using (public.is_admin());

-- 4. File bucket: only an admin may upload, replace or delete. Listing is admin-only too; files already published keep working because a public bucket serves each file by its URL without a select policy.
drop policy if exists "public read portfolio-content" on storage.objects;
drop policy if exists "authenticated insert portfolio-content" on storage.objects;
drop policy if exists "authenticated update portfolio-content" on storage.objects;
drop policy if exists "authenticated delete portfolio-content" on storage.objects;
drop policy if exists "admin read portfolio-content" on storage.objects;
drop policy if exists "admin insert portfolio-content" on storage.objects;
drop policy if exists "admin update portfolio-content" on storage.objects;
drop policy if exists "admin delete portfolio-content" on storage.objects;
create policy "admin read portfolio-content" on storage.objects for select using (bucket_id = 'portfolio-content' and public.is_admin());
create policy "admin insert portfolio-content" on storage.objects for insert with check (bucket_id = 'portfolio-content' and public.is_admin());
create policy "admin update portfolio-content" on storage.objects for update using (bucket_id = 'portfolio-content' and public.is_admin());
create policy "admin delete portfolio-content" on storage.objects for delete using (bucket_id = 'portfolio-content' and public.is_admin());

-- 5. Size limits on what anonymous visitors can insert (not valid = existing rows are left alone; new and edited rows are checked).
alter table public.chat_logs drop constraint if exists chat_logs_size;
alter table public.chat_logs add constraint chat_logs_size check (char_length(question) <= 500 and char_length(answer) <= 2000) not valid;

alter table public.chat_feedback drop constraint if exists chat_feedback_size;
alter table public.chat_feedback add constraint chat_feedback_size check (char_length(question) <= 500 and char_length(answer) <= 2000) not valid;

alter table public.meeting_requests drop constraint if exists meeting_requests_size;
alter table public.meeting_requests add constraint meeting_requests_size check (
  char_length(name) <= 100 and char_length(position) <= 100 and char_length(company) <= 120
  and char_length(email) <= 254 and char_length(phone) <= 40 and char_length(coalesce(message, '')) <= 2000
) not valid;

alter table public.testimonials drop constraint if exists testimonials_size;
alter table public.testimonials add constraint testimonials_size check (
  char_length(author_name) <= 100 and char_length(author_role) <= 120 and char_length(quote) <= 2000
) not valid;

commit;

-- Optional: delete chat logs and feedback after 90 days. Needs the pg_cron extension (Database -> Extensions -> pg_cron); then run:
-- select cron.schedule('purge-chat-data', '15 3 * * *', $$
--   delete from public.chat_logs where created_at < now() - interval '90 days';
--   delete from public.chat_feedback where created_at < now() - interval '90 days';
-- $$);
