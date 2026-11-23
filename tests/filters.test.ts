import { describe, expect, it } from "vitest";
import { defaultFilters, FilterError, parseFilters, toQuery } from "@/lib/filters";

const parse = (q: string) => parseFilters(new URLSearchParams(q));

describe("filters", () => {
  it("defaults to the full date range and no selections", () => {
    expect(parse("")).toEqual(defaultFilters());
    expect(defaultFilters().from).toBe("2025-06-17");
    expect(defaultFilters().to).toBe("2026-06-16");
    expect(toQuery(defaultFilters())).toBe("");
  });

  it("round-trips every filter", () => {
    const q = "from=2025-07-01&to=2025-07-31&outlet=HSR+Layout&outlet=MG+Road&category=Burgers&type=Delivery&payment=SwiggyPay";
    expect(toQuery(parse(q))).toBe(q);
  });

  it("gives the same query for the same filters in any order, so caching works", () => {
    const a = parse("outlet=MG+Road&outlet=HSR+Layout&outlet=MG+Road&category=Burgers");
    const b = parse("category=Burgers&outlet=HSR+Layout&outlet=MG+Road");
    expect(toQuery(a)).toBe(toQuery(b));
  });

  it.each([
    "outlet=Atlantis",
    "category=burgers'; DROP TABLE sales--",
    "from=yesterday",
    "from=2025-02-31",
    "from=2025-13-01",
    "from=2026-01-01&to=2025-12-31",
  ])("rejects %s", (q) => {
    expect(() => parse(q)).toThrow(FilterError);
  });

  it("limits dates to the range of the data", () => {
    const f = parse("from=2020-01-01&to=2030-01-01");
    expect([f.from, f.to]).toEqual(["2025-06-17", "2026-06-16"]);
  });

  it("rejects a range entirely outside the data", () => {
    expect(() => parse("from=2020-01-01&to=2020-02-01")).toThrow(FilterError);
  });
});
