"""Convert the source spreadsheet into the files the app serves.

Usage: python scripts/build_data.py path/to/data.xlsx

Writes data/sales.parquet (typed, sorted line items) and data/meta.json
(filter choices and totals). Stops with an error if the data does not match
the rules the dashboard relies on.
"""

import json
import sys
from pathlib import Path

import duckdb

OUT = Path(__file__).resolve().parent.parent / "data"

EXPECTED = {
    "rows": 300_000,
    "orders": 110_478,
    "revenue": 69_480_952,
    "units": 434_448,
    "days": 365,
    "free_rows": 8_611,
}

# Excel stores a date as days since 1899-12-30. Rounding to whole seconds
# removes floating point noise.
LOAD = """
CREATE TABLE sales AS
SELECT
    BillNo::DOUBLE::INTEGER AS bill,
    TIMESTAMP '1899-12-30'
        + to_microseconds(round(Order_Datetime::DOUBLE * 86400)::BIGINT * 1000000) AS ts,
    trim(Outlet_Name) AS outlet,
    trim("Group")     AS category,
    trim(Item)        AS item,
    trim(Order_Type)  AS order_type,
    trim(Settlement)  AS payment,
    Price::DOUBLE::INTEGER    AS price,
    Quantity::DOUBLE::INTEGER AS quantity
FROM read_xlsx(?, header = true, all_varchar = true)
"""

TOTALS = """
SELECT count(*), count(DISTINCT bill), sum(price * quantity)::BIGINT,
       sum(quantity)::BIGINT, count(DISTINCT ts::DATE), count(*) FILTER (price = 0)
FROM sales
"""

# Each query returns the number of rows that break the rule.
RULES = {
    "a value is missing": """
        SELECT count(*) FROM sales WHERE bill IS NULL OR ts IS NULL OR outlet IS NULL
        OR category IS NULL OR item IS NULL OR order_type IS NULL OR payment IS NULL
        OR price IS NULL OR quantity IS NULL""",
    "price or quantity is out of range":
        "SELECT count(*) FROM sales WHERE price < 0 OR quantity < 1",
    "an item is repeated within a bill": """
        SELECT count(*) FROM (SELECT 1 FROM sales GROUP BY bill, item HAVING count(*) > 1)""",
    "a bill has more than one outlet, time, order type or payment": """
        SELECT count(*) FROM (SELECT 1 FROM sales GROUP BY bill HAVING
        count(DISTINCT outlet) > 1 OR count(DISTINCT ts) > 1
        OR count(DISTINCT order_type) > 1 OR count(DISTINCT payment) > 1)""",
    "an item has more than one price or category": """
        SELECT count(*) FROM (SELECT 1 FROM sales GROUP BY item HAVING
        count(DISTINCT price) > 1 OR count(DISTINCT category) > 1)""",
}


def main(source: str) -> None:
    db = duckdb.connect()
    db.execute("INSTALL excel; LOAD excel;")
    db.execute(LOAD, [source])

    totals = dict(zip(EXPECTED, db.execute(TOTALS).fetchone()))
    problems = [
        f"{name}: expected {want:,}, found {totals[name]:,}"
        for name, want in EXPECTED.items()
        if totals[name] != want
    ]
    for rule, sql in RULES.items():
        broken = db.execute(sql).fetchone()[0]
        if broken:
            problems.append(f"{rule} ({broken:,} cases)")
    if problems:
        sys.exit("Data checks failed:\n  - " + "\n  - ".join(problems))

    def values(column: str) -> list[str]:
        rows = db.execute(f"SELECT DISTINCT {column} FROM sales ORDER BY 1").fetchall()
        return [r[0] for r in rows]

    first, last = db.execute("SELECT min(ts)::DATE, max(ts)::DATE FROM sales").fetchone()
    items = db.execute("SELECT DISTINCT item, category FROM sales ORDER BY 2, 1").fetchall()
    meta = {
        "minDate": str(first),
        "maxDate": str(last),
        "rows": totals["rows"],
        "outlets": values("outlet"),
        "categories": values("category"),
        "items": [{"name": name, "category": category} for name, category in items],
        "orderTypes": values("order_type"),
        "payments": values("payment"),
    }

    OUT.mkdir(exist_ok=True)
    parquet = (OUT / "sales.parquet").as_posix()
    db.execute(
        f"COPY (SELECT * FROM sales ORDER BY ts, bill, item) TO '{parquet}' "
        "(FORMAT parquet, COMPRESSION zstd)"
    )
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    size = (OUT / "sales.parquet").stat().st_size / 1e6
    print(f"All checks passed. Wrote {totals['rows']:,} rows ({size:.1f} MB).")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
