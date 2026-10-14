-- Run this in the Supabase SQL Editor (after 007_meeting_requests.sql has already been run).
-- Lets the admin reply to a meeting request from /admin -- the system sends the email
-- (via Resend) and records what was sent and when.

alter table public.meeting_requests
  add column if not exists status text not null default 'pending' check (status in ('pending', 'replied'));
alter table public.meeting_requests add column if not exists reply_message text;
alter table public.meeting_requests add column if not exists replied_at timestamptz;

-- 007 only granted select/insert/delete to the admin -- replying needs update too.
create policy "admin update" on public.meeting_requests for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
