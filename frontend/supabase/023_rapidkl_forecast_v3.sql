-- Updates the Rapid KL forecast case study for the third round of work (23 Nov 2026): a public track record at 1, 7, 14 and 28 days ahead,
-- a next-day nudge from the last week's misses, safety checks before publishing, error ranges and a rolling backtest.
-- The model itself is unchanged, so every headline number stays as in 018. Run once in the Supabase SQL editor, then press "Sync chatbot"
-- in /admin/chatbot so the assistant answers from the new text. The "problem" and "contribution" text are left as they are.
-- Numbers: rapidkl-forecast/results/metrics.json (bootstrap95, recentMiss, byKind.*.last_year) and results/rolling.json.

update public.projects
set case_study = case_study || jsonb_build_object(
      'approach', $$Station entries are taken from the portal's per-station totals, then summed into 174 daily series: the whole network, 7 lines and 166 stations.

One pooled XGBoost model covers every series. It predicts how far a day will sit above or below that series' usual level for the weekday (the median of recent same weekdays, leaving out public holidays and disrupted days such as a station closure), on a log scale, so quiet and busy stations share one model and holiday effects are learned as percentages.

Every input is known on the day the forecast is made: the weekday, month and day of the month; Kuala Lumpur public holidays, the days before and after them, bridge days, Ramadan, and distance from Hari Raya and Chinese New Year; and the series' own recent history, trend and the same period a year earlier.

A scheduled GitHub Actions job runs every evening: it downloads the newest data, forecasts the next 28 days and publishes the result as a file that this site reads. A second job retrains the model on the 1st of each month and publishes it only if its forecasts stay close to the previous model's. No server has to stay running.

The evening job also checks its own work. It scores the forecasts it published earlier against the real figures, one day ahead and also 7, 14 and 28 days ahead, and shows the error, the bias and how often the real figure fell inside the range. For the next day only, the network forecast is nudged by half of the last week's median miss. Days when a single station runs far above its forecast, such as a concert, are taken out of that miss so an event is not mistaken for a change in demand.

Before publishing, the job checks the file: 28 days, no gaps or negative numbers, every forecast inside its own range, no collapse in the number of series, and data that is not stale. If a check fails nothing is published and the site keeps the last good file. A missing or damaged previous file only restarts the track record, and a retrained model is used only if it matches the current design.$$,
      'decisions', $$The data is split by date, never at random: trained on targets up to 11 November 2025, with the design chosen on the six months before that, then tested on the following full year. The test year was meant to be used once; it was looked at again to decide not to keep one late change (below), so a rolling backtest was added as cleaner evidence.

Three baselines that need no model are reported beside it: "same weekday last week", "same weekday a year earlier" and the usual level itself. A model that cannot beat them is not worth running.

Hourly forecasts were considered and dropped: only daily figures are published for Rapid Rail, and inventing an hourly pattern would not be honest.

The numbers are station entries, where each journey is counted once at the station it starts from. They are lower than the operator's official line ridership, which also counts passengers transferring onto a line, so the page says "entries" and does not claim to forecast the official figures.

The forecast range on the chart comes from two extra models that predict the low and high ends directly (quantile regression), so it widens around holidays and narrows on ordinary days. On their own those models were overconfident: only 59% of network outcomes fell inside a range meant to hold 80%. The range is therefore widened by the amount needed on held-out data (conformal calibration), separately for near and far forecasts, which brought it to 77% to 79%.

Several ideas were tested on earlier data and dropped because they did not help consistently: school-holiday dates, holiday type, and extra weight on holiday days. Same-day rainfall cut the network error by about 5%, but only when the true rainfall was known in advance, so it is left out until it is tested with real weather forecasts.

After a concert at Bukit Jalil in November 2026 pushed the network 6% above forecast on two days, two fixes were tried: capping how far a past day may sit from usual when it is used as an input, and leaving station spikes out of training. Both helped slightly on the two validation periods, but on the test year they were neutral overall and worse the day after a spike at Bukit Jalil, because events there run on consecutive nights and yesterday's spike really does predict today's. They are switched off.

The next-day nudge was handled differently: its weight was chosen on the validation period only, for each horizon from 1 to 10 days, and kept only where it cut the error by at least 2%. Only the next day qualified. On the test year it cut next-day network error from 3.7% to 3.4%, and it did nothing for lines or stations, so it is used for the network only.$$,
      'validation', $$Tested on 12 November 2025 to 11 November 2026 (about 520,000 forecasts, made 1 to 28 days ahead), as the error in percent of ridership:

- Whole network: model 4.2%, usual level 6.3%, same weekday last week 8.9%, same weekday last year 9.3%
- Lines: model 4.5%, usual level 6.8%, last week 9.4%, last year 9.6%
- Stations: model 6.7%, usual level 9.0%, last week 11.7%, last year 12.9%

That is 33% less error than the usual-level baseline for the network, and 26% less for single stations.

Most of the gain comes from holidays. Around public holidays, Chinese New Year and Hari Raya the network error is 9.8% against 28.1% for the usual level, and resampling whole weeks puts the 95% range of that gain at 54% to 76%. On ordinary days the network error is 3.6% against 3.8%, and the 95% range for that gain runs from -9% to +18%, so for the network alone it cannot be told apart from the usual level. For lines (+1% to +19%) and stations (+2% to +14%) the gain is small but real.

A rolling backtest trained the model only on days before each of five cut-off dates and scored the following three months. It beat the usual level in all five, with network error between 3.2% and 6.2% (average 4.0%). The weakest period, February to May 2026 (Ramadan, Hari Raya and Chinese New Year), was worse than the usual level on ordinary days: 4.3% against 2.5%.

Error grows slowly with distance: 3.7% one day ahead and 4.8% at 28 days. The 80% range held the real figure 77% of the time for the network and 79% for lines and stations; it is weakest in holiday periods for lines and stations (72% and 74%). The site keeps each published forecast and compares it with the real figure once that is released, at 1, 7, 14 and 28 days ahead, so the track record is public.$$,
      'limitations', $$There is no hourly forecast, because hourly data is not published.

Holiday periods are still about three times harder than ordinary days, and Islamic holiday dates in future years are estimates until they are officially announced. Ramadan and Hari Raya are learned from only three occurrences, which is why the rolling backtest was weakest around them.

Weather, service disruptions, fare changes and one-off events are not modelled. Events matter locally: in the test year 181 station-days ran at more than 1.8 times their forecast, mostly at Bukit Jalil, Glenmarie, Merdeka, Persiaran KLCC and Maharajalela. A concert at Bukit Jalil added about 16,000 entries on each of 19 and 20 November 2026. The forecast cannot know about an event in advance; the track record names such days afterwards.

A brand-new station or line has little history; the LRT Shah Alam Line only has data from August 2026, so its forecasts deserve less trust.

Next steps are a calendar of large events near stations, a better treatment of Ramadan, testing rainfall using archived weather forecasts, and reporting the live track record by station as well as for the network.$$
    )
where slug = 'rapid-kl-ridership-forecast';
