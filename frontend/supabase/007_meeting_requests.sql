-- Run this in the Supabase SQL Editor (after schema.sql has already been run once).
-- Lets visitors (recruiters/hiring managers) submit a "request a meeting" form instead
-- of needing a working mailto: client. Insert-only from any visitor (anon); only an
-- authenticated admin session can read or clear these -- the same privacy posture as
-- chat_logs (004_chat_logs.sql).

create table public.meeting_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null,
  company text not null,
  email text not null,
  phone text not null,
  message text,
  created_at timestamptz not null default now()
);
create index on public.meeting_requests (created_at desc);

alter table public.meeting_requests enable row level security;

-- No "public read" policy on purpose -- this holds visitors' personal contact details.
create policy "anon insert" on public.meeting_requests for insert with check (true);
create policy "admin read" on public.meeting_requests for select using (auth.role() = 'authenticated');
create policy "admin delete" on public.meeting_requests for delete using (auth.role() = 'authenticated');
