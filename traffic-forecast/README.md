# Traffic volume forecast (Victoria, Australia)

Forecasts hourly vehicle counts at traffic-signal sites 1 to 14 days ahead with XGBoost, and compares the model with two
simple baselines on a month it never saw.

## Data

[Traffic Signal Volume Data](https://opendata.transport.vic.gov.au/dataset/traffic-signal-volume-data), Department of
Transport and Planning (Victoria), from the SCATS traffic-signal system. Licensed CC BY 4.0. Fifteen-minute counts per
site and detector; this project uses August, September and October 2026.

- `raw/` holds the three monthly ZIPs (about 135 MB each). They are over GitHub's 100 MB file limit, so the folder is
  git-ignored. Download "Traffic Signal Volume Data August/September/October 2026" from the page above to rebuild it.
- `site_days.parquet` is the condensed version (one row per site and day) that training reads. It is committed, so the
  raw files are only needed to rebuild it.

## Run

```bash
pip install pandas pyarrow numpy xgboost holidays
python prepare.py raw      # only if rebuilding site_days.parquet from the ZIPs
python train.py            # writes results/metrics.json, results/model.json, results/test_predictions.parquet
```

## Method

- 300 sites sampled (fixed seed) from those with at least 85 complete days. A detector row with any missing interval is
  dropped, and a site-day with a dropped detector is treated as missing.
- Every feature is known on the day the forecast is made: calendar facts about the target day (hour, weekday, Victorian
  public and school holidays) and the site's own history up to that day.
- The model predicts the deviation from the site's typical day for that hour and day type.
- Trained on targets from 22 Aug to 30 Sep 2026; design chosen on 10-30 Sep; tested once on all of October 2026.
- Baselines: "last week" (same hour, same weekday, latest week available) and "typical day" (the site's running average
  for that hour and day type).

## Results

See `results/metrics.json` for the current numbers, by forecast horizon and day type.
`results/metrics_v1_direct.json` keeps the first version, which predicted volume directly and did not beat the
typical-day baseline.

## Known limits

- Three months of history, so no yearly seasonality and few examples of holidays.
- Weekends are forecast slightly worse than the typical-day baseline.
- Counts are detector activations, with at most 24 detectors recorded per site.
- No weather, roadworks or event data.
