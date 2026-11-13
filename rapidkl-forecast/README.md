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
python model.py --production   # refit on all data for live forecasting -> results/model_production.json
python forecast.py             # forecast the next 28 days -> forecast.json
```

## Daily refresh

`.github/workflows/rapidkl-forecast.yml` runs every evening (Malaysia time). It runs `prepare.py` and `forecast.py` and
uploads `rapidkl-forecast.json` to the repository's `forecast-data` release. The website's `/api/rapidkl-forecast` route
reads that file (and falls back to the copy in `frontend/lib/rapidkl-forecast-seed.json`). Each run also scores the
previous forecast against newly published figures and keeps the result in the file's `track` list.

The model itself is not retrained by the daily job. Re-run `model.py` and `model.py --production` every few months, or
after a big change to the network, and commit the new `results/` files.

## Method and results

See the docstring in `model.py` for the method and `results/metrics.json` for the numbers by series type, forecast
horizon and day type.

## Known limits

- No hourly forecast (no hourly data is published).
- Holiday periods are about three times harder than ordinary days; future Islamic holiday dates are estimates.
- School holidays, weather, disruptions and events are not modelled.
- New stations and lines have little history.
