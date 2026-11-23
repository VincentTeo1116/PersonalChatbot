"""Step 3: forecast the next 28 days and write the file the website reads.

Run daily (see .github/workflows/rapidkl-forecast.yml):
    python prepare.py          refresh the data
    python forecast.py         write forecast.json

forecast.json holds, for the network, every line and every station:
  - the last 56 days of actual entries (context for the chart)
  - a forecast for each of the next 28 days, with a likely range and the usual level for that weekday
  - a track record: earlier forecasts compared with what then happened (carried over from the previous forecast.json),
    one day ahead (`track`) and 7, 14 and 28 days ahead (`trackLong`), plus a `live` summary of how they did
  - backtest summary numbers from results/metrics.json

The network forecast for the first few days is nudged by how far the last week's forecasts missed (see `recent_miss`).
The nudge is switched off whenever the evidence is thin, and every extra (track record, nudge) is optional: if one fails,
the plain model forecast is still written.

The model files come from results/ (trained when the design last changed). The monthly retraining job publishes newer
ones; pass their folder with --models and they are used when they match the current feature list and design version.

Usage : python forecast.py [--previous path/to/yesterdays/forecast.json] [--out path] [--models folder] [--max-age-days n]
"""
import argparse
import datetime as dt
import json
import math
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
LONG_HORIZONS = (7, 14, 28)  # the track record also scores forecasts made this many days ahead
ARCHIVE_DAYS = 45  # how many past network forecasts are kept so they can be scored later
LIVE_WINDOW = 60  # days the live summary looks back over


def label(series: str) -> str:
    if series == "ALL":
        return "Whole network"
    if series.startswith("LINE:"):
        return f"{LINES[series[5:]]} (all stations)"
    code, _, name = series.partition(": ")
    return f"{name} ({code})"


def load_model(name: str, folder: str | None) -> tuple[xgb.Booster, str]:
    """The retrained copy in `folder` when it exists and matches today's feature list and design version, otherwise the copy in results/."""
    for path, origin in ((Path(folder) / name if folder else None, "retrained"), (m.OUT / name, "repository")):
        if path is None or not path.exists():
            continue
        try:
            booster = xgb.Booster()
            booster.load_model(path)
        except Exception as error:  # a damaged download must not stop the daily forecast
            print(f"skipping {path}: {error}")
            continue
        if booster.feature_names != m.features():
            print(f"skipping {path}: trained on a different feature list")
        elif booster.attr("design") != m.DESIGN:
            print(f"skipping {path}: trained for design {booster.attr('design')!r}, this code is {m.DESIGN!r}")
        else:
            return booster, origin
    raise SystemExit(f"no usable {name}")


