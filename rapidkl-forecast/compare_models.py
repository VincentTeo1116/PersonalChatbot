"""Compares five machine-learning models on the Rapid KL ridership forecast, under identical conditions.

All five are SUPERVISED REGRESSION models: each learns from past examples where the answer is known (inputs for a day ->
how far that day sat above or below its usual level) and is then asked about days it has not seen.

  xgboost        gradient-boosted trees (the model the site uses today)
  lightgbm       gradient-boosted trees, a different and usually faster implementation
  random_forest  many independent trees, averaged
  ridge          a straight-line (linear) model: the simple yardstick
  mlp            a small neural network

The comparison is fair because every model gets:
  - the same inputs (model.py's features), the same target (log deviation from the usual level) and the same weights
  - the same split by date: train to 11 May 2025, validation to 11 Nov 2025, test on the following year
  - its size or strength chosen on the VALIDATION period only, then one refit on train + validation, then ONE look at the test year

How to pick the winner: rank by validation error (WAPE). The test numbers are the honest report for the chosen model; if you
pick the model with the best test number instead, the test year is no longer unseen and its score flatters you.

Install : pip install -r requirements-compare.txt
Usage   : python compare_models.py                              all five (slow: see --sample)
          python compare_models.py --models xgboost lightgbm    only these
          python compare_models.py --sample 0.25                train on a quarter of the training rows (much faster, slightly worse)
          python compare_models.py --quick                      a two-minute check that everything runs; the numbers mean nothing
Output  : results/comparison.json and a table on screen. Earlier results in the file are kept, so models can be run one at a time.
"""
import argparse
import json
import time

import numpy as np
import pandas as pd

import model as m

CATEGORICAL = ["dow", "month", "kind", "line", "horizon"]  # numbers that are really labels: one-hot encoded for ridge and mlp
OUT_FILE = m.OUT / "comparison.json"


# ----------------------------------------------------------------------------------------------------------------------
# The five models. Each function takes the training rows and the validation rows, chooses its own size on validation,
# and returns (settings it chose, a function that refits with those settings on any rows and returns a predictor).
# A predictor takes rows and returns the predicted log deviation from the usual level.
# ----------------------------------------------------------------------------------------------------------------------

def xgboost_model(train: pd.DataFrame, valid: pd.DataFrame, quick: bool):
    import xgboost as xgb

    cols = m.features()
    matrix = lambda f: xgb.DMatrix(f[cols], label=f["y"], weight=f["weight"], feature_names=cols)
    # Trees are added one at a time, each correcting the errors left by the ones before. Training stops when the
    # validation error has not improved for 60 trees; that tree count is the setting carried forward.
    probe = xgb.train(m.PARAMS, matrix(train), num_boost_round=60 if quick else 3000, evals=[(matrix(valid), "valid")], early_stopping_rounds=60, verbose_eval=False)
    rounds = probe.best_iteration + 1

    def refit(rows: pd.DataFrame):
        booster = xgb.train(m.PARAMS, matrix(rows), num_boost_round=rounds)
        return lambda f: booster.predict(xgb.DMatrix(f[cols], feature_names=cols))

    return {"trees": rounds, **{k: m.PARAMS[k] for k in ("max_depth", "learning_rate")}}, refit


