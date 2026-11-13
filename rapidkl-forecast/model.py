"""Step 2: train and evaluate a daily ridership forecaster for the Rapid KL rail network, 1 to 28 days ahead.

One pooled XGBoost model covers every series (the whole network, each line's stations, each station). It predicts how
far a day will sit above or below that series' "usual" level for the weekday, on a log scale, so quiet and busy
stations share one model and holiday effects are learned as percentages.

Usual level = the median of the six most recent same weekdays that are known when the forecast is made.
Every input is known on the forecast day (the "cutoff" = target day minus the horizon): the calendar of the target
day (weekday, month, public holidays, Ramadan, festive windows) and the series' own history up to the cutoff.

Split by target date, never at random:
  train  1 Apr 2023 - 11 May 2025
  valid 12 May 2025 - 11 Nov 2025   (used to choose the number of trees and the design)
  test  12 Nov 2025 - 11 Nov 2026   (a full year, including Chinese New Year and Hari Raya; used once)
Baselines, on the same rows: "last same weekday" and the usual level itself.

Usage : python model.py            (reads entries.parquet; writes results/metrics.json, results/model.json, results/backtest.parquet)
        python model.py --production   (after the evaluation: refit on all data for live forecasting -> results/model_production.json)
"""
import datetime as dt
import json
import sys
import warnings
from pathlib import Path

import holidays
import numpy as np
import pandas as pd
import xgboost as xgb

HERE = Path(__file__).parent
# Averages over windows with no data yet (a station before it opened) are expected and become "no value".
warnings.filterwarnings("ignore", message="All-NaN slice encountered|Mean of empty slice")
OUT = HERE / "results"
SEED = 42
HORIZONS = [1, 2, 3, 5, 7, 10, 14, 21, 28]
MAX_HORIZON = 28
TRAIN_START, VALID_START, TEST_START = pd.Timestamp("2023-04-01"), pd.Timestamp("2025-05-12"), pd.Timestamp("2025-11-12")
MIN_USUAL = 30  # series-days with a usual level below this are too small and noisy to score as percentages
LINE_CODES = ["KJ", "AG", "SP", "KG", "PYL", "MR", "SA"]
KIND_WEIGHT = {0: 20.0, 1: 5.0, 2: 1.0}  # network, line, station: there are 166 stations but one network, so balance them

BASE_FEATURES = [
    "horizon", "dow", "is_weekend", "month", "day_of_month", "kind", "line", "scale",
    "public_holiday", "days_to_holiday", "days_since_holiday", "bridge_day", "ramadan", "raya_offset", "cny_offset",
    "holidays_in_usual", "last_week_dev", "last_week_holiday", "last_known_dev", "recent_dev", "trend",
    "last_year_dev", "last_year_holiday",
]
HOLIDAY_FEATURES = ["school_holiday", "holiday_type", "off_run", "last_year_school_holiday"]

# Design switches. Each one was tried on the validation period (see experiments.py); the values here are the ones that were kept.
CONFIG = {
    "clean_usual": True,     # leave public holidays and disrupted days out of the "usual level"
    "rich_holidays": False,  # school holidays, the kind of holiday, and how long the break is (did not help consistently)
    "holiday_weight": 1.0,   # extra training weight for days in holiday periods
    "rain": False,           # same-day rainfall (tested as an upper bound; see experiments.py)
}


def features() -> list[str]:
    return BASE_FEATURES + (HOLIDAY_FEATURES if CONFIG["rich_holidays"] else []) + (["rain_mm"] if CONFIG["rain"] else [])


