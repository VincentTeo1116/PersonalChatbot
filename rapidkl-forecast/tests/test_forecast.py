"""Tests for the parts of the daily forecast that decide what is safe to publish: the recent-miss nudge, the track record,
model loading and the final check. They use small made-up data and run in a second.

Usage : python -m unittest discover -s tests        (from the rapidkl-forecast folder)
"""
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import forecast as f  # noqa: E402
import model as m  # noqa: E402

WEIGHTS = {"1": 0.5, "2": 0.5, "3": 0.25, "5": 0.0, "7": 0.0, "10": 0.0}
CONFIG = {"window": 7, "minDays": 4, "weights": WEIGHTS}


def entry(date, forecast, actual, raw=None, adj=None, ahead=1):
    return {"date": date, "madeOn": "x", "daysAhead": ahead, "forecast": forecast, "actual": actual,
            **({"rawForecast": raw} if raw is not None else {}), **({"adjActual": adj} if adj is not None else {})}


class Helpers(unittest.TestCase):
    def test_weight_is_interpolated_and_falls_to_zero(self):
        self.assertEqual(m.correction_weight(1, WEIGHTS), 0.5)
        self.assertAlmostEqual(m.correction_weight(4, WEIGHTS), 0.125)
        self.assertEqual(m.correction_weight(10, WEIGHTS), 0.0)
        self.assertEqual(m.correction_weight(28, WEIGHTS), 0.0)

    def test_recent_median_needs_enough_days_inside_the_window(self):
        cutoff = pd.Timestamp("2026-11-21")
        misses = {cutoff - pd.Timedelta(days=i): v for i, v in enumerate([0.05, 0.04, 0.06, 0.02, 0.03, 0.9, -0.4, 5.0])}
        self.assertAlmostEqual(m.recent_median(misses, cutoff, 7, 4), 0.04)  # the 8th day is outside the window and ignored
        self.assertIsNone(m.recent_median(misses, cutoff, 7, 8))
        self.assertIsNone(m.recent_median({}, cutoff, 7, 4))

    def test_spike_needs_both_a_ratio_and_a_size(self):
        self.assertTrue(m.is_spike(19648, 3243))
        self.assertFalse(m.is_spike(1500, 100))  # a big ratio on a tiny station is noise
        self.assertFalse(m.is_spike(26000, 20000))  # a big station moving a lot is not a 1.8x event


class RecentMiss(unittest.TestCase):
    days = [f"2026-11-{d}" for d in range(15, 22)]

    def test_off_without_calibration(self):
        self.assertFalse(f.recent_miss([], "2026-11-21", None)["applied"])
        self.assertFalse(f.recent_miss([], "2026-11-21", {"window": 7, "minDays": 4, "weights": {}})["applied"])

    def test_off_with_too_little_evidence(self):
        track = [entry(d, 100, 110) for d in self.days[:3]]
        result = f.recent_miss(track, "2026-11-21", CONFIG)
        self.assertFalse(result["applied"])
        self.assertIn("fewer than", result["reason"])

    def test_old_scored_days_do_not_count(self):
        track = [entry(d, 100, 110) for d in ("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05")]
        self.assertFalse(f.recent_miss(track, "2026-11-21", CONFIG)["applied"])

    def test_learns_from_the_raw_forecast_not_the_published_one(self):
        # Published forecasts were already nudged up by 5%; the miss must be measured against the model's own number or the nudge would feed on itself.
        track = [entry(d, 105, 110, raw=100) for d in self.days]
        result = f.recent_miss(track, "2026-11-21", CONFIG)
        self.assertTrue(result["applied"])
        self.assertAlmostEqual(result["medianMiss"], float(np.log(1.1)), places=3)

    def test_entries_from_before_the_nudge_existed_are_read_as_unnudged(self):
        track = [entry(d, 100, 110) for d in self.days]  # no rawForecast, no adjActual
        self.assertAlmostEqual(f.recent_miss(track, "2026-11-21", CONFIG)["medianMiss"], float(np.log(1.1)), places=3)

    def test_an_event_does_not_move_the_nudge(self):
        # Two days beaten by a concert (adjActual strips it): the median stays at the ordinary 1% miss.
        track = [entry(d, 100, 101, raw=100, adj=101) for d in self.days[:5]] + [entry(d, 100, 140, raw=100, adj=101) for d in self.days[5:]]
        self.assertAlmostEqual(f.recent_miss(track, "2026-11-21", CONFIG)["medianMiss"], float(np.log(1.01)), places=3)

    def test_the_nudge_is_capped(self):
        track = [entry(d, 100, 200, raw=100) for d in self.days]
        self.assertAlmostEqual(f.recent_miss(track, "2026-11-21", CONFIG)["medianMiss"], m.MISS_CAP, places=4)

    def test_only_one_day_ahead_entries_are_used(self):
        track = [entry(d, 100, 150, ahead=7) for d in self.days]
        self.assertFalse(f.recent_miss(track, "2026-11-21", CONFIG)["applied"])