def lightgbm_model(train: pd.DataFrame, valid: pd.DataFrame, quick: bool):
    import lightgbm as lgb

    cols = m.features()
    # Same idea as XGBoost, but trees grow leaf by leaf (num_leaves) instead of level by level. Settings mirror XGBoost's.
    params = dict(objective="regression", learning_rate=0.05, num_leaves=127, min_child_samples=30, subsample=0.8, subsample_freq=1,
                  colsample_bytree=0.8, reg_lambda=2.0, random_state=m.SEED, n_jobs=4, verbose=-1)
    probe = lgb.LGBMRegressor(n_estimators=60 if quick else 3000, **params)
    probe.fit(train[cols], train["y"], sample_weight=train["weight"], eval_set=[(valid[cols], valid["y"])], eval_sample_weight=[valid["weight"]],
              callbacks=[lgb.early_stopping(60, verbose=False)])
    rounds = int(probe.best_iteration_ or probe.n_estimators)

    def refit(rows: pd.DataFrame):
        booster = lgb.LGBMRegressor(n_estimators=rounds, **params).fit(rows[cols], rows["y"], sample_weight=rows["weight"])
        return lambda f: booster.predict(f[cols])

    return {"trees": rounds, "num_leaves": 127, "learning_rate": 0.05}, refit


def random_forest_model(train: pd.DataFrame, valid: pd.DataFrame, quick: bool):
    from sklearn.ensemble import RandomForestRegressor

    cols = m.features()
    # Each tree sees a random 20% of the rows and half of the inputs at each split, and the forest averages them.
    # Trees do not correct each other, so more trees never hurt; the setting that matters is how small a leaf may get.
    def forest(leaf: int):
        return RandomForestRegressor(n_estimators=20 if quick else 200, min_samples_leaf=leaf, max_features=0.5, max_samples=0.2, n_jobs=-1, random_state=m.SEED)

    best_leaf, best_error = None, np.inf
    for leaf in ([20] if quick else [5, 20, 50]):
        fitted = forest(leaf).fit(train[cols], train["y"], sample_weight=train["weight"])
        error = wape(valid, to_entries(valid, fitted.predict(valid[cols])))
        if error < best_error:
            best_leaf, best_error = leaf, error

    def refit(rows: pd.DataFrame):
        fitted = forest(best_leaf).fit(rows[cols], rows["y"], sample_weight=rows["weight"])
        return lambda f: fitted.predict(f[cols])

    return {"trees": 20 if quick else 200, "min_samples_leaf": best_leaf}, refit


def preprocessing():
    """Ridge and the neural network cannot use raw inputs the way trees can: labels become on/off columns, gaps are filled
    (with a flag saying the value was missing), and every column is put on the same scale."""
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler

    numeric = [c for c in m.features() if c not in CATEGORICAL]
    return ColumnTransformer([
        ("labels", OneHotEncoder(handle_unknown="ignore"), [c for c in CATEGORICAL if c in m.features()]),
        ("numbers", make_pipeline(SimpleImputer(strategy="median", add_indicator=True), StandardScaler()), numeric),
    ])


def ridge_model(train: pd.DataFrame, valid: pd.DataFrame, quick: bool):
    from sklearn.linear_model import Ridge
    from sklearn.pipeline import make_pipeline

    cols = m.features()
    # A weighted sum of the inputs. It cannot learn "this only matters on a holiday" by itself, which is why it is the yardstick:
    # a tree model that cannot beat it is not using its extra flexibility. alpha controls how strongly large weights are discouraged.
    build = lambda alpha: make_pipeline(preprocessing(), Ridge(alpha=alpha))
    best_alpha, best_error = None, np.inf
    for alpha in ([1.0] if quick else [0.1, 1.0, 10.0, 100.0]):
        fitted = build(alpha).fit(train[cols], train["y"], ridge__sample_weight=train["weight"])
        error = wape(valid, to_entries(valid, fitted.predict(valid[cols])))
        if error < best_error:
            best_alpha, best_error = alpha, error

    def refit(rows: pd.DataFrame):
        fitted = build(best_alpha).fit(rows[cols], rows["y"], ridge__sample_weight=rows["weight"])
        return lambda f: fitted.predict(f[cols])

    return {"alpha": best_alpha}, refit


