-- Adds the Rapid KL ridership forecasting project and its case study. Run once in the Supabase SQL editor (after 014).
-- Safe to rerun: if a project with this slug already exists, nothing is changed.
-- READ FIRST: the "contribution" text below is a neutral placeholder. Rewrite it to say what you did yourself before
-- running this, or edit it afterwards in /admin/projects.
-- The numbers come from rapidkl-forecast/results/metrics.json (run of 13 Nov 2026).

insert into public.projects (slug, title, description, tags, links, featured, sort_order, role, impact, seo_title, seo_description, case_study)
select
  'rapid-kl-ridership-forecast',
  'Rapid KL Ridership Forecast',
  $$A live forecast of daily passenger entries on the Rapid KL rail network, up to 28 days ahead, for the whole network, each line and each of 166 stations. An XGBoost model is refreshed every evening with the newest open data and shown on this site as an interactive chart and table.$$,
  array['XGBoost', 'Python', 'pandas', 'Time-series forecasting', 'GitHub Actions', 'Next.js'],
  '[{"label": "Code", "url": "https://github.com/VincentTeo1116/PersonalChatbot/tree/main/rapidkl-forecast"}, {"label": "Dataset", "url": "https://data.gov.my/data-catalogue/ridership_od_rapidrail_daily"}]'::jsonb,
  true,
  coalesce((select max(sort_order) + 1 from public.projects), 0),
  'Personal project',
  '4.1% average error on a year of unseen days; 37% less error than the usual-level baseline, and refreshed daily.',
  'Forecasting Rapid KL Ridership 28 Days Ahead with XGBoost',
  'A daily-refreshed XGBoost forecast of Rapid KL rail ridership for the network, lines and 166 stations, tested on a full unseen year including Hari Raya and Chinese New Year.',
  jsonb_build_object(
    'problem', $$How busy will the Rapid KL rail network be next week? Operators, businesses near stations and commuters all plan around that, and the answer changes sharply around public holidays, Ramadan and festive seasons.

Malaysia's open-data portal publishes how many trips are made between every pair of Rapid Rail stations each day (Daily Origin-Destination Ridership: Rapid Rail, data.gov.my, CC BY 4.0), from January 2023 onward and refreshed daily. This project turns that into a forecast for dates that have not happened yet.$$,
    'contribution', $$A personal project covering the data pipeline, the model, its evaluation, the daily forecasting job and the chart on this site.$$,
    'approach', $$Station entries are taken from the portal's per-station totals, then summed into 174 daily series: the whole network, 7 lines and 166 stations.

One pooled XGBoost model covers every series. It predicts how far a day will sit above or below that series' usual level for the weekday (the median of the six most recent same weekdays), on a log scale, so quiet and busy stations share one model and holiday effects are learned as percentages.

Every input is known on the day the forecast is made: the weekday, month and day of the month; Kuala Lumpur public holidays, the days before and after them, bridge days, Ramadan, and distance from Hari Raya and Chinese New Year; and the series' own recent history, trend and the same period a year earlier.

A scheduled GitHub Actions job runs every evening: it downloads the newest data, forecasts the next 28 days and publishes the result as a file that this site reads. No server has to stay running.$$,
    'decisions', $$The data is split by date, never at random: trained on targets up to 11 November 2025, with the design chosen on the six months before that, then tested once on the following full year.

Two baselines that need no model are reported beside it: "same weekday last week" and the usual level itself. A model that cannot beat them is not worth running.

Hourly forecasts were considered and dropped: only daily figures are published for Rapid Rail, and inventing an hourly pattern would not be honest.

The numbers are station entries, where each journey is counted once at the station it starts from. They are lower than the operator's official line ridership, which also counts passengers transferring onto a line, so the page says "entries" and does not claim to forecast the official figures.

The forecast range shown on the chart is empirical: it is where 8 in 10 past forecasts fell in the test year, not a theoretical confidence interval.$$,
    'validation', $$Tested on 12 November 2025 to 11 November 2026 (about 520,000 forecasts, made 1 to 28 days ahead), as the error in percent of ridership:

- Whole network: model 4.1%, usual level 6.5%, same weekday last week 8.9%
- Lines: model 4.5%, usual level 7.0%, last week 9.4%
- Stations: model 6.8%, usual level 9.1%, last week 11.7%

That is 37% less error than the usual-level baseline for the network, and 25% less for single stations.

Most of the gain comes from holidays. Around public holidays, Chinese New Year and Hari Raya the network error is 9.9% against 28.6% for the usual level. On ordinary days it is 3.5% against 4.0%, a much smaller margin.

Error grows slowly with distance: 3.6% one day ahead and 4.7% at 28 days. The site also keeps each published forecast and compares it with the real figure once that is released, so the track record is public.$$,
    'limitations', $$There is no hourly forecast, because hourly data is not published.

Holiday periods are still about three times harder than ordinary days, and Islamic holiday dates in future years are estimates until they are officially announced. School holidays, weather, service disruptions, fare changes and one-off events are not modelled.

A brand-new station or line has little history; the LRT Shah Alam Line only has data from August 2026, so its forecasts deserve less trust.

Next steps are to add school-holiday dates, retrain on a schedule, and report the live track record by station as well as for the network.$$
  )
where not exists (select 1 from public.projects where slug = 'rapid-kl-ridership-forecast');
