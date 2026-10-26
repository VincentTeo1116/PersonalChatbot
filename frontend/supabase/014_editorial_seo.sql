-- Run after migration 013. Safe to rerun; existing authored SEO text/details are preserved.
-- This adds editorial controls without changing public-read/admin-write RLS policies.
begin;

alter table public.projects add column if not exists seo_title text;
alter table public.projects add column if not exists seo_description text;
alter table public.research add column if not exists seo_title text;
alter table public.research add column if not exists seo_description text;
alter table public.research add column if not exists case_study jsonb not null default '{}'::jsonb
  check (jsonb_typeof(case_study) = 'object');

with drafts(slug, title, description) as (values
  ('portfolio-chatbot', 'Building a RAG Portfolio Assistant with FastAPI, Gemini and Pinecone',
   'Explore a portfolio RAG assistant with Supabase content sync, Gemini embeddings, Pinecone retrieval, Groq generation, and an honest look at evaluation.'),
  ('apmoodle-lms', 'APMoodle: React and ASP.NET Learning Management System',
   'Explore APMoodle: a React and ASP.NET LMS with Supabase PostgreSQL, quizzes, student progress, and chat. Read about my contribution and design decisions.'),
  ('secinsight-ai', 'SecInsight AI: Explaining CVE Vulnerabilities with Gemini',
   'Explore an award-winning hackathon project that uses Gemini to turn CVE CSV records into vulnerability summaries and suggested remediation guidance.')
)
update public.projects as project
set seo_title = coalesce(nullif(btrim(project.seo_title), ''), drafts.title),
    seo_description = coalesce(nullif(btrim(project.seo_description), ''), drafts.description),
    updated_at = now()
from drafts
where project.slug = drafts.slug
  and (nullif(btrim(project.seo_title), '') is null or nullif(btrim(project.seo_description), '') is null);

update public.research
set seo_title = coalesce(nullif(btrim(seo_title), ''), 'XGBoost and SHAP for Cross-Border Passenger Flow Forecasting'),
    seo_description = coalesce(nullif(btrim(seo_description), ''), 'Explore research on cross-border passenger flow forecasting in Hong Kong using XGBoost and SHAP, with authors, publication details, and the original paper.'),
    updated_at = now()
where slug = 'xgboost-shap-passenger-flow'
  and (nullif(btrim(seo_title), '') is null or nullif(btrim(seo_description), '') is null);

-- Only facts already recorded in the portfolio are included. Personal contribution,
-- experimental setup, and numerical findings must be supplied from the actual work.
update public.research
set case_study = jsonb_build_object(
  'problem', $$The research addresses forecasting cross-border passenger flow in Hong Kong. Alongside making predictions, it considers how the factors behind those predictions can be explained to support interpretation.$$,
  'approach', $$The published work combines XGBoost for forecasting with SHAP-based explainable AI. XGBoost supplies the predictions, while SHAP is used to explain the contribution of features to the model output.

The linked publication is the source for the complete experimental method and reported findings.$$,
  'limitations', $$This portfolio summary does not yet include the dataset preparation, evaluation splits, numerical results, or reproducible experiment artifacts. Refer to the original publication for the research findings.$$
), updated_at = now()
where slug = 'xgboost-shap-passenger-flow' and case_study = '{}'::jsonb;

commit;