def mlp_model(train: pd.DataFrame, valid: pd.DataFrame, quick: bool):
    from sklearn.neural_network import MLPRegressor
    from sklearn.pipeline import make_pipeline

    cols = m.features()
    # Two hidden layers. Training stops by itself when a held-back 10% of the training rows stops improving.
    def network(layers: tuple[int, ...]):
        return make_pipeline(preprocessing(), MLPRegressor(hidden_layer_sizes=layers, learning_rate_init=0.001, batch_size=2048, alpha=1e-4,
                                                           max_iter=5 if quick else 60, early_stopping=True, n_iter_no_change=5, random_state=m.SEED))

    best_layers, best_error = None, np.inf
    for layers in ([(32,)] if quick else [(64, 32), (128, 64)]):
        fitted = network(layers).fit(train[cols], train["y"], mlpregressor__sample_weight=train["weight"])
        error = wape(valid, to_entries(valid, fitted.predict(valid[cols])))
        if error < best_error:
            best_layers, best_error = layers, error

    def refit(rows: pd.DataFrame):
        fitted = network(best_layers).fit(rows[cols], rows["y"], mlpregressor__sample_weight=rows["weight"])
        return lambda f: fitted.predict(f[cols])

    return {"hidden_layers": list(best_layers)}, refit


MODELS = {"xgboost": xgboost_model, "lightgbm": lightgbm_model, "random_forest": random_forest_model, "ridge": ridge_model, "mlp": mlp_model}


# ----------------------------------------------------------------------------------------------------------------------
# Scoring
# ----------------------------------------------------------------------------------------------------------------------

def to_entries(frame: pd.DataFrame, log_deviation: np.ndarray) -> np.ndarray:
    """Turns a predicted deviation back into a number of passengers."""
    return np.maximum(np.expm1(np.log1p(frame["usual"].to_numpy()) + log_deviation), 0)


def wape(frame: pd.DataFrame, predicted: np.ndarray) -> float:
    actual = frame["actual"].to_numpy()
    return float(np.abs(predicted - actual).sum() / actual.sum())


def score(frame: pd.DataFrame, predicted: np.ndarray) -> dict:
    """WAPE is the ranking metric; the others are reported so the table can be read alongside other work.

    WAPE  total absolute error / total ridership. A percentage, so the network (700,000 a day) and a small station (2,000 a day)
          can be compared, and busy days count for more than quiet ones.
    MAE   average error in passengers. Easy to explain, but only meaningful within one kind of series.
    RMSE  like MAE, but large misses count much more. Read it next to MAE: a big gap means a few very bad days (holidays).
    R2    share of the variation explained. It depends on what is pooled: across all stations together it is close to 1 for any
          method, because station size explains almost everything, and within one series a handful of holiday days dominate it.
          Useful as a sanity check, not for ranking.
    """
    actual = frame["actual"].to_numpy()
    error = predicted - actual
    return {
        "wape": round(float(np.abs(error).sum() / actual.sum()), 4),
        "mae": round(float(np.abs(error).mean()), 1),
        "rmse": round(float(np.sqrt((error**2).mean())), 1),
        "r2": round(float(1 - (error**2).sum() / ((actual - actual.mean()) ** 2).sum()), 4),
    }


