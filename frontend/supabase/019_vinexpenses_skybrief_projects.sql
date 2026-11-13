-- Adds two projects: VinExpenses (featured, full case study) and the SkyBrief Telegram bot (short case study).
-- Run once in the Supabase SQL editor. Safe to rerun: a project whose slug already exists is left unchanged.
-- READ FIRST: the "contribution" text says each was designed and built solo, based on the git history. Edit it in
-- /admin/projects if that is not the full picture.
-- Facts are taken from each project's README, SECURITY.md, source and test suite as of 13 Nov 2026.

insert into public.projects (slug, title, description, tags, links, featured, sort_order, role, impact, seo_title, seo_description, case_study)
select
  'vinexpenses',
  'VinExpenses',
  $$An expense and income tracker that reads receipts for you. Photograph a receipt or drop in a PDF and it finds the merchant, total and date, suggests a category from your own history, and warns about duplicates. Budgets, offline entry, CSV import and a Telegram bot are built in. Live as an installable web app.$$,
  array['JavaScript', 'Supabase', 'PostgreSQL', 'Edge Functions', 'OCR', 'Gemini', 'PWA', 'Telegram Bot', 'GitHub Actions'],
  '[{"label": "Live app", "url": "https://vincentteo1116.github.io/VinExpenses/"}, {"label": "Code", "url": "https://github.com/VincentTeo1116/VinExpenses"}]'::jsonb,
  true,
  coalesce((select max(sort_order) + 1 from public.projects), 0),
  'Personal project',
  'Reads merchant, total and date correctly on all 8 real receipt fixtures; 368 automated tests run before every deploy.',
  'VinExpenses: an Expense Tracker with Receipt Scanning',
  'A live expense tracker that reads receipts with OCR and a rule-based parser, with an optional AI fallback, per-user data protected by row level security, and 368 automated tests.',
  jsonb_build_object(
    'problem', $$Most people stop tracking expenses because typing each one in is tedious. The useful version of an expense tracker is one where a receipt photo or an e-wallet PDF becomes a correct entry with almost no typing, and where a wrong guess is never saved silently.

Malaysian receipts make that harder than it sounds: they mix English, Malay and Chinese labels, print several amounts (subtotal, service charge, SST, rounding, cash tendered, change), and sometimes show a foreign-currency price beside the ringgit one.$$,
    'contribution', $$Designed and built solo: the web app, the receipt pipeline, the database and its security rules, the Telegram bot, the tests and the deployment.$$,
    'approach', $$Receipt scanning is the core of the app, and it works in three stages.

1. Getting the text. A PDF with a text layer is read in the browser and never uploaded. A photo or scanned PDF is compressed on the device and sent to a private server function that calls an OCR service, so the OCR key never reaches the browser.

2. Finding the facts. A rule-based parser with no dependencies scores every amount on the receipt by the label beside it ("Total", "Jumlah", "Anda bayar", "总计"), ignores subtotal, tax and discount lines, penalises foreign-currency amounts, and adds confidence when several total labels agree or when subtotal plus tax and fees minus discounts adds up to the candidate. The merchant is scored on legal suffix, capital letters, position near the top and a match with the receipt's web address.

3. Deciding how sure it is. Each result is rated high, medium or low. When the parser is unsure, the app shows the candidate amounts as chips to tap and fills in nothing by itself.

An optional AI step (Google Gemini) handles receipts the rules cannot settle. It is off by default, runs only for users who switch it on, receives the text and never the image, and its answer is checked for a sensible amount, a valid date and one of the user's own categories before it is used.

Around that: category suggestions learned from the user's own merchant history with a list of Malaysian brands as a fallback, a duplicate warning (same amount, within a day, matching merchant), budgets with 80% and 100% alerts and a "safe to spend today" figure, recurring items, an offline queue that syncs later, CSV import of the app's export or a bank statement, a monthly report, and a Telegram bot in English, Malay and Chinese that accepts receipt photos and sends charts and a weekly digest.$$,
    'decisions', $$Rules first, AI second. A total on a receipt is a fact that can be checked by arithmetic, so a transparent scoring parser handles the common case for free, instantly and with a reason for every choice. The language model is kept for the leftovers, and it is validated instead of trusted.

Never save a wrong guess. Low confidence produces a choice for the user, not a filled field. For a money app, a wrong number that looks right is worse than asking.

Privacy by design. Text PDFs stay on the device, the server function does not log or store images or text, and the AI step is opt-in with a plain warning about the provider's free-tier data use.

No framework and no build step. The app is plain HTML, CSS and JavaScript, which keeps it fast to load on a phone and leaves nothing to maintain except the code itself.

Security treated as a feature. Every table has row level security, so one user can never read another's data. Each server function checks the calling site, then that a real user is signed in, then a daily quota that refuses when in doubt (30 scans and 10 AI calls a day by default). The browser runs under a strict content security policy with self-hosted, integrity-checked libraries, and exported CSV files are protected against spreadsheet formula injection.$$,
    'validation', $$The receipt parser is tested against 8 anonymised real receipts. For each one it must return the exact amount, merchant and date, in ringgit, with high confidence, and all 8 pass.

The whole project has 368 automated tests across 18 files, covering the parser, category suggestions, duplicate detection, CSV import, validation of AI answers and the server-side checks. They run on every push, and a failing test blocks both the site deploy and the server-function deploy.$$,
    'limitations', $$Eight receipts is a regression suite, not an accuracy benchmark: it proves the parser keeps working on formats it has seen, not how often it is right on new ones. The next step is a larger labelled set with a reported hit rate for amount, merchant and date.

The app works in ringgit only. Recurring items are posted when the app is opened, not by a background job. Editing or deleting a saved entry needs a connection. Free OCR limits a photo to 1 MB after compression, and GitHub Pages cannot send security headers, so those protections are applied in the page itself.$$
  )