class Tracking(unittest.TestCase):
    def setUp(self):
        index = pd.date_range("2026-11-10", "2026-11-14")
        self.entries = pd.DataFrame({"ALL": [1000.0, 1000.0, 1100.0, 1200.0, np.nan], "A: Quiet": [100.0, 100.0, 100.0, 100.0, 100.0],
                                     "B: Venue": [50.0, 50.0, 50.0, 6000.0, 50.0]}, index=index)

    def previous(self):
        station = lambda sid, label, values: {"id": sid, "label": label, "kind": "stations", "forecast": values}
        return {"dataThrough": "2026-11-12", "days": [{"date": "2026-11-13", "horizon": 1}, {"date": "2026-11-14", "horizon": 2}],
                "series": [{"id": "ALL", "label": "Whole network", "kind": "network", "forecast": [1000, 1000], "rawForecast": [990, 990]},
                           station("A: Quiet", "Quiet (A)", [100, 100]), station("B: Venue", "Venue (B)", [50, 50])]}

    def test_scores_only_days_that_have_arrived_and_names_the_event(self):
        track = f.score_previous(self.previous(), self.entries, [])
        self.assertEqual([t["date"] for t in track], ["2026-11-13"])  # the 14th is not published yet (NaN)
        t = track[0]
        self.assertEqual((t["forecast"], t["rawForecast"], t["actual"]), (1000, 990, 1200))
        self.assertEqual(t["events"][0]["station"], "Venue (B)")
        self.assertEqual(t["events"][0]["extra"], 5950)
        self.assertEqual(t["adjActual"], 1)  # the event is larger than this toy network, so the adjusted actual is floored at 1, never negative

    def test_a_day_is_scored_once(self):
        previous = self.previous()
        once = f.score_previous(previous, self.entries, [])
        self.assertEqual(len(f.score_previous(previous, self.entries, list(once))), 1)

    def test_long_track_scores_old_forecasts_with_their_range(self):
        archive = {"2026-11-06": {"f": list(range(100, 128)), "lo": list(range(90, 118)), "hi": list(range(110, 138))}}
        scored = f.score_long(archive, self.entries, [])
        self.assertEqual([(t["date"], t["daysAhead"]) for t in scored], [("2026-11-13", 7)])
        self.assertEqual((scored[0]["forecast"], scored[0]["low"], scored[0]["high"]), (106, 96, 116))
        self.assertEqual(len(f.score_long(archive, self.entries, scored)), 1)

    def test_live_summary_reports_bias_and_coverage(self):
        rows = [{"date": f"d{i}", "daysAhead": 7, "forecast": 100, "low": 90, "high": 110, "actual": 105 if i % 2 else 120} for i in range(20)]
        summary = f.live_summary([], rows)[0]
        self.assertEqual(summary["daysAhead"], 7)
        self.assertAlmostEqual(summary["bias"], 100 / 112.5 - 1, places=3)
        self.assertEqual(summary["inRange"], 0.5)

    def test_unreadable_previous_file_is_treated_as_missing(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "forecast.json"
            path.write_text("{not json", encoding="utf-8")
            self.assertEqual(f.read_previous(path), {})
            self.assertEqual(f.read_previous(Path(folder) / "absent.json"), {})
            path.write_text("[]", encoding="utf-8")
            self.assertEqual(f.read_previous(path), {})


class Validation(unittest.TestCase):
    def good(self):
        base = [1000 + i for i in range(28)]
        series = lambda sid: {"id": sid, "label": sid, "kind": "network", "history": [1000] * 56, "forecast": base, "low": [v - 50 for v in base], "high": [v + 50 for v in base], "usual": base}
        today = pd.Timestamp.now().strftime("%Y-%m-%d")
        return {"dataThrough": today, "days": [{}] * 28, "series": [series("ALL"), series("X")]}

    def test_good_file_passes(self):
        f.validate(self.good(), {})

    def test_rejects_forecast_outside_range_negative_or_missing_network(self):
        out = self.good()
        out["series"][1]["forecast"][3] = out["series"][1]["high"][3] + 1
        with self.assertRaises(SystemExit):
            f.validate(out, {})
        out = self.good()
        out["series"][0]["forecast"][0] = -1
        with self.assertRaises(SystemExit):
            f.validate(out, {})
        out = self.good()
        out["series"] = out["series"][1:]
        with self.assertRaises(SystemExit):
            f.validate(out, {})

    def test_rejects_nan_stale_data_and_a_collapse_in_series_count(self):
        out = self.good()
        out["series"][1]["usual"][0] = float("nan")
        with self.assertRaises(SystemExit):
            f.validate(out, {})
        out = self.good()
        out["dataThrough"] = "2020-01-01"
        with self.assertRaises(SystemExit):
            f.validate(out, {})
        with self.assertRaises(SystemExit):
            f.validate(self.good(), {"series": [0] * 100})

    def test_rejects_a_network_forecast_far_from_recent_levels(self):
        out = self.good()
        for key in ("forecast", "low", "high", "usual"):
            out["series"][0][key] = [v * 3 for v in out["series"][0][key]]
        with self.assertRaises(SystemExit):
            f.validate(out, {})


class ModelLoading(unittest.TestCase):
    """A retrained model is used only when it matches today's features and design; otherwise the repository copy is."""

    def tiny(self, folder, design):
        names = m.features()
        data = xgb.DMatrix(np.random.default_rng(0).random((50, len(names))), label=np.zeros(50), feature_names=names)
        booster = xgb.train({"objective": "reg:squarederror"}, data, num_boost_round=2)
        if design:
            booster.set_attr(design=design)
        booster.save_model(Path(folder) / "model_production.json")

    def test_retrained_model_with_the_current_design_is_used(self):
        with tempfile.TemporaryDirectory() as folder:
            self.tiny(folder, m.DESIGN)
            self.assertEqual(f.load_model("model_production.json", folder)[1], "retrained")

    def test_retrained_model_from_an_older_design_is_skipped(self):
        with tempfile.TemporaryDirectory() as folder:
            for design in ("v2", None):
                self.tiny(folder, design)
                self.assertEqual(f.load_model("model_production.json", folder)[1], "repository")

    def test_damaged_download_is_skipped(self):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / "model_production.json").write_text("garbage", encoding="utf-8")
            self.assertEqual(f.load_model("model_production.json", folder)[1], "repository")


