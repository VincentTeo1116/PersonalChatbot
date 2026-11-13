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

FEATURES = [
    "horizon", "dow", "is_weekend", "month", "day_of_month", "kind", "line", "scale",
    "public_holiday", "days_to_holiday", "days_since_holiday", "bridge_day", "ramadan", "raya_offset", "cny_offset",
    "holidays_in_usual", "last_week_dev", "last_week_holiday", "last_known_dev", "recent_dev", "trend",
    "last_year_dev", "last_year_holiday",
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
    }, index=days)
    return frame


def history_arrays(values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """usual[t] = median of the six same weekdays before day t (t-7 ... t-42); dev[t] = log difference of day t from usual[t]."""
    padded = np.full((42 + len(values), values.shape[1]), np.nan, dtype=np.float32)
    padded[42:] = values
    stack = np.stack([padded[42 - 7 * k: 42 - 7 * k + len(values)] for k in range(1, 7)])
    with np.errstate(all="ignore"):
        usual = np.nanmedian(stack, axis=0)
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
    usual, dev = history_arrays(values)
    n_series = values.shape[1]
    weeks_back = -(-horizon // 7)
    cutoff = targets - horizon
    anchor = targets - 7 * (weeks_back - 1)  # usual[anchor] uses the six same weekdays ending at target - 7*weeks_back, all <= cutoff
    # usual needs rows up to `anchor`, which can lie beyond the known data when forecasting: extend with NaN days first.
    reach = int(max(anchor.max(), targets.max())) + 1
    if reach > len(values):
        pad = np.full((reach - len(values), n_series), np.nan, dtype=np.float32)
        usual, dev = history_arrays(np.vstack([values, pad]))
        values = np.vstack([values, pad])
    base = at(usual, anchor)

    holiday = cal["public_holiday"].to_numpy()
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
        "horizon": np.full(shape, horizon), **{c: per_day(c) for c in ("dow", "is_weekend", "month", "day_of_month", "public_holiday", "days_to_holiday", "days_since_holiday", "bridge_day", "ramadan", "raya_offset", "cny_offset")},
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
    frame["weight"] = frame["kind"].map(KIND_WEIGHT).astype(np.float32)
    usable = frame["usual"] >= MIN_USUAL
    return frame[usable] if keep_unknown_targets else frame[usable & np.isfinite(frame["y"])]


def predict(model: xgb.Booster, frame: pd.DataFrame) -> np.ndarray:
    log_pred = np.log1p(frame["usual"].to_numpy()) + model.predict(xgb.DMatrix(frame[FEATURES], feature_names=FEATURES))
    return np.maximum(np.expm1(log_pred), 0)


def scores(actual: np.ndarray, predicted: np.ndarray) -> dict:
    error = predicted - actual
    return {"mae": round(float(np.mean(np.abs(error))), 1), "wape": round(float(np.sum(np.abs(error)) / np.sum(actual)), 4),
            "rmse": round(float(np.sqrt(np.mean(error**2))), 1), "rows": int(len(actual))}


PARAMS = dict(objective="reg:squarederror", tree_method="hist", max_depth=7, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
              min_child_weight=30, reg_lambda=2.0, seed=SEED, nthread=4)


def fit(frame: pd.DataFrame, rounds: int, valid: pd.DataFrame | None = None) -> xgb.Booster:
    matrix = lambda f: xgb.DMatrix(f[FEATURES], label=f["y"], weight=f["weight"], feature_names=FEATURES)
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
    test = test.copy()
    test["model"] = predict(model, test)
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
        "model": {"type": "XGBoost regression on the log deviation from the usual level", "trees": int(rounds), "features": FEATURES, "horizons": HORIZONS},
        "validation": valid_scores,
        "byKind": {name: block(fair[fair["kind"] == k]) for name, k in kinds.items()},
        "byHorizon": {name: {str(h): block(fair[(fair["kind"] == k) & (fair["horizon"] == h)]) for h in HORIZONS} for name, k in kinds.items()},
        "byDayType": {name: {"holidayPeriods": block(fair[(fair["kind"] == k) & special]), "ordinaryDays": block(fair[(fair["kind"] == k) & ~special])} for name, k in kinds.items()},
    }
    # How wide the error has been: 10th-90th percentile of actual / forecast, by series kind and how far ahead. Used as the forecast range.
    ratio = np.log1p(fair["actual"]) - np.log1p(fair["model"])
    bucket = pd.cut(fair["horizon"], [0, 7, 14, 28], labels=["1-7", "8-14", "15-28"])
    metrics["intervals"] = {name: {str(b): [round(float(np.expm1(q)), 4) for q in ratio[(fair["kind"] == k) & (bucket == b)].quantile([0.1, 0.9])] for b in bucket.cat.categories} for name, k in kinds.items()}
    sample = fair.sample(min(30000, len(fair)), random_state=SEED)
    contributions = np.abs(model.predict(xgb.DMatrix(sample[FEATURES], feature_names=FEATURES), pred_contribs=True)[:, :-1]).mean(axis=0)
    metrics["featureImportance"] = [{"feature": f, "share": round(float(s), 4)} for f, s in sorted(zip(FEATURES, contributions / contributions.sum()), key=lambda x: -x[1])]
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
    print("intervals:", metrics["intervals"]["network"], "| top features:", [(f["feature"], f["share"]) for f in metrics["featureImportance"][:7]])


def production() -> None:
    """Refit on every day available, with the number of trees chosen during evaluation, for forecasting dates that have not happened yet."""
    rounds = json.loads((OUT / "metrics.json").read_text(encoding="utf-8"))["model"]["trees"]
    entries, meta = load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    everything = frames_for(values, calendar(days), meta, np.arange(int((TRAIN_START - days[0]).days), len(days)))
    fit(everything, rounds).save_model(OUT / "model_production.json")
    print(f"production model: {len(everything):,} rows through {days[-1].date()}, {rounds} trees")


if __name__ == "__main__":
    production() if "--production" in sys.argv else evaluate()