def read_previous(path: Path) -> dict:
    """Yesterday's file, or an empty one when it is missing or damaged: the track record then simply starts again."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("days"), list) and isinstance(data.get("series"), list):
            return data
    except Exception as error:
        if path.exists():
            print(f"ignoring unreadable previous forecast {path}: {error}")
    return {}


def finite(value) -> bool:
    return value is not None and isinstance(value, (int, float)) and math.isfinite(value)


def archive_update(previous: dict) -> dict:
    """Network forecasts by the date their data ended, so a forecast made 7, 14 or 28 days ago can be scored when its day arrives."""
    archive = {k: v for k, v in (previous.get("archive") or {}).items() if isinstance(v, dict)}
    network = next((s for s in previous.get("series", []) if s.get("id") == "ALL"), None)
    if network and previous.get("dataThrough") and previous["dataThrough"] not in archive:  # first run after this feature was added
        archive[previous["dataThrough"]] = {"f": network["forecast"], "lo": network["low"], "hi": network["high"]}
    return archive


def score_previous(previous: dict, entries: pd.DataFrame, track: list[dict]) -> list[dict]:
    """Adds, for each newly published actual day, the network forecast that was on the site, and what the station forecasts say about the miss.

    `rawForecast` is the model's own number before the recent-miss nudge, so the nudge never learns from itself.
    `adjActual` is the actual with station-level events (see model.is_spike) taken out: a concert should not look like a new demand level."""
    scored = {t["date"] for t in track}
    network = next((s for s in previous.get("series", []) if s["id"] == "ALL"), None)
    if not network:
        return track
    raw = network.get("rawForecast") or network["forecast"]
    stations = [s for s in previous["series"] if s["kind"] == "stations" and s["id"] in entries.columns]
    actual_all = entries["ALL"]
    for k, day in enumerate(previous["days"]):
        date = pd.Timestamp(day["date"])
        if day["date"] in scored or date not in actual_all.index or not np.isfinite(actual_all[date]):
            continue
        events = []
        for s in stations:
            a, f = entries[s["id"]].get(date, np.nan), s["forecast"][k]
            if np.isfinite(a) and m.is_spike(a, f):
                events.append({"station": s["label"], "extra": int(a - f)})
        events.sort(key=lambda e: -e["extra"])
        actual = int(actual_all[date])
        entry = {"date": day["date"], "madeOn": previous["dataThrough"], "daysAhead": day["horizon"], "forecast": int(network["forecast"][k]),
                 "rawForecast": int(raw[k]), "actual": actual, "adjActual": max(actual - sum(e["extra"] for e in events), 1)}
        if events:
            entry["events"] = events[:3]
        track.append(entry)
    return sorted(track, key=lambda t: t["date"])[-TRACK_LIMIT:]


def score_long(archive: dict, entries: pd.DataFrame, long_track: list[dict]) -> list[dict]:
    """Network forecasts made 7, 14 and 28 days before a day that has since been published, scored with the range they came with."""
    scored = {(t["date"], t["daysAhead"]) for t in long_track}
    actual_all = entries["ALL"]
    for made_on, row in archive.items():
        for h in LONG_HORIZONS:
            date = pd.Timestamp(made_on) + pd.Timedelta(days=h)
            key = (str(date.date()), h)
            if key in scored or date not in actual_all.index or not np.isfinite(actual_all[date]) or len(row["f"]) < h:
                continue
            long_track.append({"date": key[0], "madeOn": made_on, "daysAhead": h, "forecast": int(row["f"][h - 1]), "low": int(row["lo"][h - 1]),
                               "high": int(row["hi"][h - 1]), "actual": int(actual_all[date])})
    return sorted(long_track, key=lambda t: (t["date"], t["daysAhead"]))[-TRACK_LIMIT * len(LONG_HORIZONS):]


def recent_miss(track: list[dict], data_through: str, config: dict | None) -> dict:
    """How far the model's own one-day-ahead forecasts missed over the last week, in log terms (positive = the real figure was higher).

    Calibrated in model.py on the validation year: it helps the network a little for the first few days ahead and does nothing for
    lines or stations, so it is only ever applied to the network. Returns {"applied": False, "reason": ...} when there is nothing to apply."""
    if not config or not config.get("weights"):
        return {"applied": False, "reason": "no calibration in metrics.json"}
    cutoff = pd.Timestamp(data_through)
    misses = {}
    for t in track:
        date = pd.Timestamp(t["date"])
        raw, actual = t.get("rawForecast", t["forecast"]), t.get("adjActual", t["actual"])  # entries from before the nudge existed were never nudged
        if t["daysAhead"] == 1 and date <= cutoff and raw > 0 and actual > 0:
            misses[date] = math.log(actual) - math.log(raw)
    miss = m.recent_median(misses, cutoff, config["window"], config["minDays"])
    if miss is None:
        return {"applied": False, "reason": f"fewer than {config['minDays']} scored days in the last {config['window']}"}
    miss = float(np.clip(miss, -m.MISS_CAP, m.MISS_CAP))
    return {"applied": True, "medianMiss": round(miss, 4), "daysUsed": sum(1 for d in misses if cutoff - pd.Timedelta(days=config["window"]) < d <= cutoff),
            "window": config["window"], "weights": config["weights"]}


def live_summary(track: list[dict], long_track: list[dict]) -> list[dict]:
    """Error, bias and how often the real figure fell inside the range, by how far ahead the forecast was made, over the latest scored days."""
    groups = {1: [t for t in track if t["daysAhead"] == 1]}
    for h in LONG_HORIZONS:
        groups[h] = [t for t in long_track if t["daysAhead"] == h]
    out = []
    for h, rows in groups.items():
        rows = rows[-LIVE_WINDOW:]
        if not rows:
            continue
        actual = sum(r["actual"] for r in rows)
        forecast = sum(r["forecast"] for r in rows)
        with_range = [r for r in rows if "low" in r]
        out.append({"daysAhead": h, "days": len(rows), "wape": round(sum(abs(r["forecast"] - r["actual"]) for r in rows) / actual, 4),
                    "bias": round(forecast / actual - 1, 4),
                    "inRange": round(sum(r["low"] <= r["actual"] <= r["high"] for r in with_range) / len(with_range), 3) if len(with_range) >= 10 else None})
    return out


def validate(out: dict, previous: dict, max_age_days: int = 14) -> None:
    """Refuse to publish a broken file: the site and the previous release keep working on the last good one."""
    problems = []
    if len(out["days"]) != DAYS_AHEAD:
        problems.append(f"{len(out['days'])} days instead of {DAYS_AHEAD}")
    ids = {s["id"] for s in out["series"]}
    if "ALL" not in ids:
        problems.append("network series missing")
    for s in out["series"]:
        for key in ("forecast", "low", "high", "usual"):
            if len(s[key]) != DAYS_AHEAD or not all(finite(v) for v in s[key]):
                problems.append(f"{s['id']}: bad {key}")
                break
        else:
            if any(v < 0 for v in s["forecast"]) or any(not lo <= f <= hi for lo, f, hi in zip(s["low"], s["forecast"], s["high"])):
                problems.append(f"{s['id']}: forecast outside its range or negative")
        if len(problems) > 5:
            break
    before = len(previous.get("series", []))
    if before and len(out["series"]) < 0.9 * before:
        problems.append(f"only {len(out['series'])} series, yesterday had {before}")
    network = next((s for s in out["series"] if s["id"] == "ALL"), None)
    if network:
        history = [v for v in network["history"] if v]
        if history and not 0.7 < (sum(network["forecast"]) / DAYS_AHEAD) / (sum(history[-28:]) / len(history[-28:])) < 1.4:
            problems.append("network forecast averages more than 30-40% away from the last month's level")
    if (pd.Timestamp.now() - pd.Timestamp(out["dataThrough"])).days > max_age_days:
        problems.append(f"data ends {out['dataThrough']}, more than {max_age_days} days ago")
    if problems:
        raise SystemExit("not writing the forecast: " + "; ".join(problems))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--previous", default=str(HERE / "forecast.json"))
    parser.add_argument("--out", default=str(HERE / "forecast.json"))
    parser.add_argument("--models", default=None)
    parser.add_argument("--max-age-days", type=int, default=14, help="refuse to publish when the data ends longer ago than this (CI checks committed data offline and raises it)")
    args = parser.parse_args()

    metrics = json.loads((m.OUT / "metrics.json").read_text(encoding="utf-8"))
    booster, origin = load_model("model_production.json", args.models)
    range_booster, range_origin = load_model("model_production_range.json", args.models)
    if origin != range_origin:  # never mix a retrained forecast with an older range
        booster, range_booster = load_model("model_production.json", None)[0], load_model("model_production_range.json", None)[0]
        origin = "repository"
    entries, meta = m.load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    last = len(days) - 1
    future = pd.date_range(days[0], days[-1] + pd.Timedelta(days=DAYS_AHEAD), freq="D")
    cal = m.calendar(future)

    # One horizon per future day: day k after the last known day is forecast k days ahead.
    frames = [m.build(values, cal, meta, np.array([last + k]), k, keep_unknown_targets=True) for k in range(1, DAYS_AHEAD + 1)]
    frame = pd.concat(frames, ignore_index=True)
    frame["forecast"] = m.predict(booster, frame)
    frame["low"], frame["high"] = m.predict_range(range_booster, frame, frame["forecast"].to_numpy(), metrics["rangeCorrection"])

    # Track record and the recent-miss nudge. Both are extras: if either fails the plain model forecast is still published.
    previous = read_previous(Path(args.previous))
    track, long_track, archive = previous.get("track", []), previous.get("trackLong", []), previous.get("archive") or {}
    adjustment = {"applied": False, "reason": "not computed"}
    try:
        archive = archive_update(previous)
        track = score_previous(previous, entries, track)
        long_track = score_long(archive, entries, long_track)
        adjustment = recent_miss(track, str(days[-1].date()), metrics.get("recentMiss"))
    except Exception as error:
        print(f"track record skipped: {type(error).__name__}: {error}")
        track, long_track, archive = previous.get("track", []), previous.get("trackLong", []), previous.get("archive") or {}
        adjustment = {"applied": False, "reason": f"error: {type(error).__name__}"}

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
        horizons = range(1, DAYS_AHEAD + 1)
        forecast = rows.loc[horizons, "forecast"].to_numpy()
        low, high = rows.loc[horizons, "low"].to_numpy(), rows.loc[horizons, "high"].to_numpy()
        history = values[last - CONTEXT_DAYS + 1:, i]
        item = {
            "id": name, "label": label(name), "kind": kind,
            "history": [None if not np.isfinite(v) else int(round(v)) for v in history],
            "forecast": [int(round(v)) for v in forecast],
            "low": [int(round(v)) for v in low],
            "high": [int(round(v)) for v in high],
            "usual": [int(round(v)) for v in rows.loc[horizons, "usual"].to_numpy()],
        }
        if name == "ALL" and adjustment["applied"]:
            item["rawForecast"] = item["forecast"]
            factor = np.array([math.exp(m.correction_weight(k, adjustment["weights"]) * adjustment["medianMiss"]) for k in horizons])
            # The range moves with the centre so the correction never leaves the forecast outside its own range.
            item["forecast"], item["low"], item["high"] = (
                [int(round(v)) for v in forecast * factor], [int(round(v)) for v in low * factor], [int(round(v)) for v in high * factor])
        series_out.append(item)

    network = next(s for s in series_out if s["id"] == "ALL")
    archive[str(days[-1].date())] = {"f": network["forecast"], "lo": network["low"], "hi": network["high"]}
    archive = dict(sorted(archive.items())[-ARCHIVE_DAYS:])

    kinds = metrics["byKind"]
    out = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "dataThrough": str(days[-1].date()),
        "historyStart": str(days[last - CONTEXT_DAYS + 1].date()),
        "design": m.DESIGN,
        "modelOrigin": origin,
        "days": day_list,
        "series": series_out,
        "adjustment": adjustment,
        "track": track,
        "trackLong": long_track,
        "live": live_summary(track, long_track),
        "archive": archive,
        "backtest": {
            "period": metrics["data"]["test"],
            "trees": metrics["model"]["trees"],
            "testRows": metrics["data"]["testRows"],
            **{name: {"model": kinds[name]["model"]["wape"], "usual": kinds[name]["usual"]["wape"], "lastWeek": kinds[name]["last_week"]["wape"],
                      "holidayModel": metrics["byDayType"][name]["holidayPeriods"]["model"]["wape"], "holidayUsual": metrics["byDayType"][name]["holidayPeriods"]["usual"]["wape"],
                      **({"lastYear": kinds[name]["last_year"]["wape"]} if "last_year" in kinds[name] else {})}
               for name in ("network", "lines", "stations")},
            "networkByHorizon": [{"days": int(h), "model": b["model"]["wape"], "usual": b["usual"]["wape"]} for h, b in metrics["byHorizon"]["network"].items()],
        },
        "source": "Daily Origin-Destination Ridership: Rapid Rail (KV), data.gov.my (Prasarana / Ministry of Transport), CC BY 4.0",
    }
    validate(out, previous, args.max_age_days)
    Path(args.out).write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"model: {origin} copy, design {m.DESIGN}")
    print(f"data through {out['dataThrough']}; {len(series_out)} series; {Path(args.out).stat().st_size / 1024:.0f} KB; track {len(track)} days, long {len(long_track)}")
    print("recent-miss nudge:", adjustment)
    for row in out["live"]:
        print("live", row)
    for day, f, u in list(zip(day_list, network["forecast"], network["usual"]))[:10]:
        print(f"  {day['date']} {pd.Timestamp(day['date']).day_name()[:3]}  forecast {f:>8,}  usual {u:>8,}  {day['holiday'] or ''}")


if __name__ == "__main__":
    main()