def report(frame: pd.DataFrame, predicted: np.ndarray) -> dict:
    special = m.special_days(frame).to_numpy()
    out = {}
    for kind, name in m.KIND_NAMES.items():
        rows = (frame["kind"] == kind).to_numpy()
        out[name] = {**score(frame[rows], predicted[rows]),
                     "holidayWape": round(wape(frame[rows & special], predicted[rows & special]), 4) if (rows & special).any() else None,
                     "ordinaryWape": round(wape(frame[rows & ~special], predicted[rows & ~special]), 4)}
    # One number to rank by: the plain average of the three kinds, so 166 stations do not drown out the network.
    out["rankingWape"] = round(float(np.mean([out[name]["wape"] for name in m.KIND_NAMES.values()])), 4)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare forecasting models on the Rapid KL data.")
    parser.add_argument("--models", nargs="+", default=list(MODELS), choices=list(MODELS))
    parser.add_argument("--sample", type=float, default=1.0, help="share of the training rows to use (0-1)")
    parser.add_argument("--quick", action="store_true", help="tiny run to check the code works")
    args = parser.parse_args()

    entries, meta = m.load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    cal = m.calendar(days)
    idx = lambda ts: int((ts - days[0]).days)
    train = m.frames_for(values, cal, meta, np.arange(idx(m.TRAIN_START), idx(m.VALID_START)))
    valid = m.frames_for(values, cal, meta, np.arange(idx(m.VALID_START), idx(m.TEST_START)))
    test = m.frames_for(values, cal, meta, np.arange(idx(m.TEST_START), len(days)))
    test = test[np.isfinite(test["last_week"])].reset_index(drop=True)  # the same rows model.py scores
    share = 0.03 if args.quick else args.sample
    if share < 1:
        train = train.sample(frac=share, random_state=m.SEED).reset_index(drop=True)
    print(f"rows: train {len(train):,}  validation {len(valid):,}  test {len(test):,}  inputs {len(m.features())}")

    saved = json.loads(OUT_FILE.read_text(encoding="utf-8")) if OUT_FILE.exists() and not args.quick else {}
    saved.setdefault("baselines", {})
    for name in ("usual", "last_week"):  # the two guesses that need no model
        ok = np.isfinite(valid[name]).to_numpy()
        saved["baselines"][name] = {"validation": report(valid[ok], valid[name].to_numpy()[ok]), "test": report(test, test[name].to_numpy())}
    saved.setdefault("models", {})

    for name in args.models:
        started = time.time()
        try:
            settings, refit = MODELS[name](train, valid, args.quick)
            validation = report(valid, to_entries(valid, refit(train)(valid)))
            final = refit(pd.concat([train, valid], ignore_index=True))  # the model that would go live: trained on everything before the test year
            saved["models"][name] = {"settings": settings, "trainShare": share, "minutes": None, "validation": validation, "test": report(test, to_entries(test, final(test)))}
        except ImportError as error:
            print(f"{name}: skipped, {error}. Run: pip install -r requirements-compare.txt")
            continue
        saved["models"][name]["minutes"] = round((time.time() - started) / 60, 1)
        print(f"{name}: done in {saved['models'][name]['minutes']} min, settings {settings}")
        if not args.quick:
            OUT_FILE.write_text(json.dumps(saved, indent=2), encoding="utf-8")

    rows = [(name, r) for name, r in saved["models"].items()] + [(f"baseline: {name}", r) for name, r in saved["baselines"].items()]
    rows.sort(key=lambda item: item[1]["validation"]["rankingWape"])
    print("\nRanked by VALIDATION error (the fair way to choose). WAPE = error as a share of ridership; lower is better.")
    print(f"{'model':22} {'valid':>7} | {'test':>7} {'network':>8} {'lines':>7} {'stations':>9} {'holiday*':>9} {'MAE*':>9} {'RMSE*':>9} {'R2*':>7} {'min':>6}")
    for name, r in rows:
        t, net = r["test"], r["test"]["network"]
        print(f"{name:22} {r['validation']['rankingWape']:>7.2%} | {t['rankingWape']:>7.2%} {net['wape']:>8.2%} {t['lines']['wape']:>7.2%} {t['stations']['wape']:>9.2%} "
              f"{net['holidayWape']:>9.2%} {net['mae']:>9,.0f} {net['rmse']:>9,.0f} {net['r2']:>7.3f} {r.get('minutes') or '':>6}")
    print("* whole network, test year.  valid / test = average WAPE of network, lines and stations.")
    if args.quick:
        print("\nQUICK RUN: tiny models on 3% of the data. This only proves the code runs. Nothing was saved.")
    else:
        print(f"\nsaved to {OUT_FILE}")


if __name__ == "__main__":
    main()
