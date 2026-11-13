"""Step 1: condense the raw SCATS files into one row per site and day.

Input : monthly ZIPs from https://opendata.transport.vic.gov.au/dataset/traffic-signal-volume-data
        (Department of Transport and Planning, Victoria; CC BY 4.0). Each daily CSV has one row per
        site, detector and day with 96 fifteen-minute counts (V00 = 00:00-00:15). -1 marks a missing count.
Output: site_days.parquet with, per site and day, the 96 counts summed over that site's detectors,
        plus how many detector rows were complete, so unreliable days can be filtered out later.

Usage : python prepare.py C:/data/scats
"""
import sys
import zipfile
from pathlib import Path

import pandas as pd

V = [f"V{i:02d}" for i in range(96)]
OUT = Path(__file__).with_name("site_days.parquet")


def one_day(handle) -> pd.DataFrame:
    df = pd.read_csv(handle, usecols=["NB_SCATS_SITE", "QT_INTERVAL_COUNT", "NB_DETECTOR", *V])
    # A detector row with any missing interval is dropped whole: a partly counted detector would understate the site total.
    df["bad"] = (df[V] < 0).any(axis=1)
    good = df[~df["bad"]]
    totals = good.groupby("NB_SCATS_SITE")[V].sum()
    counts = df.groupby("NB_SCATS_SITE").agg(detectors=("NB_DETECTOR", "size"), bad_detectors=("bad", "sum"))
    out = counts.join(totals, how="left")
    out[V] = out[V].fillna(0).astype("int32")
    out.insert(0, "date", pd.to_datetime(df["QT_INTERVAL_COUNT"].iloc[0]))
    return out.reset_index().rename(columns={"NB_SCATS_SITE": "site"})


def main(folder: str) -> None:
    frames = []
    for path in sorted(Path(folder).glob("*.zip")):
        with zipfile.ZipFile(path) as archive:
            for name in sorted(archive.namelist()):
                if not name.lower().endswith(".csv"):
                    continue
                with archive.open(name) as handle:
                    frames.append(one_day(handle))
                print(name, len(frames[-1]), "sites", flush=True)
    data = pd.concat(frames, ignore_index=True).sort_values(["site", "date"])
    data.to_parquet(OUT, index=False)
    print(f"{len(data):,} site-days, {data['site'].nunique():,} sites, {data['date'].min().date()} to {data['date'].max().date()} -> {OUT.name}")


if __name__ == "__main__":
    main(sys.argv[1])
