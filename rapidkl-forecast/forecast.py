"""Step 3: forecast the next 28 days and write the file the website reads.

Run daily (see .github/workflows/rapidkl-forecast.yml):
    python prepare.py          refresh the data
    python forecast.py         write forecast.json

forecast.json holds, for the network, every line and every station:
  - the last 56 days of actual entries (context for the chart)
  - a forecast for each of the next 28 days, with a likely range and the usual level for that weekday
  - a track record: earlier forecasts compared with what then happened (carried over from the previous forecast.json)
  - backtest summary numbers from results/metrics.json

Usage : python forecast.py [--previous path/to/yesterdays/forecast.json] [--out path]
"""
import argparse
import datetime as dt
import json
from pathlib import Path

import holidays
import numpy as np
import pandas as pd
import xgboost as xgb

import model as m
from prepare import LINES

HERE = Path(__file__).parent
DAYS_AHEAD = 28
CONTEXT_DAYS = 56
TRACK_LIMIT = 120


def label(series: str) -> str:
    if series == "ALL":
        return "Whole network"
    if series.startswith("LINE:"):
        return f"{LINES[series[5:]]} (all stations)"
    code, _, name = series.partition(": ")
    return f"{name} ({code})"


def interval_bucket(horizon: int) -> str:
    return "1-7" if horizon <= 7 else "8-14" if horizon <= 14 else "15-28"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--previous", default=str(HERE / "forecast.json"))
    parser.add_argument("--out", default=str(HERE / "forecast.json"))
    args = parser.parse_args()

    metrics = json.loads((m.OUT / "metrics.json").read_text(encoding="utf-8"))
    booster = xgb.Booster()
    booster.load_model(m.OUT / "model_production.json")
    entries, meta = m.load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    last = len(days) - 1
    future = pd.date_range(days[0], days[-1] + pd.Timedelta(days=DAYS_AHEAD), freq="D")
    cal = m.calendar(future)

    # One horizon per future day: day k after the last known day is forecast k days ahead.
    frames = [m.build(values, cal, meta, np.array([last + k]), k, keep_unknown_targets=True) for k in range(1, DAYS_AHEAD + 1)]
    frame = pd.concat(frames, ignore_index=True)
    frame["forecast"] = m.predict(booster, frame)

    kind_name = {0: "network", 1: "lines", 2: "stations"}
    my = holidays.MY(subdiv="KUL", years=sorted(set(future.year)))
    day_list = []
    for k in range(1, DAYS_AHEAD + 1):
        date = future[last + k]
        day_list.append({"date": str(date.date()), "horizon": k, "holiday": my.get(date.date()), "ramadan": bool(cal["ramadan"].iloc[last + k])})

    series_out = []
    for i, name in enumerate(entries.columns):
        rows = frame[frame["series_idx"] == i].set_index("horizon")
        if len(rows) < DAYS_AHEAD:  # too little recent data (for example a station closed for works)
            continue
        kind = kind_name[int(meta["kind"].iloc[i])]
        low_high = [metrics["intervals"][kind][interval_bucket(k)] for k in range(1, DAYS_AHEAD + 1)]
        forecast = rows.loc[range(1, DAYS_AHEAD + 1), "forecast"].to_numpy()
        history = values[last - CONTEXT_DAYS + 1:, i]
        series_out.append({
            "id": name, "label": label(name), "kind": kind,
            "history": [None if not np.isfinite(v) else int(round(v)) for v in history],
            "forecast": [int(round(v)) for v in forecast],
            "low": [int(round(v * (1 + lh[0]))) for v, lh in zip(forecast, low_high)],
            "high": [int(round(v * (1 + lh[1]))) for v, lh in zip(forecast, low_high)],
            "usual": [int(round(v)) for v in rows.loc[range(1, DAYS_AHEAD + 1), "usual"].to_numpy()],
        })

    # Track record: for each newly published actual day, score the forecast that was on the site the day before (network only, so it stays small).
    track = []
    previous_path = Path(args.previous)
    if previous_path.exists():
        previous = json.loads(previous_path.read_text(encoding="utf-8"))
        track = previous.get("track", [])
        scored = {t["date"] for t in track}
        old_network = next((s for s in previous.get("series", []) if s["id"] == "ALL"), None)
        if old_network:
            actual_all = entries["ALL"]
            for day, value in zip(previous["days"], old_network["forecast"]):
                date = pd.Timestamp(day["date"])
                if day["date"] not in scored and date in actual_all.index and np.isfinite(actual_all[date]):
                    track.append({"date": day["date"], "madeOn": previous["dataThrough"], "daysAhead": day["horizon"],
                                  "forecast": int(value), "actual": int(actual_all[date])})
    track = sorted(track, key=lambda t: t["date"])[-TRACK_LIMIT:]

    kinds = metrics["byKind"]
    out = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "dataThrough": str(days[-1].date()),
        "historyStart": str(days[last - CONTEXT_DAYS + 1].date()),
        "days": day_list,
        "series": series_out,
        "track": track,
        "backtest": {
            "period": metrics["data"]["test"],
            "trees": metrics["model"]["trees"],
            "testRows": metrics["data"]["testRows"],
            **{name: {"model": kinds[name]["model"]["wape"], "usual": kinds[name]["usual"]["wape"], "lastWeek": kinds[name]["last_week"]["wape"],
                      "holidayModel": metrics["byDayType"][name]["holidayPeriods"]["model"]["wape"], "holidayUsual": metrics["byDayType"][name]["holidayPeriods"]["usual"]["wape"]}
               for name in ("network", "lines", "stations")},
            "networkByHorizon": [{"days": int(h), "model": b["model"]["wape"], "usual": b["usual"]["wape"]} for h, b in metrics["byHorizon"]["network"].items()],
        },
        "source": "Daily Origin-Destination Ridership: Rapid Rail (KV), data.gov.my (Prasarana / Ministry of Transport), CC BY 4.0",
    }
    Path(args.out).write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    network = next(s for s in series_out if s["id"] == "ALL")
    print(f"data through {out['dataThrough']}; {len(series_out)} series; {Path(args.out).stat().st_size / 1024:.0f} KB; track {len(track)} days")
    for day, f, u in list(zip(day_list, network["forecast"], network["usual"]))[:10]:
        print(f"  {day['date']} {pd.Timestamp(day['date']).day_name()[:3]}  forecast {f:>8,}  usual {u:>8,}  {day['holiday'] or ''}")


if __name__ == "__main__":
    main()
