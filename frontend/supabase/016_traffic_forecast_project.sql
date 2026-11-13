-- Adds the traffic forecasting project and its case study. Run once in the Supabase SQL editor (after 014).
-- Safe to rerun: if a project with this slug already exists, nothing is changed. Edit the text first if anything is not accurate,
-- or afterwards in /admin/projects. The numbers come from traffic-forecast/results/metrics.json (run of 13 Nov 2026).

insert into public.projects (slug, title, description, tags, links, featured, sort_order, role, impact, seo_title, seo_description, case_study)
select
  'traffic-volume-forecasting',
  'Traffic Volume Forecasting',
  $$An XGBoost model that forecasts hourly vehicle counts at signalised intersections in Victoria, Australia, from 1 to 14 days ahead. It was tested on a full month it never saw and compared with two simple baselines, and it is shown on this site as an interactive forecast-versus-actual chart.$$,
  array['XGBoost', 'Python', 'pandas', 'Time-series forecasting', 'Model evaluation'],
  '[{"label": "Code", "url": "https://github.com/VincentTeo1116/PersonalChatbot/tree/main/traffic-forecast"}, {"label": "Dataset", "url": "https://opendata.transport.vic.gov.au/dataset/traffic-signal-volume-data"}]'::jsonb,
  false,
  coalesce((select max(sort_order) + 1 from public.projects), 0),
  'Group assignment: project idea, model design and backend code',
  '7.7% average error on 1.2 million hourly forecasts; 16.6% less error than "same hour last week".',
  'Traffic Volume Forecasting with XGBoost: an Honest Evaluation',
  'Hourly traffic forecasts for 300 intersections in Victoria with XGBoost: a time-based test on unseen data, two baselines, a data leak found and fixed, and the limits.',
  jsonb_build_object(
    'problem', $$Road authorities and drivers both benefit from knowing how busy an intersection will be before the day arrives. The question for this project was how well next week's traffic can be predicted, hour by hour, from nothing more than the counts the traffic signals already record.

The data is the Traffic Signal Volume Data published by Victoria's Department of Transport and Planning from the SCATS signal system (CC BY 4.0): vehicle counts every 15 minutes for each detector at about 4,700 sites.$$,
    'contribution', $$This began as a group assignment. I proposed the idea and the plan for what the project should cover, designed the model approach, and wrote the backend code for data processing and model training.

After the assignment I went back to the evaluation, found that the original scores were unreliable, and rebuilt the features, the train/test split and the baselines that are reported here.$$,
    'approach', $$Three months of data (August to October 2026) are condensed to hourly totals per site. A detector with any missing interval is dropped for that day, and a site-day with a dropped detector is treated as missing rather than as low traffic. 300 sites are sampled from those with at least 85 complete days.

Every input is something known on the day the forecast is made: the hour and weekday of the target day, Victorian public and school holidays, and the site's own history up to that day (the same hour one and two weeks earlier, its typical day so far, and how recent days have differed from typical).

The model predicts how far each hour will deviate from the site's typical day, and that deviation is added back to the typical value. It is trained on targets from 22 August to 30 September and tested once on every day of October, for forecasts made 1 to 14 days ahead.$$,
    'decisions', $$The test is split by time, not at random. A random split lets the model train on days that come after the days it is tested on, which flatters any forecasting model.

Two baselines that need no model are reported beside it: "same hour last week" and the site's typical day (its running average for that hour and day type). Without them an R² near 0.97 looks impressive, when traffic is simply very regular.

Predicting the deviation from the typical day, rather than the volume itself, came from a failed first attempt. A model that predicted volume directly did 3% worse than the typical-day average on the test month. The typical day is already a strong forecast, so the model's job became correcting it. That design was chosen using September data only, so October stayed a fair test.$$,
    'validation', $$On October 2026 (300 sites, about 1.2 million hourly forecasts, sites averaging about 1,270 vehicles an hour):

- Model: average error 98.1 vehicles an hour (7.7% of traffic), R² 0.971
- Typical-day average: 102.5 (8.1%), R² 0.969
- Same hour last week: 117.6 (9.3%), R² 0.949

The model has 16.6% less error than "same hour last week" and 4.2% less than the typical-day average. Looking further ahead costs little: about 96 vehicles an hour one day ahead and about 100 at 14 days. In school holidays the model is 5% better than the typical-day average, while "same hour last week" does much worse.

The original assignment reported an R² of 0.99. That figure was not real: one input, meant to be the traffic 24 hours earlier, was in fact the value being predicted, and the data was split at random. Fixing both is what produced the numbers above.$$,
    'limitations', $$The margin over a plain average is small. With three months of history the model settled on only 14 trees, so it is a light correction on top of the average; more history would probably help more than more tuning.

Weekends are forecast 4.8% worse than the typical-day average. There is no weather, roadworks or event data, so surprises are not predicted. The counts are detector activations, with at most 24 detectors recorded per site.

Next steps are to add more months of history, forecast future dates from a daily data refresh, and keep each forecast to compare with what later happened.$$
  )
where not exists (select 1 from public.projects where slug = 'traffic-volume-forecasting');
