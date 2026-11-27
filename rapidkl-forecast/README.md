# Rapid KL ridership forecast

Forecasts daily passenger entries on the Rapid KL rail network up to 28 days ahead, for the whole network, each line and
each station, with XGBoost. A scheduled job refreshes the forecast every evening.

## Data

[Daily Origin-Destination Ridership: Rapid Rail (KV)](https://data.gov.my/data-catalogue/ridership_od_rapidrail_daily),
data.gov.my (Prasarana / Ministry of Transport), CC BY 4.0. Daily trips between every pair of stations since January
2023, refreshed daily. Only daily figures are published, so there is no hourly forecast.

The series are station entries: each journey is counted once, at the station where it starts. They are lower than the
operator's official line ridership, which also counts transferring passengers.

- `raw/` holds the yearly source files (about 6 MB each). It is git-ignored; `prepare.py` downloads them.
- `entries.parquet` (1 MB) is the condensed table the model reads: one column per series, one row per day.

## Run

```bash
pip install -r requirements.txt
python prepare.py              # download the data and rebuild entries.parquet
python model.py                # train, test on the last 12 months, write results/metrics.json
python model.py --production   # refit on all data for live forecasting -> results/model_production*.json
python experiments.py          # optional: re-test the design ideas on data from before the test year
python rolling_backtest.py     # optional: retrain before five different cut-off dates and score the next 3 months each -> results/rolling.json
python compare_models.py       # optional: XGBoost vs LightGBM, random forest, ridge and a neural network (pip install -r requirements-compare.txt)
python forecast.py             # forecast the next 28 days -> forecast.json
python -m unittest discover -s tests   # the checks that decide what is safe to publish (also run in CI)
```

## Daily refresh

`.github/workflows/rapidkl-forecast.yml` runs every evening (Malaysia time). It runs `prepare.py` and `forecast.py` and
uploads `rapidkl-forecast.json` to the repository's `forecast-data` release. The website's `/api/rapidkl-forecast` route
reads that file (and falls back to the copy in `frontend/lib/rapidkl-forecast-seed.json`). Each run also scores the
previous forecast against newly published figures and keeps the result in the file's `track` list.

What the daily run does beyond forecasting:

- **Track record.** `track` scores the network forecast made the day before; `trackLong` scores forecasts made 7, 14 and 28 days ahead (from the
  `archive` of past forecasts kept in the file, so it fills up over four weeks); `live` summarises error, bias and how often the real figure fell
  inside the range, by days ahead. When a station's real figure is far above its forecast (1.8 times and at least 1,500 entries more), the day is
  marked with that station under `events`: that is what a concert or match looks like.
- **Recent-miss nudge.** The network forecast for the next day is shifted by half of the last week's median miss (the model's own one-day forecasts
  against what happened, with station events taken out so a concert does not count as a change in demand). The weight was chosen on the validation
  year only; on the untouched test year it cut next-day network error from 3.7% to 3.4%. It did nothing for later days, lines or stations, so it is
  not applied there. It is switched off when fewer than 4 of the last 7 days have been scored, and it always learns from the model's raw forecast
  (`rawForecast`), never from a forecast that was itself nudged.
- **Fallbacks.** A missing or unreadable previous file restarts the track record and switches the nudge off; an error in the track record or nudge
  code is logged and the plain model forecast is still written. A retrained model is used only if its feature list and design version (`DESIGN` in
  `model.py`) match this code, otherwise the copy in `results/` is. The finished file is checked before it is written (28 days, no gaps or
  negatives, forecast inside its range, no collapse in the number of series, data no more than 14 days old); if the check fails nothing is
  published and the site keeps serving the last good file. The workflow keeps yesterday's file on the release as `rapidkl-forecast-backup.json`.

## Monthly retraining

