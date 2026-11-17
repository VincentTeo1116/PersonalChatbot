-- Backs the SecInsight AI award with APU's own news article, and uses the article's official wording.
-- Source: https://www.apu.edu.my/news/apu-students-excel-maybank-hackathon-2025 (published 22 Jan 2026).
-- It lists Team McShield / Maybank2Everyone (Cho Kar Hin, Vincent Teo Kai Qi) as 2nd Runner-Up among 12 finalist teams.
-- Run once in the Supabase SQL Editor, after 020. Safe to rerun: each statement only changes a row that still holds the old value.
-- AFTER RUNNING: open /admin > Chatbot and press Sync.

begin;

-- 1. Hackathon photos can carry an optional source link (editable in /admin > Hackathons).
alter table public.hackathon_photos add column if not exists link_url text;

update public.hackathon_photos
set link_url = 'https://www.apu.edu.my/news/apu-students-excel-maybank-hackathon-2025'
where caption like 'GTD x APU%3rd Place%' and link_url is null;

update public.hackathon_photos
set caption = replace(caption, '3rd Place Achievements', '2nd Runner-Up (3rd place)')
where caption like 'GTD x APU%3rd Place Achievements%';

-- 2. "APU news coverage" link on the project card and case study.
update public.projects
set links = coalesce(links, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
  'label', 'APU news coverage',
  'url', 'https://www.apu.edu.my/news/apu-students-excel-maybank-hackathon-2025'
)), updated_at = now()
where slug = 'secinsight-ai'
  and not coalesce(links, '[]'::jsonb) @> '[{"label": "APU news coverage"}]'::jsonb;

-- 3. Official wording for the result, with the team name the article uses so a reader can match the two.
update public.projects
set award = '2nd Runner-Up — Maybank Hackathon 2025 (GTD x APU)', updated_at = now()
where slug = 'secinsight-ai' and award = '3rd Place — GTD x APU Hackathon';

update public.projects
set impact = replace(impact, '3rd place, GTD x APU Hackathon (Maybank).', '2nd Runner-Up (3rd place) among 12 finalist teams, Maybank Hackathon 2025.'), updated_at = now()
where slug = 'secinsight-ai' and impact like '%3rd place, GTD x APU Hackathon (Maybank).%';

update public.projects
set description = replace(description, 'Built at the GTD x APU Hackathon (by Maybank), where it placed 3rd.', 'Built at the Maybank Hackathon 2025 (GTD x APU), where our team, McShield, was 2nd Runner-Up (3rd place).'), updated_at = now()
where slug = 'secinsight-ai' and description like '%where it placed 3rd.%';

update public.projects
set case_study = case_study || jsonb_build_object(
  'validation', $$SecInsight AI was 2nd Runner-Up (third place) among 12 finalist teams at the Maybank Hackathon 2025 (Group Technology & Digital, hosted with APU), as reported by APU News, which lists our team as McShield / Maybank2Everyone. The hackathon was held in November 2025 and the result was published in January 2026. The article is linked from this page.

The award is evidence of the competition result. A separate evaluation of summary accuracy, risk scoring and remediation quality has not been published here.$$
), updated_at = now()
where slug = 'secinsight-ai'
  and case_study->>'validation' like '%as recorded in the portfolio%';

update public.projects
set case_study = jsonb_set(case_study, '{contribution}', to_jsonb(replace(
  case_study->>'contribution',
  'SecInsight AI was a team project built during the hackathon.',
  'I built SecInsight AI with one teammate, Cho Kar Hin, as Team McShield.'
))), updated_at = now()
where slug = 'secinsight-ai'
  and case_study->>'contribution' like 'SecInsight AI was a team project built during the hackathon.%';

-- 4. The same wording in the hero summary and the About text.
update public.profile
set hero_summary = replace(hero_summary, '3rd place at the GTD x APU Hackathon (Maybank)', '2nd Runner-Up at the Maybank Hackathon 2025'),
    about = replace(about, 'won 3rd place at the GTD x APU Hackathon', 'was 2nd Runner-Up (3rd place) at the Maybank Hackathon 2025'),
    updated_at = now()
where id = 1
  and (hero_summary like '%3rd place at the GTD x APU Hackathon (Maybank)%' or about like '%won 3rd place at the GTD x APU Hackathon%');

commit;
