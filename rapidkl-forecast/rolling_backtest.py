"""Rolling-origin backtest: how stable is the error when the model is trained only on the days before each of several cut-off dates?

One test year gives one number. This trains the model (same design, same number of trees as results/metrics.json) on the days before
each cut-off and scores the following three months, so the spread across folds shows how much the headline figure depends on which
months happened to be in the test year. Every fold uses only earlier data, never a random split.

Usage : python rolling_backtest.py        (about 3 minutes per fold; writes results/rolling.json)
"""
import json

import numpy as np
import pandas as pd

import model as m

FOLDS = ["2025-08-12", "2025-11-12", "2026-02-12", "2026-05-12", "2026-08-12"]
FOLD_DAYS = 91


def main() -> None:
    rounds = json.loads((m.OUT / "metrics.json").read_text(encoding="utf-8"))["model"]["trees"]
    entries, meta = m.load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    cal = m.calendar(days)
    idx = lambda ts: int((ts - days[0]).days)
    wape = lambda rows, col: float((rows[col] - rows["actual"]).abs().sum() / rows["actual"].sum())
    results = []
    for start in FOLDS:
        begin = pd.Timestamp(start)
        stop = min(idx(begin) + FOLD_DAYS, len(days))
        if stop - idx(begin) < FOLD_DAYS // 2:
            continue  # not enough newer data yet for a meaningful fold
        train = m.frames_for(values, cal, meta, np.arange(idx(m.TRAIN_START), idx(begin)))
        test = m.frames_for(values, cal, meta, np.arange(idx(begin), stop))
        test = test.assign(model=m.predict(m.fit(train, rounds), test))
        test = test[np.isfinite(test["last_week"]) & np.isfinite(test["last_year"])]
        special = m.special_days(test)
        fold = {"start": start, "end": str(days[stop - 1].date()), "trainRows": int(len(train))}
        for name, kind in (("network", 0), ("lines", 1), ("stations", 2)):
            rows = test[test["kind"] == kind]
            holiday, ordinary = rows[special[rows.index]], rows[~special[rows.index]]
            fold[name] = {"model": round(wape(rows, "model"), 4), "usual": round(wape(rows, "usual"), 4), "lastYear": round(wape(rows, "last_year"), 4),
                          "holidayModel": round(wape(holiday, "model"), 4) if len(holiday) else None, "holidayUsual": round(wape(holiday, "usual"), 4) if len(holiday) else None,
                          "ordinaryModel": round(wape(ordinary, "model"), 4), "ordinaryUsual": round(wape(ordinary, "usual"), 4), "holidayDays": int(holiday["day_idx"].nunique())}
        results.append(fold)
        print(start, "->", fold["end"], {k: fold[k] for k in ("network", "stations")}, flush=True)
    summary = {}
    for name in ("network", "lines", "stations"):
        model_wape = [f[name]["model"] for f in results]
        usual_wape = [f[name]["usual"] for f in results]
        summary[name] = {"modelMean": round(float(np.mean(model_wape)), 4), "modelMin": min(model_wape), "modelMax": max(model_wape),
                         "usualMean": round(float(np.mean(usual_wape)), 4), "foldsBeatingUsual": int(sum(a < b for a, b in zip(model_wape, usual_wape))), "folds": len(results)}
    out = {"design": m.DESIGN, "trees": rounds, "foldDays": FOLD_DAYS, "folds": results, "summary": summary}
    (m.OUT / "rolling.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
