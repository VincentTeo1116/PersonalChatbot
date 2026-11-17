-- Makes the facts on the site agree with each other. Run once in the Supabase SQL Editor, after the earlier numbered migrations.
-- Safe to rerun: every statement only changes a row that still holds the old text.
-- AFTER RUNNING: open /admin > Chatbot and press Sync, so the assistant answers from the corrected text.
-- Everything here is editable afterwards in /admin (Profile, Education, Projects).

begin;

-- 1. CGPA is 3.97 everywhere (the Education entry still said 3.98), and the degree shows its expected end date.
update public.education
set detail = replace(detail, 'CGPA: 3.98', 'CGPA: 3.97')
where detail like '%CGPA: 3.98%';

update public.education
set period = 'Nov 2025 – Dec 2027 (expected)'
where period = 'Nov 2025 – Present' and degree like 'Bachelor%';

-- 2. Graduation date, shown as the green line in the hero and in Contact. Left alone if one is already set.
update public.profile
set availability = 'Expected graduation: Dec 2027', updated_at = now()
where id = 1 and coalesce(availability, '') = '';

-- 3. Eight hackathons in total: the About text said "four", the counter says 8.
update public.profile
set about = replace(about, 'shipped four hackathon projects in under a year', 'taken part in eight hackathons'), updated_at = now()
where id = 1 and about like '%shipped four hackathon projects in under a year%';

-- 4. Chatbot case study: it described a 20-question test with "no published results", while the AI lab page publishes a 107-question run.
update public.projects
set case_study = case_study || jsonb_build_object(
  'validation', $$A fixed set of 107 hand-written questions is run against the live knowledge index before retrieval or prompt changes: 81 the portfolio can answer and 26 it should decline (missing facts, off-topic requests and misuse attempts).

In the run measured on 12 Nov 2026, the expected entry ranked first for 77 of 81 answerable questions and was in the top three for all 81 (mean reciprocal rank 0.975). Generated answers contained the recorded facts in 28 of 29 checked cases, and all 17 checked out-of-scope questions were declined. The first run, on 27 Oct 2026, had 20 questions and measured retrieval only.

Answers are checked with string rules, not read by a person or a model judge, so a passing answer can still contain a sentence the rules do not look for. The AI evaluation lab page on this site shows the full dated results, a real ranking miss and what the test does not prove.$$,
  'limitations', $$Grounding depends on the retrieved content and the model instructions; these safeguards do not guarantee that every generated statement is supported. The similarity cutoff alone is a weak filter: it blocked 12 of the 26 questions the portfolio cannot answer, so declining the rest depends on the prompt.

The test questions were written by the same person who built the system, so they share its blind spots. Next steps are a held-out question set written by someone else, a human review of answer quality, and measuring response time and provider failures under realistic usage.$$
), updated_at = now()
where slug = 'portfolio-chatbot'
  and case_study->>'validation' like '%fixed 20-question retrieval evaluation%';

-- 5. SecInsight AI: the role said only "Frontend designer". These three parts are the ones I personally did.
update public.projects
set role = 'Frontend developer, prompt engineer and presenter', updated_at = now()
where slug = 'secinsight-ai' and role = 'Frontend designer';

update public.projects
set case_study = case_study || jsonb_build_object(
  'contribution', $$SecInsight AI was a team project built during the hackathon. My parts were the frontend (the upload and results screens), the Google Gemini prompts and the output format behind the summaries, risk scores, priority levels and remediation guidance, and presenting the pitch and live demo to the judges.$$
), updated_at = now()
where slug = 'secinsight-ai' and not (case_study ? 'contribution');

commit;
