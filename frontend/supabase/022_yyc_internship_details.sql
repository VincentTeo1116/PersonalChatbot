-- Replaces the one-line "AI RAG Chatbot" description of the YYC internship with bullet points.
-- Source: the Week 1-8 Internship Logbook (14 Sept to 6 Nov 2026). Written in the same style as the FootfallCam entry.
-- READ FIRST:
--   * These describe internal company tools. Check with your supervisor that the wording is fine to publish.
--   * Internal product names, colleagues' names and the chatbot's accuracy percentages are deliberately left out.
--   * The logbook starts on 14 Sept 2026, so the period becomes "Sep 2026 - Now". Remove statement 2 if "Aug 2026" is correct.
-- Run once in the Supabase SQL Editor. Safe to rerun: it only changes the row while it still holds the old text.
-- AFTER RUNNING: open /admin > Chatbot and press Sync. Each line below is one bullet on the site; edit them in /admin > Experience.

begin;

-- 1. Bullet points (one per line).
update public.work_experience
set detail = $$Built a finance-claim automation app that reads uploaded invoices with OCR and an LLM, fills editable expense tables that recalculate totals, and exports the official claim form to Excel, CSV and multi-page PDF.
Built an internal knowledge base for advisors (React, Groq API): admins upload documents, advisors search and ask questions, every answer cites its source passages, and unanswered questions are logged as content gaps.
Rebuilt its retrieval to scale past 100 documents with chunk-level BM25, query rewriting and Gemini embeddings on pgvector hybrid search, in a six-stage pipeline covered by 46 automated tests and a 28-question golden set.
Evaluated and tuned the company's RAG chatbot on Pinecone: set a 69-question accuracy baseline, compared rerankers against the existing BGE model, tuned retrieval settings, and filtered out superseded content.
Benchmarked eight OCR tools for PDF-to-Markdown conversion on speed, accuracy, completeness and error rates (CER/WER), then converted, chunked and indexed missing documents.
Built smaller AI tools, including speech-to-text punctuation correction (Vosk, Gemini) and a name-card extractor that turns OCR text into structured JSON and CSV.$$
where company like 'YYC Holdings%' and btrim(detail, E' \r\n\t') = 'AI RAG Chatbot';

-- 2. Start month, from the logbook.
update public.work_experience
set period = 'Sep 2026 - Now'
where company like 'YYC Holdings%' and period = 'Aug 2026 - Now';

commit;