`.github/workflows/rapidkl-retrain.yml` runs on the 1st of each month. It refits the model on all data published so far
(`model.py --production`), compares its 28-day forecast with the model in use, and uploads the two model files to the
`forecast-data` release unless a network or line total moved by more than 15%. The daily job downloads those files and
uses them when they match the current feature list; otherwise it uses the copies in `results/`.

Retraining keeps the tested design (features, number of trees, range calibration) and only adds data. After changing the
design in `model.py`, run `model.py` and `model.py --production` yourself, commit the new `results/` files, then run the
retrain workflow once by hand so the release holds a model for the new design.

## Method and results

See the docstring in `model.py` for the method and `results/metrics.json` for the numbers by series type, forecast
horizon and day type. On the test year (12 Nov 2025 to 11 Nov 2026) the error is 4.2% of ridership for the network
(usual level 6.3%, last week 8.9%, same weekday a year earlier 9.3%), 4.5% for lines and 6.7% for stations.

Where the gain comes from, and how sure it is (`bootstrap95` in `metrics.json` resamples whole calendar weeks):

- **Holiday periods** are where the model earns its keep: network error 9.8% against 28.1% for the usual level (the 95% range for the gain is
  54% to 76%).
- **Ordinary days** are close to the usual level: network 3.6% against 3.8%, and the 95% range for the gain runs from -9% to +18%, so for the
  network alone it cannot be told apart from the usual level. For lines (+1% to +19%) and stations (+2% to +14%) the gain is small but real.
- **Over time.** `rolling_backtest.py` trains only on days before each of five cut-offs and scores the next three months. The model beat the usual
  level in all five folds; network error ranged from 3.2% to 6.2% (mean 4.0%). The worst fold (Feb to May 2026, Ramadan, Hari Raya and Chinese
  New Year) was worse than the usual level on ordinary days (4.3% against 2.5%): the model has seen only three Ramadans.

The likely range comes from quantile models for the 10th and 90th percentiles, widened by a correction measured on the
validation period (`calibrate_range`), separately for near (1 to 7 days) and far (8 to 28 days) forecasts. It held the real figure 77% to 79% of
the time on the test year against a target of 80%; without the correction it was 59% for the network.
It is weakest in holiday periods for lines (72%) and stations (74%) and on ordinary network days (77%); coverage by horizon is in `rangeCoverage`.

`results/experiments.json` records the ideas that were tried on earlier data. Kept: a usual level that skips public
holidays and disrupted days. Dropped: school holidays, holiday type and holiday weighting (no consistent gain), and
same-day rainfall (about 5% better for the network, but only with rainfall known in advance). The first version
scored 4.1% for the network.

Tried after the 19 and 20 Nov 2026 concert at Bukit Jalil, and dropped: capping how far a past day may sit from its usual level when used as an
input, and leaving station spikes out of training. Both helped a little on the two validation windows, but on the test year they were neutral
overall and worse on the day after a spike at Bukit Jalil, because events there run on consecutive nights and a spike yesterday really does predict
one today. The switches (`clip_dev`, `drop_spikes`) stay in `CONFIG`, off. (That check looked at the test year, so it is no longer completely
untouched; the rolling backtest is the cleaner evidence.)

## Known limits

- No hourly forecast (no hourly data is published).
- Holiday periods are about three times harder than ordinary days; future Islamic holiday dates are estimates.
- Weather, disruptions and events are not modelled. Events matter locally: 181 station-days in the test year ran at more than 1.8 times their
  forecast, mostly at Bukit Jalil, Glenmarie, Merdeka, Persiaran KLCC and Maharajalela. A concert at Bukit Jalil added about 16,000 entries on each of
  19 and 20 Nov 2026 (about 2% of the network total, and a third to 40% of the miss on those two days; the rest was a broader shortfall). The track record names such days, but the forecast does not know about events in advance.
- Ramadan and Hari Raya are learned from three occurrences.
- School-holiday dates for 2027 are not published yet (this only matters if that switch in `CONFIG` is turned on).
- New stations and lines have little history.
