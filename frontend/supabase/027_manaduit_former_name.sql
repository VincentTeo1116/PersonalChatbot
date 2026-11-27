-- Says on the ManaDuit project that it used to be called VinExpenses, so people (and the chatbot) who know the old name can
-- still find it. Added to the short description and to the start of the case study. Safe to run twice: each sentence is added
-- only if the old name is not mentioned there yet.
--
-- After running this, press "Refresh site" on the /admin home page and "Sync chatbot now" on /admin/chatbot.

update public.projects
set description = description || ' Formerly called VinExpenses; it was renamed ManaDuit when it was published at manaduit.com.'
where slug = 'manaduit' and description not ilike '%VinExpenses%';

update public.projects
set case_study = case_study || jsonb_build_object(
  'problem',
  'ManaDuit was built under the name VinExpenses and took its current name when it was published at manaduit.com. It is the same app.'
    || E'\n\n' || (case_study->>'problem')
)
where slug = 'manaduit' and case_study ? 'problem' and case_study->>'problem' not ilike '%VinExpenses%';
