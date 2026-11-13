"""Step 2: train and evaluate an hourly traffic-volume forecaster for 1 to 14 days ahead.

Every feature is something known on the day the forecast is made (the "cutoff" = target day minus the horizon):
calendar facts about the target day, and that site's own history up to the cutoff. Nothing from the target day
or after it is used, and the test month comes strictly after the training period.

The model predicts how far each hour will deviate from that site's typical day, not the volume itself. A first version
predicted the volume directly and lost to the "typical day" baseline on the test month (results/metrics_v1_direct.json);
the typical day is already a strong forecast, so the model's job is to correct it using recent drift and the calendar.

Train : targets from 22 Aug to 30 Sep 2026. The design and number of trees were chosen on 10-30 Sep (trained on 22 Aug-9 Sep).
Test  : every day in October 2026, used once for the final numbers
Compared with two baselines that need no model:
  - "last week": the same hour on the same weekday in the latest week available at the cutoff
  - "typical day": that site's average for the same hour and day type (weekday / Saturday / Sunday) up to the cutoff

Usage : python train.py            (reads site_days.parquet, writes results/metrics.json, results/model.json, results/demo.json)
"""
import datetime as dt
import json
from pathlib import Path

import holidays
import numpy as np
import pandas as pd
import xgboost as xgb

HERE = Path(__file__).parent
OUT = HERE / "results"
SEED = 42
MAX_SITES = 300
MIN_CLEAN_DAYS = 85
HORIZONS = [1, 2, 3, 5, 7, 10, 14]
TEST_START = pd.Timestamp("2026-10-01")
VALID_START = pd.Timestamp("2026-09-10")  # three weeks covering both school term and school holidays
FIRST_TARGET = pd.Timestamp("2026-08-22")  # leaves 21 days of history for the longest lag
# Victorian government school holidays (first and last day off). 2026 term 3 ended 18 Sep and term 4 started 5 Oct.
# The later ranges are only used when forecasting future dates: check them against the published term dates each year.
SCHOOL_HOLIDAYS = [
    ("2026-09-19", "2026-10-04"),
    ("2026-12-19", "2027-01-27"),
    ("2027-03-26", "2027-04-11"),
    ("2027-06-26", "2027-07-11"),
    ("2027-09-18", "2027-10-03"),
]

FEATURES = [
    "horizon", "hour", "hour_sin", "hour_cos", "dow", "is_weekend", "public_holiday", "school_holiday",
    "lag_week_1", "lag_week_2", "lag_week_1_day_total", "lag_week_1_public_holiday", "lag_week_1_school_holiday",
    "typical", "last_known_day", "last_known_dow", "recent_level", "site_scale",
    "lag_week_1_dev", "lag_week_2_dev", "last_known_dev", "recent_dev", "history_days",
]


def load() -> tuple[np.ndarray, np.ndarray, pd.DatetimeIndex]:
    """Returns (site ids, volumes[site, day, hour], days). Site-days with a faulty detector or no traffic are NaN."""
    data = pd.read_parquet(HERE / "site_days.parquet")
    v = [f"V{i:02d}" for i in range(96)]
    data["clean"] = (data["bad_detectors"] == 0) & (data[v].sum(axis=1) > 0)
    clean_days = data[data["clean"]].groupby("site").size()
    eligible = clean_days[clean_days >= MIN_CLEAN_DAYS].index.to_numpy()
    rng = np.random.default_rng(SEED)
    sites = np.sort(rng.choice(eligible, size=min(MAX_SITES, len(eligible)), replace=False))

    days = pd.date_range(data["date"].min(), data["date"].max(), freq="D")
    volumes = np.full((len(sites), len(days), 24), np.nan, dtype=np.float32)
    subset = data[data["site"].isin(sites) & data["clean"]]
    site_index = {s: i for i, s in enumerate(sites)}
    day_index = {d: i for i, d in enumerate(days)}
    hourly = subset[v].to_numpy(dtype=np.float32).reshape(len(subset), 24, 4).sum(axis=2)
    for row, (site, date) in enumerate(zip(subset["site"].to_numpy(), subset["date"])):
        volumes[site_index[site], day_index[date]] = hourly[row]
    print(f"{len(eligible)} eligible sites, using {len(sites)}; {len(days)} days; {np.isnan(volumes[:, :, 0]).mean():.1%} of site-days missing")
    return sites, volumes, days


