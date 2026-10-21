-- Thumbs up/down that visitors give chatbot answers; read back in /admin/chatbot (see portfolio-chatbot-backend/src/services/chat_logging.py).
-- Insert-only from the backend's anon key; only an authenticated admin session can read or clear it.

create table public.chat_feedback (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  rating text not null check (rating in ('up', 'down')),
  matched boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.chat_feedback (created_at desc);

alter table public.chat_feedback enable row level security;

create policy "anon insert" on public.chat_feedback for insert with check (true);
create policy "admin read" on public.chat_feedback for select using (auth.role() = 'authenticated');
create policy "admin delete" on public.chat_feedback for delete using (auth.role() = 'authenticated');