# Malaysian government school holidays for "Kumpulan B" states (Kuala Lumpur and Selangor), first and last day off.
# Assembled from published KPM calendars as reported by secondary sources; a few edges may be a day or two out.
# 2027 is not published yet: add it here when it is, or forecasts for January 2027 onward will treat those days as term time.
SCHOOL_HOLIDAYS = [
    ("2022-12-10", "2023-01-02"), ("2023-02-18", "2023-03-19"), ("2023-04-22", "2023-04-30"), ("2023-05-27", "2023-06-04"),
    ("2023-08-26", "2023-09-03"), ("2023-12-16", "2024-01-01"), ("2024-02-10", "2024-03-10"), ("2024-05-25", "2024-06-02"),
    ("2024-09-14", "2024-09-22"), ("2024-12-21", "2024-12-29"), ("2025-01-18", "2025-02-16"), ("2025-05-29", "2025-06-09"),
    ("2025-09-13", "2025-09-21"), ("2025-12-20", "2026-01-11"), ("2026-03-21", "2026-03-29"), ("2026-05-23", "2026-06-07"),
    ("2026-08-29", "2026-09-06"), ("2026-12-05", "2026-12-31"),
]
HOLIDAY_TYPES = [  # checked in order against the holiday's Malay name
    ("Raya Puasa", 1), ("Tahun Baharu Cina", 2), ("Deepavali", 3), ("Krismas", 4), ("Tahun Baharu", 4), ("Raya Qurban", 5),
    ("Kebangsaan", 6), ("Hari Malaysia", 6), ("Pekerja", 6), ("Agong", 6),
]


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (entries indexed by date, series metadata)."""
    entries = pd.read_parquet(HERE / "entries.parquet")
    meta = pd.DataFrame({"series": entries.columns})
    meta["kind"] = np.where(meta["series"] == "ALL", 0, np.where(meta["series"].str.startswith("LINE:"), 1, 2))
    code = meta["series"].str.replace("LINE:", "", regex=False).str.extract(r"^([A-Z]+)")[0]
    meta["line"] = [LINE_CODES.index(c) if c in LINE_CODES else -1 for c in code]
    return entries, meta


def calendar(days: pd.DatetimeIndex) -> pd.DataFrame:
    """Calendar facts for each day. Kuala Lumpur public holidays; Islamic dates in future years are the library's estimates."""
    my = holidays.MY(subdiv="KUL", years=range(days[0].year - 1, days[-1].year + 2))
    holiday_dates = np.array(sorted(pd.Timestamp(d) for d in my), dtype="datetime64[D]")
    named = lambda text: np.array(sorted(pd.Timestamp(d) for d, n in my.items() if n == text), dtype="datetime64[D]")
    day = days.to_numpy(dtype="datetime64[D]")

    def nearest_offset(anchors: np.ndarray) -> np.ndarray:  # signed days from the nearest anchor date
        position = np.clip(np.searchsorted(anchors, day), 1, len(anchors) - 1)
        before, after = (day - anchors[position - 1]).astype(int), (day - anchors[position]).astype(int)
        return np.where(np.abs(before) <= np.abs(after), before, after)

    is_holiday = np.isin(day, holiday_dates)
    position = np.searchsorted(holiday_dates, day)
    to_next = (holiday_dates[np.clip(position, 0, len(holiday_dates) - 1)] - day).astype(int)
    since_prev = (day - holiday_dates[np.clip(np.searchsorted(holiday_dates, day, side="right") - 1, 0, None)]).astype(int)
    dow = days.dayofweek.to_numpy()
    raya = nearest_offset(named("Hari Raya Puasa"))
    kind_of = lambda name: next((code for text, code in HOLIDAY_TYPES if text in name), 7)
    holiday_type = np.array([kind_of(my.get(pd.Timestamp(d).date())) if h else 0 for d, h in zip(day, is_holiday)])
    # Length of the unbroken run of days off (weekends and public holidays) that a day belongs to; 0 on a working day.
    off = is_holiday | (dow >= 5)
    run_id = np.cumsum(np.r_[True, off[1:] != off[:-1]])
    off_run = np.where(off, pd.Series(off).groupby(run_id).transform("size").to_numpy(), 0)
    school = np.any([(days >= pd.Timestamp(a)) & (days <= pd.Timestamp(b)) for a, b in SCHOOL_HOLIDAYS], axis=0)
    rain_file = HERE / "rain.parquet"
    rain = pd.read_parquet(rain_file)["rain_mm"].reindex(days).to_numpy() if CONFIG["rain"] and rain_file.exists() else np.full(len(days), np.nan)
    frame = pd.DataFrame({
        "dow": dow,
        "is_weekend": (dow >= 5).astype(np.float32),
        "month": days.month.to_numpy(),
        "day_of_month": days.day.to_numpy(),
        "public_holiday": is_holiday.astype(np.float32),
        "days_to_holiday": np.clip(to_next, 0, 10),
        "days_since_holiday": np.clip(since_prev, 0, 10),
        # A working day squeezed between a holiday and a weekend, when many people take leave.
        "bridge_day": ((~is_holiday) & (((dow == 0) & np.isin(day + 1, holiday_dates)) | ((dow == 4) & np.isin(day - 1, holiday_dates)))).astype(np.float32),
        "ramadan": ((raya >= -30) & (raya < 0)).astype(np.float32),
        "raya_offset": np.clip(raya, -15, 15),
        "cny_offset": np.clip(nearest_offset(named("Tahun Baharu Cina")), -15, 15),
        "school_holiday": school.astype(np.float32),
        "holiday_type": holiday_type,
        "off_run": np.clip(off_run, 0, 9),
        "rain_mm": rain,
    }, index=days)
    return frame