where not exists (select 1 from public.projects where slug = 'vinexpenses');

insert into public.projects (slug, title, description, tags, links, featured, sort_order, role, impact, seo_title, seo_description, case_study)
select
  'skybrief-telegram-bot',
  'SkyBrief Telegram Bot',
  $$A Telegram bot that sends a morning weather and air-quality report at the time you choose, in your city's local time, and answers on demand. It covers hourly and weekly forecasts, rain and air-quality alerts, and official MetMalaysia warnings, in English, Malay and Chinese.$$,
  array['TypeScript', 'Cloudflare Workers', 'Cloudflare D1', 'Telegram Bot API', 'Open-Meteo', 'Vitest', 'GitHub Actions'],
  '[{"label": "Try the bot", "url": "https://t.me/SkyBrief_AI_bot"}, {"label": "Code", "url": "https://github.com/VincentTeo1116/skybrief-telegram-bot"}]'::jsonb,
  false,
  coalesce((select max(sort_order) + 1 from public.projects), 0),
  'Personal project',
  'Runs serverless within a free plan, with a backup weather source and around 250 automated tests.',
  'SkyBrief: a Weather and Air-Quality Telegram Bot',
  'A multi-user Telegram bot on Cloudflare Workers that sends scheduled weather, air-quality and official warning reports in three languages, with a backup data source.',
  jsonb_build_object(
    'problem', $$Checking the weather, the haze level and any official warning each morning means opening several apps. SkyBrief puts them in one message that arrives before you leave home, in the chat app you already have open.$$,
    'contribution', $$Designed and built solo, including a full rewrite from a single-user Python script into a multi-user serverless bot.$$,
    'approach', $$The bot runs on Cloudflare Workers with a D1 database and calls the Telegram Bot API directly, with no bot library and no runtime dependencies.

Telegram delivers messages by webhook; the Worker answers at once and finishes the work in the background. A scheduled job runs every minute and sends each user's report when their own local time reaches the time they chose. A claim in the database stops a report being sent twice, and a two-hour catch-up window covers outages.

Weather and place search come from Open-Meteo. Air quality comes from the nearest measuring station when one is within 40 km and under three hours old, otherwise from a model. Official warnings come from MetMalaysia's open data feed and are matched to the user's state and district.

Users choose their location by GPS, a preset city or any city name, pick which of seven report sections to see, and set units, clock format and language. Rain and air-quality alerts are opt-in, with a cooldown and quiet hours at night.$$,
    'decisions', $$Built to stay within a free hosting plan: per-run caps on reports and alert checks, short caches, and no server left running.

It keeps working when a data source fails. If Open-Meteo is down the bot switches to MET Norway and says so in the report footer. Requests time out after ten seconds and are retried once, and a health check every five minutes tells the admin when a problem starts and when it ends.

Warnings err on the side of showing. The official feed has no coordinates, so warnings are matched by place name; when the district is unknown the warning is shown anyway, because a missed flood warning is worse than an extra message. Sea warnings are never shown to people on land.$$,
    'validation', $$Around 250 automated tests cover report formatting, the weather and backup sources, warnings matching, alerts, admin tools and translation coverage in all three languages. Type checks and tests run on every push before the automatic deploy, and a separate end-to-end script runs the bot against mock Telegram and weather services.$$,
    'limitations', $$Official warnings cover Malaysia only, and the bot does not replace them. Air quality uses the US EPA scale, not Malaysia's official index. The data is hourly, so "rain soon" means within one to two hours. The backup source has no rain probability, so it is estimated from forecast rainfall.$$
  )
where not exists (select 1 from public.projects where slug = 'skybrief-telegram-bot');
