-- Run this in the Supabase SQL Editor (after schema.sql has already been run once).
-- Lets the chatbot backend log every question visitors ask, so the admin can see what
-- people actually want to know (see portfolio-chatbot-backend/src/services/chat_logging.py).
--
-- Insert-only from the backend's anon key; only an authenticated admin session can
-- read the log back (visitors' questions are not publicly queryable).

create table public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  matched boolean not null default false,
  top_score real,
  cache_hit boolean not null default false,
  latency_ms int,
  created_at timestamptz not null default now()
);
create index on public.chat_logs (created_at desc);

alter table public.chat_logs enable row level security;

-- No "public read" policy on purpose -- unlike the content tables, this one holds
-- visitor questions and should not be readable with the public anon key.
create policy "anon insert" on public.chat_logs for insert with check (true);
create policy "admin read" on public.chat_logs for select using (auth.role() = 'authenticated');
