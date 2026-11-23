# Burger Town sales dashboard

An analytics dashboard over 300,000 restaurant line items: 110,478 orders from six outlets, 17 June 2025 to 16 June 2026.

**Live app:** https://burger-town-dashboard-sandy.vercel.app

## Features

- **KPIs:** revenue, orders, revenue per order, units sold, total records.
- **Charts:** revenue or orders over time (day, week, month), outlets, categories, top items, payment and order type shares, and a weekday by hour heatmap.
- **Filters:** date range, outlet, category, item, order type and payment. They can be combined, they live in the URL so a view can be shared, and the outlet, category and item bars can be clicked to filter.
- **Extras:** calculated insights, phone layout, dark mode.

## Run it

Needs Node 24, Python 3.10+ and the `data.xlsx` provided with the assessment. There is no database to set up. The dataset is not in this repository, because I was not sure it may be published.

```bash
npm install
pip install -r scripts/requirements.txt
python scripts/build_data.py path/to/data.xlsx   # writes data/sales.parquet, about 20 seconds

npm run dev      # http://localhost:3000
npm test
npm run build    # production build
```

To deploy, build the data file first, then run `npx vercel --prod`. The `.vercelignore` file lets the CLI upload the data file that git ignores, so deploy from a computer that has it rather than from GitHub.

## How it works

```
data.xlsx --(Python, run once)--> data/sales.parquet + data/meta.json
                                          |
Browser <------- JSON ------- Next.js API routes ---- SQL ----> DuckDB (in memory)
```

| Part | Where |
|---|---|
| Convert and check the spreadsheet | `scripts/build_data.py` |
| Load the data into DuckDB | `lib/db.ts` |
| Every SQL query | `lib/queries.ts` |
| Read and check filters | `lib/filters.ts` |
| API | `app/api/dashboard` |
| Screen | `components/` |

1. **Prepare.** The script converts types, checks the data and writes a 1.5 MB Parquet file (the spreadsheet is 13 MB). It stops if any total or rule it relies on no longer holds.
2. **Load.** Each server instance reads the Parquet file into an in-memory DuckDB table on its first request, then reuses it.
3. **Query.** One API call runs eight aggregate queries and returns everything the screen needs.
4. **Show.** The unfiltered dashboard is queried at build time and served as a static page, so a first visit needs no server. Filtered views call the API.

## Decisions and trade-offs

**A database, but not a database server.** Every query is a sum or count over many rows and few columns, and nothing is ever written. DuckDB is a column-based SQL engine made for that, and it runs inside the API process. Hosted MySQL or PostgreSQL would work, but would add network delay, credentials, another service to keep awake, and indexes or summary tables to stay fast. In an early test on a laptop, a filtered KPI query took 36 ms in DuckDB. Similar queries in untuned SQLite took 105 to 256 ms. MySQL and PostgreSQL were not measured.

*Cost:* DuckDB adds a large native library to the deployment, and each new server instance loads its own copy of the data. This would be the wrong choice for data that changes often or no longer fits in memory. At that point a hosted analytical database would fit better.

**Aggregate on the server.** Sending all rows to the browser would make filtering instant after loading, but every visitor would download everything. Server queries keep each answer to about 23 KB before compression.

**Next.js for both screen and API.** One project and one deployment. Python is used only for preparing data.

**Cache hard.** Data changes only when a new version is deployed, so API answers are cached on the CDN for a day. The dashboard always writes filters in the same order, so equal views share a cache entry.

**Rules, not an AI model, for insights.** They are instant and free, and each can be checked against the numbers. They describe what happened without claiming why.

**No login.** The app is read-only and meant to be easy to review.

**No raw data download.** I built a streamed CSV export of the filtered rows, then removed it. The site is public, and I was not sure the raw rows may be shared. The API returns totals only.

## Performance

Measured on the live site (Vercel, Mumbai region) from one connection, a few requests each:

| What | Result |
|---|---|
| First paint of the dashboard in a browser | about 1 second |
| Page HTML, compressed | 12 KB |
| Filtered view, first request to a new server (loads the data) | 1.3 s, of which 0.57 s is loading and querying |
| Filtered view, warm server, not cached | 0.22 to 0.42 s, of which 57 to 114 ms is querying |
| Filtered view, cached on the CDN | about 0.1 s |

Returning to an earlier filter is instant, because the browser keeps answers it has loaded. Quick clicks are grouped, and an outdated answer can never replace a newer one. API responses include a `Server-Timing` header with the query time.

## What I found in the data

- **No cleaning was needed.** There are no blanks or duplicate rows, and every bill has one outlet, time, order type and payment.
- **Dates are real Excel dates.** The `####` Excel shows in some cells is a narrow column, not missing data.
- **An order spans several rows,** so orders are counted as distinct bills, never as rows.
- **The first and last months are partial.** Partial weeks and months are drawn as hollow dots, off the trend line, so they don't look like a fall in sales.
- **8,611 dip rows cost 0,** and 591 orders total 0. They are kept.
- **There is one brand** and no region or status column, so those filters are not offered.
- **Weekdays are nearly flat,** while hours have clear lunch and dinner peaks.

## Assumptions

- Revenue is price × quantity. The data has no tax, discount or refund columns.
- The currency is Indian rupees. The file doesn't say, but the outlet names are Bengaluru neighborhoods.
- Times are local outlet times and are never converted.
- With a category or item filter, an order counts if it contains a matching item, and only matching items add revenue.
- Category order counts are not shown, because one order can include several categories and the counts would not add up to the total.

## Tests

The tests check known totals, that parts add up to the whole, filters against separately written SQL, empty results, invalid input and partial periods. Bad filter values get a clear 400 error, and filter values only ever reach SQL as bound parameters.

## With more time

Comparison with a previous period, item pairings within orders, and automated browser tests.
