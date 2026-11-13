"""Tests each design idea on data from before the test year, so the test year stays untouched.

Two validation windows are used, each with a model trained only on the days before it:
  A  12 May - 11 Nov 2025   few public holidays
  B  12 Nov 2024 - 11 May 2025   includes Chinese New Year and Hari Raya Puasa
A change is kept in model.py's CONFIG only if it lowers the error in both. Results are written to results/experiments.json.

Usage : python experiments.py [A|B]
"""
import json
import sys

import numpy as np

import model as m

VARIANTS = {
    "v1 baseline": {"clean_usual": False, "rich_holidays": False, "holiday_weight": 1.0, "rain": False},
    "+ clean usual level": {"clean_usual": True, "rich_holidays": False, "holiday_weight": 1.0, "rain": False},
    "+ school holidays and holiday detail only": {"clean_usual": False, "rich_holidays": True, "holiday_weight": 1.0, "rain": False},
    "+ clean usual + school holidays and detail": {"clean_usual": True, "rich_holidays": True, "holiday_weight": 1.0, "rain": False},
    "+ holiday days weighted x3": {"clean_usual": True, "rich_holidays": True, "holiday_weight": 3.0, "rain": False},
    "+ same-day rainfall (perfect foresight)": {"clean_usual": True, "rich_holidays": True, "holiday_weight": 1.0, "rain": True},
}


WINDOWS = {"A": (m.VALID_START, m.TEST_START), "B": (m.pd.Timestamp("2024-11-12"), m.pd.Timestamp("2025-05-12"))}


def run(config: dict, window: str = "A") -> dict:
    m.CONFIG.update(config)
    entries, meta = m.load()
    values, days = entries.to_numpy(dtype=np.float32), entries.index
    cal = m.calendar(days)
    idx = lambda ts: int((ts - days[0]).days)
    start, end = WINDOWS[window]
    train = m.frames_for(values, cal, meta, np.arange(idx(m.TRAIN_START), idx(start)))
    valid = m.frames_for(values, cal, meta, np.arange(idx(start), idx(end)))
    booster = m.fit(train, 3000, valid)
    valid = valid.assign(model=m.predict(booster, valid))
    special = (valid["public_holiday"] > 0) | (valid["bridge_day"] > 0) | (valid["raya_offset"].abs() <= 7) | (valid["cny_offset"].abs() <= 5)
    wape = lambda f: round(float((f["model"] - f["actual"]).abs().sum() / f["actual"].sum()), 4)
    out = {"trees": booster.best_iteration + 1}
    for name, kind in (("network", 0), ("lines", 1), ("stations", 2)):
        rows = valid[valid["kind"] == kind]
        out[name] = {"all": wape(rows), "holidayPeriods": wape(rows[special[rows.index]]), "ordinaryDays": wape(rows[~special[rows.index]]),
                     "usual": round(float((rows["usual"] - rows["actual"]).abs().sum() / rows["actual"].sum()), 4)}
    return out


if __name__ == "__main__":
    window = sys.argv[1] if len(sys.argv) > 1 else "A"
    path = m.OUT / "experiments.json"
    saved = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    saved = saved if "windows" in saved else {"windows": {}}
    results = saved["windows"].setdefault(window, {"period": [str(WINDOWS[window][0].date()), str((WINDOWS[window][1] - m.pd.Timedelta(days=1)).date())], "results": {}})["results"]
    for name, config in VARIANTS.items():
        if name in results or (window == "B" and ("rain" in name or "weighted" in name)):
            continue
        results[name] = run(config, window)
        r = results[name]
        print(f"{window} {name:44} network {r['network']['all']:.4f} (holiday {r['network']['holidayPeriods']:.4f}, ordinary {r['network']['ordinaryDays']:.4f})  "
              f"lines {r['lines']['all']:.4f}  stations {r['stations']['all']:.4f} (holiday {r['stations']['holidayPeriods']:.4f})  trees {r['trees']}", flush=True)
        path.write_text(json.dumps(saved, indent=2), encoding="utf-8")