def calendar(days: pd.DatetimeIndex) -> dict[str, np.ndarray]:
    vic = holidays.AU(subdiv="VIC", years=sorted(set(days.year)))
    dow = days.dayofweek.to_numpy()
    return {
        "dow": dow,
        "day_type": np.where(dow < 5, 0, dow - 4),  # 0 weekday, 1 Saturday, 2 Sunday
        "public_holiday": np.array([d.date() in vic for d in days], dtype=np.float32),
        "school_holiday": np.any([(days >= pd.Timestamp(a)) & (days <= pd.Timestamp(b)) for a, b in SCHOOL_HOLIDAYS], axis=0).astype(np.float32),
    }


def expanding_typical(volumes: np.ndarray, day_type: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """typical[site, day, hour] = mean of that site's days up to and including `day` that share its day type... indexed by
    (cutoff day, wanted day type) via the returned array of shape [3, site, day, hour]."""
    out = np.full((3, *volumes.shape), np.nan, dtype=np.float32)
    seen = np.zeros((3, *volumes.shape[:2]), dtype=np.float32)
    for t in range(3):
        mask = (day_type == t)[None, :, None] & ~np.isnan(volumes)
        total = np.cumsum(np.where(mask, volumes, 0), axis=1)
        count = np.cumsum(mask, axis=1)
        out[t] = np.where(count > 0, total / np.maximum(count, 1), np.nan)
        seen[t] = count[:, :, 0]
    return out, seen


def build(volumes: np.ndarray, days: pd.DatetimeIndex, cal: dict, target_days: np.ndarray, horizon: int, keep_unknown_targets: bool = False) -> pd.DataFrame:
    """One row per (site, target day, hour) for one horizon. Volumes are divided by the site's scale so busy and quiet sites are comparable."""
    n_sites = volumes.shape[0]
    weeks_back = -(-horizon // 7)  # the latest same-weekday that is on or before the cutoff
    cutoff = target_days - horizon
    lag1, lag2 = target_days - 7 * weeks_back, target_days - 7 * (weeks_back + 1)
    assert lag2.min() >= 0, "not enough history before the first target day (a negative index would wrap round to future days)"

    daily = np.nansum(volumes, axis=2)
    daily[np.isnan(volumes[:, :, 0])] = np.nan
    seen = ~np.isnan(daily)
    # Site scale = mean hourly volume over everything known at the cutoff (expanding, so it never looks ahead).
    scale_all = np.cumsum(np.where(seen, daily, 0), axis=1) / np.maximum(np.cumsum(seen, axis=1), 1) / 24
    scale = scale_all[:, cutoff]  # [site, target]
    recent = np.stack([np.nanmean(daily[:, max(0, c - 6): c + 1], axis=1) for c in cutoff], axis=1) / 24

    site_col = np.arange(n_sites)[:, None]
    target_type = cal["day_type"][target_days]
    typical = TYPICAL[target_type[None, :], site_col, cutoff[None, :]]  # [site, target, hour]
    history = HISTORY[target_type[None, :], site_col, cutoff[None, :]]  # how many days the typical value is based on
    # How the last known day, and the last week, differed from what was typical for their own day type (all known at the cutoff).
    own_type = cal["day_type"]
    typical_own = TYPICAL[own_type[None, :], site_col, np.arange(volumes.shape[1])[None, :]]  # [site, day, hour]
    deviation = volumes - typical_own
    recent_dev = np.stack([np.nanmean(deviation[:, max(0, c - 6): c + 1], axis=1) for c in cutoff], axis=1)  # [site, target, hour]

    def norm(x):  # [site, target, hour] / scale
        return x / scale[:, :, None]

    shape = (n_sites, len(target_days), 24)
    hours = np.arange(24)
    per_day = lambda a: np.broadcast_to(np.asarray(a, dtype=np.float32)[None, :, None], shape)
    columns = {
        "horizon": np.full(shape, horizon, dtype=np.float32),
        "hour": np.broadcast_to(hours[None, None, :], shape),
        "hour_sin": np.broadcast_to(np.sin(2 * np.pi * hours / 24)[None, None, :], shape),
        "hour_cos": np.broadcast_to(np.cos(2 * np.pi * hours / 24)[None, None, :], shape),
        "dow": per_day(cal["dow"][target_days]),
        "is_weekend": per_day(cal["dow"][target_days] >= 5),
        "public_holiday": per_day(cal["public_holiday"][target_days]),
        "school_holiday": per_day(cal["school_holiday"][target_days]),
        "lag_week_1": norm(volumes[:, lag1]),
        "lag_week_2": norm(volumes[:, lag2]),
        "lag_week_1_day_total": np.broadcast_to((daily[:, lag1] / 24 / scale)[:, :, None], shape),
        "lag_week_1_public_holiday": per_day(cal["public_holiday"][lag1]),
        "lag_week_1_school_holiday": per_day(cal["school_holiday"][lag1]),
        "typical": norm(typical),
        "last_known_day": norm(volumes[:, cutoff]),
        "last_known_dow": per_day(cal["dow"][cutoff]),
        "recent_level": np.broadcast_to((recent / scale)[:, :, None], shape),
        "site_scale": np.broadcast_to(np.log1p(scale)[:, :, None], shape),
        "lag_week_1_dev": norm(volumes[:, lag1] - typical),
        "lag_week_2_dev": norm(volumes[:, lag2] - typical),
        "last_known_dev": norm(deviation[:, cutoff]),
        "recent_dev": norm(recent_dev),
        "history_days": np.broadcast_to(history[:, :, None], shape),
    }
    frame = pd.DataFrame({name: np.asarray(values, dtype=np.float32).ravel() for name, values in columns.items()})
    frame["site_idx"] = np.broadcast_to(np.arange(n_sites)[:, None, None], shape).ravel()
    frame["day_idx"] = np.broadcast_to(target_days[None, :, None], shape).ravel()
    frame["scale"] = np.broadcast_to(scale[:, :, None], shape).ravel()
    frame["actual"] = volumes[:, target_days].ravel()
    # Target: deviation from the typical day, in units of the site's scale. Rows with no typical value yet are dropped.
    frame["y"] = frame["actual"] / frame["scale"] - frame["typical"]
    if keep_unknown_targets:  # forecasting days that have not happened yet: there is no actual value to require
        return frame[np.isfinite(frame["typical"]) & (frame["scale"] > 0)]
    return frame[np.isfinite(frame["y"]) & (frame["scale"] > 0)]


def scores(actual: np.ndarray, predicted: np.ndarray) -> dict:
    error = predicted - actual
    return {
        "mae": round(float(np.mean(np.abs(error))), 2),
        "rmse": round(float(np.sqrt(np.mean(error**2))), 2),
        "wape": round(float(np.sum(np.abs(error)) / np.sum(actual)), 4),
        "r2": round(float(1 - np.sum(error**2) / np.sum((actual - actual.mean()) ** 2)), 4),
    }


def main() -> None:
    global TYPICAL, HISTORY
    OUT.mkdir(exist_ok=True)
    sites, volumes, days = load()
    cal = calendar(days)
    TYPICAL, HISTORY = expanding_typical(volumes, cal["day_type"])
    index_of = lambda ts: int((ts - days[0]).days)
    train_days = np.arange(index_of(FIRST_TARGET), index_of(VALID_START))
    valid_days = np.arange(index_of(VALID_START), index_of(TEST_START))
    test_days = np.arange(index_of(TEST_START), len(days))

    frames = {name: pd.concat([build(volumes, days, cal, d, h) for h in HORIZONS], ignore_index=True)
              for name, d in (("train", train_days), ("valid", valid_days), ("test", test_days))}
    print({name: len(frame) for name, frame in frames.items()})

    params = dict(objective="reg:squarederror", tree_method="hist", max_depth=8, learning_rate=0.06, subsample=0.8,
                  colsample_bytree=0.8, min_child_weight=20, reg_lambda=2.0, seed=SEED, nthread=4)
    dmat = {name: xgb.DMatrix(frame[FEATURES], label=frame["y"], feature_names=FEATURES) for name, frame in frames.items()}
    probe = xgb.train(params, dmat["train"], num_boost_round=1500, evals=[(dmat["valid"], "valid")], early_stopping_rounds=40, verbose_eval=100)
    rounds = probe.best_iteration + 1

    def forecast(booster, frame, matrix):
        return np.maximum((frame["typical"] + booster.predict(matrix)) * frame["scale"], 0)

    # Design check on September only: does the model beat both baselines on days it has not seen?
    valid = frames["valid"]
    valid_scores = {
        "model": scores(valid["actual"].to_numpy(), forecast(probe, valid, dmat["valid"]).to_numpy()),
        "typical_day": scores(valid["actual"].to_numpy(), (valid["typical"] * valid["scale"]).to_numpy()),
    }
    print("validation (10-30 Sep):", valid_scores, "trees:", rounds)
    # Refit on train + validation with the chosen number of trees, so the final model has seen everything before the test month.
    both = pd.concat([frames["train"], frames["valid"]], ignore_index=True)
    model = xgb.train(params, xgb.DMatrix(both[FEATURES], label=both["y"], feature_names=FEATURES), num_boost_round=rounds)
    model.save_model(OUT / "model.json")

    test = frames["test"].copy()
    test["model"] = forecast(model, test, dmat["test"])
    test["last_week"] = test["lag_week_1"] * test["scale"]
    test["typical_day"] = test["typical"] * test["scale"]
    # Compare all three on exactly the same rows: those where both baselines exist.
    fair = test[np.isfinite(test["last_week"]) & np.isfinite(test["typical_day"])]

    def block(frame: pd.DataFrame) -> dict:
        hourly = {name: scores(frame["actual"].to_numpy(), frame[name].to_numpy()) for name in ("model", "last_week", "typical_day")}
        day = frame.groupby(["site_idx", "day_idx", "horizon"])[["actual", "model", "last_week", "typical_day"]].agg(["sum", "size"])
        full = day[day[("actual", "size")] == 24]
        daily = {name: scores(full[("actual", "sum")].to_numpy(), full[(name, "sum")].to_numpy()) for name in ("model", "last_week", "typical_day")}
        return {
            "rows": int(len(frame)),
            "hourly": hourly,
            "daily": daily,
            "improvementOverLastWeek": round(1 - hourly["model"]["mae"] / hourly["last_week"]["mae"], 4),
            "improvementOverTypicalDay": round(1 - hourly["model"]["mae"] / hourly["typical_day"]["mae"], 4),
        }

    school = cal["school_holiday"][fair["day_idx"].to_numpy()] > 0
    metrics = {
        "trainedOn": dt.date.today().isoformat(),
        "data": {
            "source": "Traffic Signal Volume Data, Department of Transport and Planning (Victoria), CC BY 4.0",
            "sites": int(len(sites)),
            "period": [str(days[0].date()), str(days[-1].date())],
            "trainTargets": [str(FIRST_TARGET.date()), str((TEST_START - pd.Timedelta(days=1)).date())],
            "testTargets": [str(TEST_START.date()), str(days[-1].date())],
            "trainRows": int(len(both)),
            "testRows": int(len(fair)),
        },
        "validation": {"period": [str(VALID_START.date()), str((TEST_START - pd.Timedelta(days=1)).date())], **valid_scores},
        "model": {"type": "XGBoost regression on the deviation from the typical day", "trees": int(rounds), "features": FEATURES, "params": {k: v for k, v in params.items() if k != "nthread"}},
        "overall": block(fair),
        "byHorizon": {str(h): block(fair[fair["horizon"] == h]) for h in HORIZONS},
        "byDayType": {name: block(fair[mask]) for name, mask in (
            ("weekday", (fair["dow"] < 5).to_numpy()), ("weekend", (fair["dow"] >= 5).to_numpy()),
            ("schoolHoliday", school), ("schoolTerm", ~school))},
        "meanHourlyVolume": round(float(fair["actual"].mean()), 1),
    }

    # Which inputs drive the forecast: mean absolute SHAP contribution on a sample of test rows (XGBoost computes these exactly for trees).
    sample = fair.sample(min(20000, len(fair)), random_state=SEED)
    contributions = model.predict(xgb.DMatrix(sample[FEATURES], feature_names=FEATURES), pred_contribs=True)[:, :-1]
    importance = np.abs(contributions).mean(axis=0)
    metrics["featureImportance"] = [{"feature": f, "share": round(float(s), 4)} for f, s in sorted(zip(FEATURES, importance / importance.sum()), key=lambda x: -x[1])]

    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    test.to_parquet(OUT / "test_predictions.parquet", index=False)
    np.save(OUT / "sites.npy", sites)
    print(json.dumps({k: metrics[k] for k in ("overall", "meanHourlyVolume")}, indent=1))
    for h in HORIZONS:
        b = metrics["byHorizon"][str(h)]
        print(f"h={h:>2}  model MAE {b['hourly']['model']['mae']:>6}  last-week {b['hourly']['last_week']['mae']:>6}  typical {b['hourly']['typical_day']['mae']:>6}  WAPE {b['hourly']['model']['wape']:.3f}  daily WAPE {b['daily']['model']['wape']:.3f}  gain vs last-week {b['improvementOverLastWeek']:.1%}")
    print([(f["feature"], f["share"]) for f in metrics["featureImportance"][:8]])


if __name__ == "__main__":
    main()
