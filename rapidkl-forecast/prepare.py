"""Step 1: download Rapid Rail daily ridership and condense it to one column per series.

Source: "Daily Origin-Destination Ridership: Rapid Rail (KV)", data.gov.my (Prasarana / Ministry of Transport), CC BY 4.0.
        One file per year at https://storage.data.gov.my/transportation/rail/rapidrail_<year>_daily.parquet, refreshed daily.
        Each row is the number of trips from one station to another on one day. The portal also provides a
        "to all stations" row per origin station, which is that station's entries for the day.

Output: entries.parquet, indexed by date, one column per series:
          ALL            every station (journeys started on the network)
          LINE:<code>    stations whose code starts with that line prefix, e.g. LINE:KJ
          <station>      one station, e.g. "KJ10: KLCC"
        A journey is counted once, where it starts. These are station entries, not the operator's official line
        ridership, which also counts passengers who transfer onto a line.

Usage : python prepare.py            (downloads any missing or outdated year, then rebuilds entries.parquet)
"""
import datetime as dt
import urllib.request
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
RAW = HERE / "raw"
URL = "https://storage.data.gov.my/transportation/rail/rapidrail_{year}_daily.parquet"
FIRST_YEAR = 2023
EVERYWHERE = "A0: All Stations"
LINES = {
    "KJ": "LRT Kelana Jaya Line",
    "AG": "LRT Ampang Line",
    "SP": "LRT Sri Petaling Line",
    "KG": "MRT Kajang Line",
    "PYL": "MRT Putrajaya Line",
    "MR": "KL Monorail",
    "SA": "LRT Shah Alam Line",
}


def download(today: dt.date | None = None) -> None:
    """Past years never change, so they are fetched once; the current year is always refreshed."""
    today = today or dt.date.today()
    RAW.mkdir(exist_ok=True)
    for year in range(FIRST_YEAR, today.year + 1):
        target = RAW / f"rapidrail_{year}_daily.parquet"
        if target.exists() and year < today.year:
            continue
        try:
            urllib.request.urlretrieve(URL.format(year=year), target)
            print(f"downloaded {target.name} ({target.stat().st_size / 1e6:.1f} MB)")
        except Exception as error:  # a new year's file may not exist for the first days of January
            if not target.exists():
                print(f"skipped {year}: {error}")


def build() -> pd.DataFrame:
    files = sorted(RAW.glob("rapidrail_*_daily.parquet"))
    rows = pd.concat([pd.read_parquet(f, filters=[("destination", "==", EVERYWHERE)]) for f in files], ignore_index=True)
    rows = rows[rows["origin"] != EVERYWHERE]
    stations = rows.pivot_table(index="date", columns="origin", values="ridership", aggfunc="sum")
    stations = stations.reindex(pd.date_range(stations.index.min(), stations.index.max(), freq="D"))
    stations.index.name = "date"
    # A station that had not opened yet reports nothing or zero: keep those days as "no data", not as zero riders.
    opened = (stations.fillna(0) > 0).cumsum() > 0
    stations = stations.where(opened)

    prefix = stations.columns.str.extract(r"^([A-Z]+)")[0].to_numpy()
    out = {"ALL": stations.sum(axis=1, min_count=1)}
    for code in LINES:
        members = stations.loc[:, prefix == code]
        if members.shape[1]:
            out[f"LINE:{code}"] = members.sum(axis=1, min_count=1)
    wide = pd.concat([pd.DataFrame(out), stations], axis=1).astype("float32")
    wide.to_parquet(HERE / "entries.parquet")
    print(f"{wide.shape[1]} series ({stations.shape[1]} stations), {wide.index[0].date()} to {wide.index[-1].date()} -> entries.parquet")
    return wide


if __name__ == "__main__":
    download()
    build()
