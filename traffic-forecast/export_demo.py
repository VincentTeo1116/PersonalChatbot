"""Step 3: export what the portfolio's demo section shows.

Writes two files into the website:
  frontend/public/data/traffic-demo.json   October actual vs forecast, hour by hour, for a few sites (loaded on demand by the chart)
  frontend/lib/traffic-metrics.json        the headline numbers (small, rendered with the page)

Usage : python export_demo.py      (after train.py)
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).parent
SITE = HERE.parent / "frontend"
DEMO_SITES = 8
HORIZONS = [1, 7, 14]


def main() -> None:
    metrics = json.loads((HERE / "results" / "metrics.json").read_text(encoding="utf-8"))
    sites = np.load(HERE / "results" / "sites.npy")
    test = pd.read_parquet(HERE / "results" / "test_predictions.parquet",
                           columns=["site_idx", "day_idx", "hour", "horizon", "actual", "model", "last_week"])
    test = test[test["horizon"].isin(HORIZONS)]
    first_day = int(test["day_idx"].min())
    days = int(test["day_idx"].max()) - first_day + 1
    start = pd.Timestamp(metrics["data"]["testTargets"][0])

    # Some days are missing for every site (faulty detectors), so the chart allows gaps: missing hours are exported as null.
    # Pick from the sites with the most complete month, spread from quiet to busy rather than where the model looks best.
    h1 = test[test["horizon"] == 1]
    coverage = h1.groupby("site_idx").size()
    best = coverage[coverage >= coverage.max() - 24].index
    volume = h1[h1["site_idx"].isin(best)].groupby("site_idx")["actual"].mean() * 24
    ordered = volume[volume >= 5000].sort_values()  # near-empty sites make a flat, uninformative chart
    picks = ordered.index[np.linspace(0, len(ordered) - 1, DEMO_SITES).round().astype(int)]
    slots = pd.MultiIndex.from_product([range(first_day, first_day + days), range(24)], names=["day_idx", "hour"])

    def series(rows: pd.DataFrame, column: str) -> list:
        values = rows.set_index(["day_idx", "hour"])[column].reindex(slots)
        return [None if not np.isfinite(v) else int(round(v)) for v in values.to_numpy()]

    out_sites = []
    for idx in picks:
        rows = test[test["site_idx"] == idx].assign(hour=lambda f: f["hour"].astype(int))
        by_h = {h: rows[rows["horizon"] == h] for h in HORIZONS}
        out_sites.append({
            "id": int(sites[idx]),
            "dailyAverage": int(round(volume[idx], -2)),
            "actual": series(by_h[1], "actual"),
            # "Same hour last week" as known 7 days ahead: the previous week's value for that hour.
            "lastWeek": series(by_h[7], "last_week"),
            "model": {str(h): series(by_h[h], "model") for h in HORIZONS},
        })

    # Monday-to-Sunday windows inside the test month. The few days before the first Monday are left out: several are missing for every site.
    dates = pd.date_range(start, periods=days, freq="D")
    weeks = []
    first_monday = next(i for i, d in enumerate(dates) if d.dayofweek == 0)
    for i in range(first_monday, days, 7):
        weeks.append({"start": i, "days": min(7, days - i)})
    for week in weeks:
        a, b = dates[week["start"]], dates[week["start"] + week["days"] - 1]
        week["label"] = f"{a.day}–{b.day} {b.strftime('%b')}"

    demo = {"start": str(start.date()), "days": days, "horizons": HORIZONS, "weeks": weeks, "sites": out_sites}
    (SITE / "public" / "data").mkdir(parents=True, exist_ok=True)
    target = SITE / "public" / "data" / "traffic-demo.json"
    target.write_text(json.dumps(demo, separators=(",", ":")), encoding="utf-8")

    o = metrics["overall"]
    summary = {
        "trainedOn": metrics["trainedOn"],
        "sites": metrics["data"]["sites"],
        "testRows": metrics["data"]["testRows"],
        "testPeriod": metrics["data"]["testTargets"],
        "trainPeriod": metrics["data"]["trainTargets"],
        "meanHourlyVolume": metrics["meanHourlyVolume"],
        "trees": metrics["model"]["trees"],
        "overall": {name: o["hourly"][name] for name in ("model", "typical_day", "last_week")},
        "daily": {name: o["daily"][name] for name in ("model", "typical_day", "last_week")},
        "improvementOverLastWeek": o["improvementOverLastWeek"],
        "improvementOverTypicalDay": o["improvementOverTypicalDay"],
        "byHorizon": [
            {"days": int(h), **{name: b["hourly"][name]["mae"] for name in ("model", "typical_day", "last_week")}, "wape": b["hourly"]["model"]["wape"]}
            for h, b in metrics["byHorizon"].items()
        ],
        "byDayType": {k: {name: b["hourly"][name]["mae"] for name in ("model", "typical_day", "last_week")} for k, b in metrics["byDayType"].items()},
        "featureImportance": metrics["featureImportance"][:8],
    }
    (SITE / "lib" / "traffic-metrics.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"{target.name}: {target.stat().st_size / 1024:.0f} KB, {len(out_sites)} sites {[s['id'] for s in out_sites]}, weeks {[w['label'] for w in weeks]}")


if __name__ == "__main__":
    main()
