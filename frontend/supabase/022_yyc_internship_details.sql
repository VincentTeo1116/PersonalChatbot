-- Replaces the one-line "AI RAG Chatbot" description of the YYC internship with short bullet points.
-- Source: the Week 1-8 Internship Logbook (14 Sept to 6 Nov 2026).
-- READ FIRST:
--   * These describe internal company tools. Check with your supervisor that the wording is fine to publish.
--   * Internal product names, colleagues' names and the chatbot's accuracy percentages are deliberately left out.
--   * The logbook starts on 14 Sept 2026, so the period becomes "Sep 2026 - Now". Remove statement 2 if "Aug 2026" is correct.
-- Run once in the Supabase SQL Editor. Safe to rerun: it only changes the row while it still holds the old one-line text
-- or the earlier, longer version of these bullets.
-- AFTER RUNNING: open /admin > Chatbot and press Sync. Each line below is one bullet on the site; edit them in /admin > Experience.

begin;

-- 1. Bullet points (one per line).
update public.work_experience
set detail = $$Built a finance-claim automation app that reads invoices with OCR and an LLM and exports the completed claim form.
Built an internal knowledge base where staff search documents and ask questions, with every answer citing its source.
Improved and evaluated the company's RAG chatbot using fixed test question sets, retrieval tuning and reranker comparisons.
Benchmarked eight OCR tools for PDF-to-Markdown conversion.$$
where company like 'YYC Holdings%'
  and (btrim(detail, E' \r\n\t') = 'AI RAG Chatbot' or detail like 'Built a finance-claim automation app that reads uploaded invoices%');

-- 2. Start month, from the logbook.
update public.work_experience
set period = 'Sep 2026 - Now'
where company like 'YYC Holdings%' and period = 'Sep 2026 - Now';

commit;
