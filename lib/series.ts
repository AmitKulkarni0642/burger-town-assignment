// Date helpers. Dates are handled as YYYY-MM-DD text in UTC, so the viewer's
// own timezone can never shift a sale onto a different day.
import type { Dashboard } from "@/lib/queries";

export type Unit = "day" | "week" | "month";
export type Point = { key: string; revenue: number; orders: number; partial: boolean };

const DAY_MS = 86_400_000;
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toText = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (day: string, n: number) => toText(new Date(toDate(day).getTime() + n * DAY_MS));

/** Number of days in a range, counting both ends. */
export const daysBetween = (from: string, to: string) =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS) + 1;

/** 1 = Monday ... 7 = Sunday. */
export const weekday = (day: string) => toDate(day).getUTCDay() || 7;

function bucketStart(day: string, unit: Unit): string {
  if (unit === "week") return addDays(day, 1 - weekday(day));
  if (unit === "month") return `${day.slice(0, 7)}-01`;
  return day;
}

function bucketEnd(start: string, unit: Unit): string {
  if (unit === "week") return addDays(start, 6);
  if (unit === "month") {
    const date = toDate(start);
    return toText(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
  }
  return start;
}

/**
 * Groups daily figures into days, weeks or months. Days without sales count as
 * zero. A week or month the date range only partly covers is marked partial.
 */
export function rollUp(trend: Dashboard["trend"], from: string, to: string, unit: Unit): Point[] {
  const byDay = new Map(trend.map((t) => [t.day, t]));
  const points = new Map<string, Point>();
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const key = bucketStart(day, unit);
    let point = points.get(key);
    if (!point) {
      const partial = key < from || bucketEnd(key, unit) > to;
      point = { key, revenue: 0, orders: 0, partial };
      points.set(key, point);
    }
    point.revenue += byDay.get(day)?.revenue ?? 0;
    point.orders += byDay.get(day)?.orders ?? 0;
  }
  return [...points.values()];
}

/** How many times each weekday occurs in a range. Index 1 = Monday. */
export function weekdayCounts(from: string, to: string): number[] {
  const counts = new Array<number>(8).fill(0);
  for (let day = from; day <= to; day = addDays(day, 1)) counts[weekday(day)] += 1;
  return counts;
}

export function defaultUnit(from: string, to: string): Unit {
  return daysBetween(from, to) <= 62 ? "day" : "week";
}
