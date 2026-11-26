-- Chat logs and chat feedback are written only by the chatbot backend. Until now any visitor's public key could insert rows
-- too, which went around the backend's limits. This removes that public insert rule; the backend writes with its own private
-- key instead, which is not subject to these rules.
--
-- RUN THIS ONLY AFTER the backend has SUPABASE_SERVICE_ROLE_KEY set and you have seen a new question arrive in /admin/chatbot.
-- Run it earlier and the chatbot keeps answering but stops saving logs and feedback.
--
-- Safe to run twice. To undo, run the two "create policy" lines at the bottom.

drop policy if exists "anon insert" on public.chat_logs;
drop policy if exists "anon insert" on public.chat_feedback;

-- Undo:
--   create policy "anon insert" on public.chat_logs for insert with check (true);
--   create policy "anon insert" on public.chat_feedback for insert with check (true);
