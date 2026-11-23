import { describe, expect, it } from "vitest";
import { defaultUnit, rollUp, weekdayCounts } from "@/lib/series";
import { buildInsights } from "@/lib/insights";
import { defaultFilters } from "@/lib/filters";
import { getDashboard } from "@/lib/queries";
import { toCsv } from "@/lib/csv";
import { hourLabel, short } from "@/lib/format";
import { GET as exportCsv } from "@/app/api/export/route";
import { GET as dashboard } from "@/app/api/dashboard/route";

describe("rollUp", () => {
  const trend = [
    { day: "2025-06-17", revenue: 100, orders: 1 },
    { day: "2025-06-30", revenue: 50, orders: 2 },
    { day: "2025-07-02", revenue: 10, orders: 1 },
  ];

  it("marks months that are only partly covered", () => {
    expect(rollUp(trend, "2025-06-17", "2025-07-31", "month")).toEqual([
      { key: "2025-06-01", revenue: 150, orders: 3, partial: true },
      { key: "2025-07-01", revenue: 10, orders: 1, partial: false },
    ]);
  });

  it("starts weeks on Monday and marks partial ones", () => {
    const weeks = rollUp(trend, "2025-06-17", "2025-06-29", "week");
    expect(weeks.map((w) => [w.key, w.partial])).toEqual([["2025-06-16", true], ["2025-06-23", false]]);
  });

  it("fills days without sales with zero", () => {
    const days = rollUp(trend, "2025-06-30", "2025-07-02", "day");
    expect(days.map((d) => d.revenue)).toEqual([50, 0, 10]);
    expect(days.some((d) => d.partial)).toBe(false);
  });
});

it("counts weekdays in a range", () => {
  // Tuesday 17 June to Tuesday 24 June 2025
  expect(weekdayCounts("2025-06-17", "2025-06-24").slice(1)).toEqual([1, 2, 1, 1, 1, 1, 1]);
});

it("picks days for short ranges and weeks for long ones", () => {
  expect(defaultUnit("2026-05-18", "2026-06-16")).toBe("day");
  expect(defaultUnit("2025-06-17", "2026-06-16")).toBe("week");
});

it("formats hours and Indian number units", () => {
  expect([0, 11, 12, 20, 24].map(hourLabel)).toEqual(["12 am", "11 am", "12 pm", "8 pm", "12 am"]);
  expect([999, 99_999, 1_500_000, 69_480_952].map(short)).toEqual(["999", "99,999", "15.0 L", "6.95 Cr"]);
});

it("describes the full data correctly", async () => {
  const insights = buildInsights(await getDashboard(defaultFilters()), defaultFilters());
  const text = insights.map((i) => `${i.title}: ${i.detail}`).join("\n");
  expect(text).toContain("Koramangala leads outlets: 24% of revenue, 2.4x MG Road.");
  expect(text).toContain("Burgers and Combos carry the menu: Together they bring in 68% of revenue.");
  expect(text).toContain("Busiest from 7 pm to 10 pm: 36% of orders");
  expect(text).not.toContain("NaN");
});

it("quotes CSV values only when needed", () => {
  expect(toCsv([["a", 'say "hi"', "x,y", 3, null]])).toBe('a,"say ""hi""","x,y",3,\r\n');
});

describe("API", () => {
  it("exports every matching line item", async () => {
    const response = await exportCsv(new Request("http://x/api/export"));
    const lines = (await response.text()).trimEnd().split("\r\n");
    expect(lines).toHaveLength(300_001);
    expect(lines[0]).toBe("bill,datetime,outlet,order_type,payment,category,item,price,quantity,revenue");
  });

  it("survives a cancelled export", async () => {
    const response = await exportCsv(new Request("http://x/api/export"));
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    const after = await dashboard(new Request("http://x/api/dashboard"));
    expect(after.status).toBe(200);
  });

  it.each([dashboard, exportCsv])("answers bad filters with 400", async (GET) => {
    const response = await GET(new Request("http://x/api?outlet=Atlantis"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Outlet "Atlantis" was not found.' });
  });
});