class RangeShape(unittest.TestCase):
    def test_old_and_new_correction_shapes_both_work(self):
        frame = pd.DataFrame({"kind": [0, 0], "horizon": [2, 20], "usual": [1000.0, 1000.0], "public_holiday": [0.0, 0.0], "bridge_day": [0.0, 0.0],
                              "raya_offset": [30.0, 30.0], "cny_offset": [30.0, 30.0]})
        offsets = np.array([[-0.05, 0.05], [-0.05, 0.05]])
        original = m.range_offsets
        m.range_offsets = lambda model, fr: offsets
        try:
            centre = np.array([1000.0, 1000.0])
            old = {k: {"holidayPeriods": 0.1, "ordinaryDays": 0.02} for k in ("network", "lines", "stations")}
            new = {k: {"holidayPeriods": {"1-7": 0.1, "8-28": 0.1}, "ordinaryDays": {"1-7": 0.0, "8-28": 0.05}} for k in ("network", "lines", "stations")}
            low_old, _ = m.predict_range(None, frame, centre, old)
            low_new, high_new = m.predict_range(None, frame, centre, new)
            self.assertTrue(np.all(low_old < 960))
            self.assertGreater(low_new[0], low_new[1])  # the far forecast gets the wider range
            self.assertTrue(np.all(low_new <= centre) and np.all(high_new >= centre))
        finally:
            m.range_offsets = original


if __name__ == "__main__":
    unittest.main()
