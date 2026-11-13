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
python forecast.py             # forecast the next 28 days -> forecast.json
```

## Daily refresh

`.github/workflows/rapidkl-forecast.yml` runs every evening (Malaysia time). It runs `prepare.py` and `forecast.py` and
uploads `rapidkl-forecast.json` to the repository's `forecast-data` release. The website's `/api/rapidkl-forecast` route
reads that file (and falls back to the copy in `frontend/lib/rapidkl-forecast-seed.json`). Each run also scores the
previous forecast against newly published figures and keeps the result in the file's `track` list.

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
(usual level 6.3%, last week 8.9%), 4.5% for lines and 6.7% for stations.

The likely range comes from quantile models for the 10th and 90th percentiles, widened by a correction measured on the
validation period (`calibrate_range`). It held the real figure 77% to 79% of the time on the test year against a target
of 80%; without the correction it was 59% for the network (`results/metrics_v2_uncalibrated.json`).

`results/experiments.json` records the ideas that were tried on earlier data. Kept: a usual level that skips public
holidays and disrupted days. Dropped: school holidays, holiday type and holiday weighting (no consistent gain), and
same-day rainfall (about 5% better for the network, but only with rainfall known in advance). `results/metrics_v1.json`
is the first version for comparison (network 4.1%).

## Known limits

- No hourly forecast (no hourly data is published).
- Holiday periods are about three times harder than ordinary days; future Islamic holiday dates are estimates.
- Weather, disruptions and events are not modelled.
- School-holiday dates for 2027 are not published yet (this only matters if that switch in `CONFIG` is turned on).
- New stations and lines have little history.
