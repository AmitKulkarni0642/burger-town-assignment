import { describe, expect, it } from "vitest";
import { defaultFilters, type Filters } from "@/lib/filters";
import { getDashboard } from "@/lib/queries";
import { connect } from "@/lib/db";

const withFilters = (f: Partial<Filters>): Filters => ({ ...defaultFilters(), ...f });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

async function scalar(sql: string): Promise<number> {
  const db = await connect();
  try {
    const r = await db.runAndReadAll(sql);
    return Number(r.getRowsJson()[0][0]);
  } finally {
    db.closeSync();
  }
}

describe("unfiltered dashboard", () => {
  it("matches the known totals of the source file", async () => {
    const { kpis } = await getDashboard(defaultFilters());
    expect(kpis.lineItems).toBe(300_000);
    expect(kpis.orders).toBe(110_478);
    expect(kpis.revenue).toBe(69_480_952);
    expect(kpis.units).toBe(434_448);
    expect(kpis.revenuePerOrder).toBeCloseTo(628.91, 2);
  });

  it("has parts that add up to the total", async () => {
    const d = await getDashboard(defaultFilters());
    for (const part of [d.trend, d.byOutlet, d.byCategory, d.byPayment, d.byOrderType]) {
      expect(sum(part.map((x) => x.revenue))).toBe(d.kpis.revenue);
    }
    expect(sum(d.trend.map((x) => x.orders))).toBe(d.kpis.orders);
    expect(sum(d.byOutlet.map((x) => x.orders))).toBe(d.kpis.orders);
    expect(sum(d.heatmap.map((x) => x.orders))).toBe(d.kpis.orders);
    expect(d.trend).toHaveLength(365);
    expect(d.topItems).toHaveLength(10);
    expect(d.topItems[0].name).toBe("Family Feast Combo");
  });
});

describe("filters", () => {
  it("counts only matching items for a category filter", async () => {
    const d = await getDashboard(withFilters({ categories: ["Burgers"] }));
    expect(d.kpis.revenue).toBe(26_907_950);
    expect(d.kpis.units).toBe(146_320);
    expect(d.byCategory.map((c) => c.name)).toEqual(["Burgers"]);
    expect(d.kpis.orders).toBe(
      await scalar("SELECT count(DISTINCT bill) FROM sales WHERE category = 'Burgers'"),
    );
  });

  it("includes the whole last day of a date range", async () => {
    const d = await getDashboard(withFilters({ from: "2026-06-16", to: "2026-06-16" }));
    expect(d.trend.map((t) => t.day)).toEqual(["2026-06-16"]);
    expect(d.kpis.lineItems).toBe(
      await scalar("SELECT count(*) FROM sales WHERE strftime(ts, '%Y-%m-%d') = '2026-06-16'"),
    );
  });

  it("combines filters", async () => {
    const d = await getDashboard(
      withFilters({
        from: "2025-10-01", to: "2025-12-31",
        outlets: ["MG Road", "JP Nagar"], orderTypes: ["Delivery"],
        payments: ["SwiggyPay"], items: ["Coke", "Fanta"],
      }),
    );
    expect(d.kpis.revenue).toBe(
      await scalar(`SELECT sum(price * quantity) FROM sales
        WHERE strftime(ts, '%Y-%m') IN ('2025-10', '2025-11', '2025-12')
        AND outlet IN ('MG Road', 'JP Nagar') AND order_type = 'Delivery'
        AND payment = 'SwiggyPay' AND item IN ('Coke', 'Fanta')`),
    );
    expect(d.kpis.revenue).toBeGreaterThan(0);
  });

  it("returns zeros, not NaN, when nothing matches", async () => {
    const d = await getDashboard(withFilters({ orderTypes: ["Dine-In"], payments: ["SwiggyPay"] }));
    expect(d.kpis).toEqual({ revenue: 0, orders: 0, revenuePerOrder: 0, units: 0, lineItems: 0 });
    expect(d.trend).toEqual([]);
    expect(d.topItems).toEqual([]);
  });

  it("handles several requests at once", async () => {
    const all = await Promise.all(
      ["Burgers", "Sides", "Drinks", "Wraps"].map((c) =>
        getDashboard(withFilters({ categories: [c] })),
      ),
    );
    expect(all.map((d) => d.byCategory[0].name)).toEqual(["Burgers", "Sides", "Drinks", "Wraps"]);
  });
});
