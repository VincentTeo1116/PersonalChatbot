-- VinExpenses was renamed ManaDuit and rebuilt in React and TypeScript, now served from manaduit.com. The project row already has
-- the new address and links; this brings the remaining details in line with the app as it is now:
--   * the name is written "ManaDuit" (one word), in the title and the search title;
--   * the optional AI receipt helper is no longer part of the app, so it is removed from the text and the tags;
--   * the stack, hosting and test figures are updated.
--
-- Every change only replaces a sentence if it is still there, so it is safe to run twice and leaves your own later edits alone.
-- Test figures are the ones recorded in the ManaDuit repository (docs/VERIFICATION.md).
--
-- After running this, open the project in /admin and press Save once: that refreshes the public pages and the chatbot straight
-- away. Changes made in the SQL editor are otherwise only picked up within the hour, and not by the chatbot at all.

update public.projects
set
  title = replace(title, 'Mana Duit', 'ManaDuit'),
  seo_title = replace(seo_title, 'VinExpenses', 'ManaDuit'),
  seo_description = replace(
    replace(seo_description, ', with an optional AI fallback', ''),
    '368 automated tests', 'about 950 automated tests'
  ),
  impact = replace(impact, '368 automated tests', 'about 950 automated tests'),
  tags = (
    select array_agg(tag order by first_seen)
    from (
      select tag, min(ord) as first_seen
      from unnest(array_remove(array_replace(tags, 'JavaScript', 'TypeScript'), 'Gemini') || array['React', 'Cloudflare'])
        with ordinality as listed(tag, ord)
      group by tag
    ) as unique_tags
  ),
  case_study = case_study
    || jsonb_build_object(
      -- Drops the paragraph about the optional AI step, together with the blank line after it.
      'approach', regexp_replace(
        case_study->>'approach',
        'An optional AI step \(Google Gemini\)[^\r\n]*\s*',
        ''
      ),
      'decisions', replace(replace(replace(replace(replace(
        case_study->>'decisions',
        'No framework and no build step. The app is plain HTML, CSS and JavaScript, which keeps it fast to load on a phone and leaves nothing to maintain except the code itself.',
        'Rebuilt without changing the answers. The first version was plain HTML, CSS and JavaScript with no build step. As the app grew it was rebuilt in React and TypeScript, and the receipt reader, the category rules and the deposit and loan maths were compared with the original code on random inputs, so the numbers stayed the same. The first download is kept under 200 KB, so it still opens fast on a phone.'),
        'Rules first, AI second.',
        'Rules, not a language model.'),
        'The language model is kept for the leftovers, and it is validated instead of trusted.',
        'When the rules are unsure, the app asks the user instead of guessing.'),
        'Text PDFs stay on the device, the server function does not log or store images or text, and the AI step is opt-in with a plain warning about the provider''s free-tier data use.',
        'Text PDFs stay on the device, and the server function does not log or store images or text.'),
        '(30 scans and 10 AI calls a day by default)',
        '(30 scans a day by default)'
      ),
      'validation', replace(replace(
        case_study->>'validation',
        'The whole project has 368 automated tests across 18 files,',
        'The whole project has about 950 automated tests (136 unit and component, 263 browser, 553 backend and parity),'),
        'CSV import, validation of AI answers and the server-side checks',
        'CSV import and the server-side checks'
      ),
      'limitations', replace(
        case_study->>'limitations',
        'Free OCR limits a photo to 1 MB after compression, and GitHub Pages cannot send security headers, so those protections are applied in the page itself.',
        'Free OCR limits a photo to 1 MB after compression. The browser tests run in Chromium against a local stand-in for the database and the outside services, not the live ones.'
      )
    )
where slug = 'manaduit'
  and case_study ? 'approach' and case_study ? 'decisions' and case_study ? 'validation' and case_study ? 'limitations';