def same_weekday_median(values: np.ndarray, weeks: int) -> np.ndarray:
    pad = 7 * weeks
    padded = np.full((pad + len(values), values.shape[1]), np.nan, dtype=np.float32)
    padded[pad:] = values
    stack = np.stack([padded[pad - 7 * k: pad - 7 * k + len(values)] for k in range(1, weeks + 1)])
    with np.errstate(all="ignore"):
        return np.nanmedian(stack, axis=0)


def history_arrays(values: np.ndarray, holiday: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    """usual[t] = median of recent same weekdays before day t; dev[t] = log difference of day t from usual[t].

    Plain version: the six previous same weekdays. Clean version (CONFIG["clean_usual"]): public holidays and disrupted
    days (under half the plain usual level, such as a station closure) are left out, looking back up to eight weeks, so
    one odd day does not drag the "usual" level down for the following six weeks."""
    usual = same_weekday_median(values, 6)
    if CONFIG["clean_usual"] and holiday is not None:
        skip = (holiday[: len(values)] > 0)[:, None] | (values < 0.5 * usual)
        cleaned = same_weekday_median(np.where(skip, np.nan, values), 8)
        usual = np.where(np.isfinite(cleaned), cleaned, usual)
    dev = np.log1p(values) - np.log1p(usual)
    return usual.astype(np.float32), dev.astype(np.float32)


def at(array: np.ndarray, index: np.ndarray) -> np.ndarray:
    """array[index] with out-of-range rows returned as NaN instead of wrapping round."""
    ok = (index >= 0) & (index < len(array))
    out = np.full((len(index), *array.shape[1:]), np.nan, dtype=np.float32)
    out[ok] = array[index[ok]]
    return out


def build(values: np.ndarray, cal: pd.DataFrame, meta: pd.DataFrame, targets: np.ndarray, horizon: int, keep_unknown_targets: bool = False) -> pd.DataFrame:
    """One row per (target day, series) for one horizon. `values` is [day, series] and may be shorter than `cal` when forecasting the future."""
    holiday = cal["public_holiday"].to_numpy()
    usual, dev = history_arrays(values, holiday)
    n_series = values.shape[1]
    weeks_back = -(-horizon // 7)
    cutoff = targets - horizon
    anchor = targets - 7 * (weeks_back - 1)  # usual[anchor] uses the six same weekdays ending at target - 7*weeks_back, all <= cutoff
    # usual needs rows up to `anchor`, which can lie beyond the known data when forecasting: extend with NaN days first.
    reach = int(max(anchor.max(), targets.max())) + 1
    if reach > len(values):
        pad = np.full((reach - len(values), n_series), np.nan, dtype=np.float32)
        values = np.vstack([values, pad])
        usual, dev = history_arrays(values, np.r_[holiday, np.zeros(max(0, reach - len(holiday)))])
    base = at(usual, anchor)

    same_weekdays = np.stack([at(holiday, targets - 7 * (weeks_back + k)) for k in range(6)])
    mean_dev = lambda lo, hi: np.stack([np.nanmean(dev[max(0, c + lo): c + hi + 1], axis=0) if c + hi >= 0 else np.full(n_series, np.nan) for c in cutoff])
    level = lambda lo, hi: np.stack([np.nanmean(values[max(0, c + lo): c + hi + 1], axis=0) if c + hi >= 0 else np.full(n_series, np.nan) for c in cutoff])
    with np.errstate(all="ignore"):
        recent_dev = mean_dev(-6, 0)
        trend = np.log1p(level(-27, 0)) - np.log1p(level(-55, -28))
        last_year = np.nanmean(np.stack([at(dev, targets - 364 + s) for s in (-7, 0, 7)]), axis=0)

    shape = (len(targets), n_series)
    per_day = lambda column: np.broadcast_to(cal[column].to_numpy()[targets][:, None], shape)
    per_series = lambda a: np.broadcast_to(np.asarray(a)[None, :], shape)
    columns = {
        "horizon": np.full(shape, horizon), **{c: per_day(c) for c in ("dow", "is_weekend", "month", "day_of_month", "public_holiday", "days_to_holiday", "days_since_holiday", "bridge_day", "ramadan", "raya_offset", "cny_offset", "school_holiday", "holiday_type", "off_run", "rain_mm")},
        "last_year_school_holiday": np.broadcast_to(at(cal["school_holiday"].to_numpy(), targets - 364)[:, None], shape),
        "kind": per_series(meta["kind"]), "line": per_series(meta["line"]), "scale": np.log1p(base),
        "holidays_in_usual": np.broadcast_to(np.nansum(same_weekdays, axis=0)[:, None], shape),
        "last_week_dev": np.log1p(at(values, targets - 7 * weeks_back)) - np.log1p(base),
        "last_week_holiday": np.broadcast_to(at(holiday, targets - 7 * weeks_back)[:, None], shape),
        "last_known_dev": at(dev, cutoff), "recent_dev": recent_dev, "trend": trend,
        "last_year_dev": last_year, "last_year_holiday": np.broadcast_to(at(holiday, targets - 364)[:, None], shape),
    }
    frame = pd.DataFrame({name: np.asarray(v, dtype=np.float32).ravel() for name, v in columns.items()})
    frame["day_idx"] = np.broadcast_to(targets[:, None], shape).ravel()
    frame["series_idx"] = np.broadcast_to(np.arange(n_series)[None, :], shape).ravel()
    frame["usual"] = base.ravel()
    frame["last_week"] = at(values, targets - 7 * weeks_back).ravel()
    frame["actual"] = at(values, targets).ravel()
    frame["y"] = np.log1p(frame["actual"]) - np.log1p(frame["usual"])
    special = (frame["public_holiday"] > 0) | (frame["bridge_day"] > 0) | (frame["raya_offset"].abs() <= 7) | (frame["cny_offset"].abs() <= 5)
    frame["weight"] = (frame["kind"].map(KIND_WEIGHT) * np.where(special, CONFIG["holiday_weight"], 1.0)).astype(np.float32)
    usable = frame["usual"] >= MIN_USUAL
    return frame[usable] if keep_unknown_targets else frame[usable & np.isfinite(frame["y"])]


def predict(model: xgb.Booster, frame: pd.DataFrame) -> np.ndarray:
    log_pred = np.log1p(frame["usual"].to_numpy()) + model.predict(xgb.DMatrix(frame[features()], feature_names=features()))
    return np.maximum(np.expm1(log_pred), 0)


KIND_NAMES = {0: "network", 1: "lines", 2: "stations"}


def special_days(frame: pd.DataFrame) -> pd.Series:
    """Public holidays, bridge days and the weeks around Hari Raya and Chinese New Year."""
    return (frame["public_holiday"] > 0) | (frame["bridge_day"] > 0) | (frame["raya_offset"].abs() <= 7) | (frame["cny_offset"].abs() <= 5)


def range_offsets(model: xgb.Booster, frame: pd.DataFrame) -> np.ndarray:
    return model.predict(xgb.DMatrix(frame[features()], feature_names=features()))


def calibrate_range(model: xgb.Booster, held_out: pd.DataFrame) -> dict:
    """Conformal correction: how much each end of the raw range must move so that 80% of held-out outcomes fall inside it,
    separately for the network, lines and stations and for holiday periods and ordinary days. The raw quantile model is
    too narrow, because it has seen the training days and is overconfident about new ones."""
    offsets = range_offsets(model, held_out)
    y = held_out["y"].to_numpy()
    miss = np.maximum(offsets[:, 0] - y, y - offsets[:, 1])  # how far outside the raw range the outcome fell (negative = inside)
    special = special_days(held_out).to_numpy()
    out = {}
    for k, name in KIND_NAMES.items():
        rows = (held_out["kind"] == k).to_numpy()
        out[name] = {"holidayPeriods": round(float(np.quantile(miss[rows & special], 0.8)), 5), "ordinaryDays": round(float(np.quantile(miss[rows & ~special], 0.8)), 5)}
    return out


def predict_range(model: xgb.Booster, frame: pd.DataFrame, centre: np.ndarray, correction: dict | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Low and high ends of the likely range, never crossing the central forecast."""
    offsets = range_offsets(model, frame)
    widen = np.zeros(len(frame))
    if correction:
        special = special_days(frame).to_numpy()
        for k, name in KIND_NAMES.items():
            rows = (frame["kind"] == k).to_numpy()
            widen[rows & special], widen[rows & ~special] = correction[name]["holidayPeriods"], correction[name]["ordinaryDays"]
    base = np.log1p(frame["usual"].to_numpy())
    low = np.maximum(np.expm1(base + offsets[:, 0] - widen), 0)
    high = np.maximum(np.expm1(base + offsets[:, 1] + widen), 0)
    return np.minimum(low, centre), np.maximum(high, centre)


def scores(actual: np.ndarray, predicted: np.ndarray) -> dict:
    error = predicted - actual
    return {"mae": round(float(np.mean(np.abs(error))), 1), "wape": round(float(np.sum(np.abs(error)) / np.sum(actual)), 4),
            "rmse": round(float(np.sqrt(np.mean(error**2))), 1), "rows": int(len(actual))}


QUANTILES = [0.1, 0.9]  # the "likely range": 8 in 10 outcomes should fall between these


PARAMS = dict(objective="reg:squarederror", tree_method="hist", max_depth=7, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
              min_child_weight=30, reg_lambda=2.0, seed=SEED, nthread=4)


def fit(frame: pd.DataFrame, rounds: int, valid: pd.DataFrame | None = None, quantiles: bool = False) -> xgb.Booster:
    if quantiles:  # one model that predicts both ends of the range, so the range can widen where outcomes are less certain
        matrix = xgb.QuantileDMatrix(frame[features()], label=frame["y"], weight=frame["weight"], feature_names=features())
        return xgb.train({**PARAMS, "objective": "reg:quantileerror", "quantile_alpha": QUANTILES}, matrix, num_boost_round=rounds)
    matrix = lambda f: xgb.DMatrix(f[features()], label=f["y"], weight=f["weight"], feature_names=features())
    if valid is None:
        return xgb.train(PARAMS, matrix(frame), num_boost_round=rounds)
    return xgb.train(PARAMS, matrix(frame), num_boost_round=rounds, evals=[(matrix(valid), "valid")], early_stopping_rounds=60, verbose_eval=200)


def frames_for(values, cal, meta, days: np.ndarray) -> pd.DataFrame:
    return pd.concat([build(values, cal, meta, days, h) for h in HORIZONS], ignore_index=True)


def evaluate() -> None:
    OUT.mkdir(exist_ok=True)
    entries, meta = load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    cal = calendar(days)
    idx = lambda ts: int((ts - days[0]).days)
    train = frames_for(values, cal, meta, np.arange(idx(TRAIN_START), idx(VALID_START)))
    valid = frames_for(values, cal, meta, np.arange(idx(VALID_START), idx(TEST_START)))
    test = frames_for(values, cal, meta, np.arange(idx(TEST_START), len(days)))
    print({"train": len(train), "valid": len(valid), "test": len(test)})

    probe = fit(train, 3000, valid)
    rounds = probe.best_iteration + 1
    valid_scores = {"model": scores(valid["actual"].to_numpy(), predict(probe, valid)), "usual": scores(valid["actual"].to_numpy(), valid["usual"].to_numpy())}
    print("validation:", valid_scores, "trees:", rounds)

    model = fit(pd.concat([train, valid], ignore_index=True), rounds)
    model.save_model(OUT / "model.json")
    # The range model is calibrated on the validation period, which a model fitted on the training period alone has not seen.
    correction = calibrate_range(fit(train, rounds, quantiles=True), valid)
    range_model = fit(pd.concat([train, valid], ignore_index=True), rounds, quantiles=True)
    test = test.copy()
    test["model"] = predict(model, test)
    test["low"], test["high"] = predict_range(range_model, test, test["model"].to_numpy(), correction)
    fair = test[np.isfinite(test["last_week"])]

    def block(frame: pd.DataFrame) -> dict:
        actual = frame["actual"].to_numpy()
        out = {name: scores(actual, frame[name].to_numpy()) for name in ("model", "usual", "last_week")}
        out["improvementOverUsual"] = round(1 - out["model"]["mae"] / out["usual"]["mae"], 4)
        out["improvementOverLastWeek"] = round(1 - out["model"]["mae"] / out["last_week"]["mae"], 4)
        return out

    kinds = {"network": 0, "lines": 1, "stations": 2}
    special = (fair["public_holiday"] > 0) | (fair["bridge_day"] > 0) | (fair["raya_offset"].abs() <= 7) | (fair["cny_offset"].abs() <= 5)
    metrics = {
        "trainedOn": dt.date.today().isoformat(),
        "data": {"source": "Daily Origin-Destination Ridership: Rapid Rail (KV), data.gov.my, CC BY 4.0", "series": int(len(meta)),
                 "stations": int((meta["kind"] == 2).sum()), "period": [str(days[0].date()), str(days[-1].date())],
                 "train": [str(TRAIN_START.date()), str((TEST_START - pd.Timedelta(days=1)).date())], "test": [str(TEST_START.date()), str(days[-1].date())],
                 "trainRows": int(len(train) + len(valid)), "testRows": int(len(fair))},
        "model": {"type": "XGBoost regression on the log deviation from the usual level", "trees": int(rounds), "features": features(), "config": CONFIG, "horizons": HORIZONS},
        "validation": valid_scores,
        "byKind": {name: block(fair[fair["kind"] == k]) for name, k in kinds.items()},
        "byHorizon": {name: {str(h): block(fair[(fair["kind"] == k) & (fair["horizon"] == h)]) for h in HORIZONS} for name, k in kinds.items()},
        "byDayType": {name: {"holidayPeriods": block(fair[(fair["kind"] == k) & special]), "ordinaryDays": block(fair[(fair["kind"] == k) & ~special])} for name, k in kinds.items()},
    }
    # How wide the error has been: 10th-90th percentile of actual / forecast, by series kind and how far ahead. Used as the forecast range.
    ratio = np.log1p(fair["actual"]) - np.log1p(fair["model"])
    bucket = pd.cut(fair["horizon"], [0, 7, 14, 28], labels=["1-7", "8-14", "15-28"])
    metrics["intervals"] = {name: {str(b): [round(float(np.expm1(q)), 4) for q in ratio[(fair["kind"] == k) & (bucket == b)].quantile([0.1, 0.9])] for b in bucket.cat.categories} for name, k in kinds.items()}
    # Is the range honest? About 80% of real outcomes should fall inside it. The fixed-width range is the old method, for comparison.
    fixed = pd.DataFrame(index=fair.index, columns=["lo", "hi"], dtype=float)
    for name, k in kinds.items():
        for b in bucket.cat.categories:
            rows = (fair["kind"] == k) & (bucket == b)
            fixed.loc[rows, "lo"], fixed.loc[rows, "hi"] = fair.loc[rows, "model"] * (1 + metrics["intervals"][name][str(b)][0]), fair.loc[rows, "model"] * (1 + metrics["intervals"][name][str(b)][1])
    inside = lambda lo, hi, rows: round(float(((fair["actual"] >= lo) & (fair["actual"] <= hi))[rows].mean()), 4)
    width = lambda lo, hi, rows: round(float(((hi - lo) / fair["model"].clip(lower=1))[rows].median()), 4)
    metrics["rangeCorrection"] = correction
    metrics["rangeCoverage"] = {
        name: {day: {"quantile": inside(fair["low"], fair["high"], rows), "fixed": inside(fixed["lo"], fixed["hi"], rows),
                     "quantileWidth": width(fair["low"], fair["high"], rows), "fixedWidth": width(fixed["lo"], fixed["hi"], rows)}
               for day, rows in (("all", fair["kind"] == k), ("holidayPeriods", (fair["kind"] == k) & special), ("ordinaryDays", (fair["kind"] == k) & ~special))}
        for name, k in kinds.items()}
    sample = fair.sample(min(30000, len(fair)), random_state=SEED)
    contributions = np.abs(model.predict(xgb.DMatrix(sample[features()], feature_names=features()), pred_contribs=True)[:, :-1]).mean(axis=0)
    metrics["featureImportance"] = [{"feature": f, "share": round(float(s), 4)} for f, s in sorted(zip(features(), contributions / contributions.sum()), key=lambda x: -x[1])]
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    test[["day_idx", "series_idx", "horizon", "actual", "model", "usual", "last_week"]].to_parquet(OUT / "backtest.parquet", index=False)

    for name in kinds:
        b = metrics["byKind"][name]
        print(f"{name:9} model WAPE {b['model']['wape']:.3f}  usual {b['usual']['wape']:.3f}  last-week {b['last_week']['wape']:.3f}  gain vs usual {b['improvementOverUsual']:.1%}  vs last-week {b['improvementOverLastWeek']:.1%}")
    for h in HORIZONS:
        b = metrics["byHorizon"]["network"][str(h)]
        print(f"network h={h:>2}  model {b['model']['wape']:.3f}  usual {b['usual']['wape']:.3f}  last-week {b['last_week']['wape']:.3f}")
    for name in kinds:
        d = metrics["byDayType"][name]
        print(f"{name:9} holiday periods: model {d['holidayPeriods']['model']['wape']:.3f} usual {d['holidayPeriods']['usual']['wape']:.3f} | ordinary: model {d['ordinaryDays']['model']['wape']:.3f} usual {d['ordinaryDays']['usual']['wape']:.3f}")
    for name in kinds:
        print(f"{name:9} range coverage:", metrics["rangeCoverage"][name])
    print("intervals:", metrics["intervals"]["network"], "| top features:", [(f["feature"], f["share"]) for f in metrics["featureImportance"][:7]])


def production() -> None:
    """Refit on every day available, with the number of trees chosen during evaluation, for forecasting dates that have not happened yet."""
    rounds = json.loads((OUT / "metrics.json").read_text(encoding="utf-8"))["model"]["trees"]
    entries, meta = load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    everything = frames_for(values, calendar(days), meta, np.arange(int((TRAIN_START - days[0]).days), len(days)))
    fit(everything, rounds).save_model(OUT / "model_production.json")
    fit(everything, rounds, quantiles=True).save_model(OUT / "model_production_range.json")
    print(f"production model: {len(everything):,} rows through {days[-1].date()}, {rounds} trees")


if __name__ == "__main__":
    production() if "--production" in sys.argv else evaluate()
