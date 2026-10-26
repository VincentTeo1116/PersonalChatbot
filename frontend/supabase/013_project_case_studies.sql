-- Run in the Supabase SQL Editor after the earlier numbered migrations.
-- Adds optional, admin-editable case studies. Existing RLS policies continue to apply.
-- Starter text comes from the repository and existing project descriptions; it includes
-- no invented evaluation scores, adoption numbers, or personal contributions.
-- Only empty case studies for these exact slugs are filled; authored content is preserved.

begin;

alter table public.projects
  add column if not exists case_study jsonb not null default '{}'::jsonb
  check (jsonb_typeof(case_study) = 'object');

update public.projects
set case_study = jsonb_build_object(
  'problem', $$Visitors need a clear way to explore the portfolio owner's background, projects, and experience. Keeping a separate chatbot knowledge base up to date creates another place where information can become stale.$$,
  'approach', $$The Next.js website and admin area use Supabase as their content source. After a successful project save, the frontend schedules a backend sync. FastAPI reads the public content tables, Gemini embeds the entries, and Pinecone stores the vectors.

For a visitor question, the backend embeds the query, retrieves relevant entries, applies a similarity threshold, and passes the context to Groq. The widget streams the answer and provides links to supporting portfolio content. Visitors can also leave feedback.$$,
  'decisions', $$Supabase supplies both the website and the chatbot, reducing duplicated content maintenance. Embedding and generation are separate services, allowing their providers and configuration to evolve independently.

Short content entries are embedded individually. Case study sections are indexed separately so an entire technical write-up does not need to fit into one vector. Cached answers are cleared after a successful sync to reduce stale responses.$$,
  'validation', $$The repository includes a fixed 20-question retrieval evaluation script that reports hit@1, hit@3, and mean reciprocal rank. These metrics measure whether relevant knowledge entries are retrieved; they do not establish that every generated answer is correct.

Published benchmark results, end-to-end answer quality scores, and load-test measurements have not yet been added to this case study.$$,
  'limitations', $$Grounding depends on the retrieved content and model instructions. These safeguards do not guarantee that every generated statement is supported. Retrieval thresholds also need to be evaluated when the content or embedding model changes.

Next steps are to publish dated evaluation results, test unsupported questions and misleading instructions, and measure response latency and provider failures under realistic usage.$$
), updated_at = now()
where slug = 'portfolio-chatbot' and case_study = '{}'::jsonb;

update public.projects
set case_study = jsonb_build_object(
  'problem', $$Students and lecturers need one place to manage learning materials, quizzes, progress, and communication. APMoodle brings these activities together in a full-stack learning management system.$$,
  'contribution', $$As described in the project record, I designed the Supabase PostgreSQL schema, built the ASP.NET backend and React frontend, implemented student-lecturer chat, and connected SMTP email for registration and password resets. The project was built with a team of five.$$,
  'approach', $$The React frontend presents modules, materials, quizzes, and student progress. The ASP.NET backend works with Supabase PostgreSQL for the application data. Features include module enrolment, automatically graded multiple-choice quizzes, quiz history, progress summaries, announcements, and student-lecturer chat.$$,
  'decisions', $$Chat checks for updates every five seconds. This polling approach introduces an update interval and repeated requests; it is a useful design point to compare with WebSockets or database subscriptions when considering future improvements.$$,
  'validation', $$The existing project description reports a 4.0 academic score. It does not include measured adoption, load-test results, or a measured reduction in administrative work.$$,
  'limitations', $$The chat update interval can delay new messages. Further evaluation should measure database query cost and behaviour with concurrent users, and document tests for registration, password resets, enrolment, and quiz grading.$$
), updated_at = now()
where slug = 'apmoodle-lms' and case_study = '{}'::jsonb;

update public.projects
set case_study = jsonb_build_object(
  'problem', $$Raw CVE data can be difficult for a team without security expertise to interpret and prioritise. SecInsight AI explores how to turn vulnerability records into understandable summaries and suggested actions.$$,
  'approach', $$The application analyses CVE CSV data and uses Google Gemini to generate plain-English vulnerability summaries, risk scores, priority levels, and remediation guidance.$$,
  'validation', $$The project placed third at the GTD x APU Hackathon, as recorded in the portfolio. The award is evidence of the competition result. A separate evaluation of summary accuracy, risk scoring, and remediation quality has not been published here.$$,
  'limitations', $$Generated risk assessments and remediation suggestions need to be checked against authoritative vulnerability and vendor information. Useful next steps include a reviewed evaluation set and documented examples of incorrect, incomplete, or unsupported outputs.$$
), updated_at = now()
where slug = 'secinsight-ai' and case_study = '{}'::jsonb;

commit;
