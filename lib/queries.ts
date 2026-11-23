// Every SQL query in the app lives here.
//
// Two rules apply throughout:
//   revenue = price * quantity
//   orders  = distinct bills, because one order spans several rows
import { connect } from "@/lib/db";
import type { Filters } from "@/lib/filters";

export type Dashboard = {
  kpis: { revenue: number; orders: number; revenuePerOrder: number; units: number; lineItems: number };
  trend: { day: string; revenue: number; orders: number }[];
  byOutlet: { name: string; revenue: number; orders: number }[];
  byCategory: { name: string; revenue: number; units: number }[];
  byOrderType: { name: string; revenue: number }[];
  byPayment: { name: string; revenue: number }[];
  topItems: { name: string; category: string; revenue: number; units: number }[];
  heatmap: { weekday: number; hour: number; orders: number }[]; // weekday: 1 = Monday
};

type Params = Record<string, string>;

/** Turns filters into a WHERE clause. User values are only ever passed as parameters. */
export function where(filters: Filters): { sql: string; params: Params } {
  const params: Params = { from: filters.from, to: filters.to };
  // "Before the day after `to`" keeps the whole of the last day.
  const parts = ["ts >= $from::DATE", "ts < $to::DATE + INTERVAL 1 DAY"];

  const lists: [column: string, values: string[]][] = [
    ["outlet", filters.outlets],
    ["category", filters.categories],
    ["item", filters.items],
    ["order_type", filters.orderTypes],
    ["payment", filters.payments],
  ];
  for (const [column, values] of lists) {
    if (values.length === 0) continue;
    const names = values.map((value, i) => {
      params[`${column}${i}`] = value;
      return `$${column}${i}`;
    });
    parts.push(`${column} IN (${names.join(", ")})`);
  }
  return { sql: parts.join(" AND "), params };
}

// Numbers are cast to DOUBLE or INTEGER because DuckDB's BIGINT is not a plain JS number.
const REVENUE = "sum(price * quantity)::DOUBLE AS revenue";
const ORDERS = "count(DISTINCT bill)::INTEGER AS orders";
const UNITS = "sum(quantity)::INTEGER AS units";

export async function getDashboard(filters: Filters): Promise<Dashboard> {
  const { sql: match, params } = where(filters);
  const db = await connect();

  async function rows<T>(sql: string): Promise<T[]> {
    const result = await db.runAndReadAll(sql, params);
    return result.getRowObjectsJson() as T[];
  }

  try {
    const [totals] = await rows<Omit<Dashboard["kpis"], "revenuePerOrder">>(`
      SELECT coalesce(sum(price * quantity), 0)::DOUBLE AS revenue,
             ${ORDERS},
             coalesce(sum(quantity), 0)::INTEGER AS units,
             count(*)::INTEGER AS "lineItems"
      FROM sales WHERE ${match}`);

    return {
      kpis: {
        ...totals,
        revenuePerOrder: totals.orders === 0 ? 0 : totals.revenue / totals.orders,
      },
      trend: await rows(`
        SELECT strftime(ts, '%Y-%m-%d') AS day, ${REVENUE}, ${ORDERS}
        FROM sales WHERE ${match} GROUP BY day ORDER BY day`),
      byOutlet: await rows(`
        SELECT outlet AS name, ${REVENUE}, ${ORDERS}
        FROM sales WHERE ${match} GROUP BY outlet ORDER BY revenue DESC, name`),
      byCategory: await rows(`
        SELECT category AS name, ${REVENUE}, ${UNITS}
        FROM sales WHERE ${match} GROUP BY category ORDER BY revenue DESC, name`),
      byOrderType: await rows(`
        SELECT order_type AS name, ${REVENUE}
        FROM sales WHERE ${match} GROUP BY order_type ORDER BY revenue DESC, name`),
      byPayment: await rows(`
        SELECT payment AS name, ${REVENUE}
        FROM sales WHERE ${match} GROUP BY payment ORDER BY revenue DESC, name`),
      topItems: await rows(`
        SELECT item AS name, category, ${REVENUE}, ${UNITS}
        FROM sales WHERE ${match} GROUP BY item, category ORDER BY revenue DESC, name LIMIT 10`),
      heatmap: await rows(`
        SELECT isodow(ts)::INTEGER AS weekday, hour(ts)::INTEGER AS hour, ${ORDERS}
        FROM sales WHERE ${match} GROUP BY weekday, hour ORDER BY weekday, hour`),
    };
  } finally {
    db.closeSync();
  }
}

export const EXPORT_COLUMNS = [
  "bill", "datetime", "outlet", "order_type", "payment",
  "category", "item", "price", "quantity", "revenue",
];

/** Reads matching line items in batches, so a large export never sits in memory at once. */
export async function* exportRows(filters: Filters): AsyncGenerator<unknown[][]> {
  const { sql: match, params } = where(filters);
  const db = await connect();
  try {
    const result = await db.stream(
      `SELECT bill, strftime(ts, '%Y-%m-%d %H:%M:%S'), outlet, order_type, payment,
              category, item, price, quantity, price * quantity
       FROM sales WHERE ${match} ORDER BY ts, bill, item`,
      params,
    );
    try {
      for await (const batch of result.yieldRowsJson()) yield batch;
    } finally {
      result.closeSync(); // also runs if the download is cancelled
    }
  } finally {
    db.closeSync();
  }
}
