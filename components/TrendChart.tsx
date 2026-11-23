"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { Toggle } from "@/components/Card";
import { axisLabel, longDate, monthLabel, number, rupees, shortDate } from "@/lib/format";
import type { Dashboard } from "@/lib/queries";
import { defaultUnit, rollUp, type Point, type Unit } from "@/lib/series";

type Metric = "revenue" | "orders";
type Props = { trend: Dashboard["trend"]; from: string; to: string };

const UNITS: { value: Unit; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];
const METRICS: { value: Metric; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Orders" },
];

function pointName(point: Point, unit: Unit): string {
  const name =
    unit === "month" ? monthLabel(point.key)
    : unit === "week" ? `Week of ${longDate(point.key)}`
    : longDate(point.key);
  return point.partial ? `${name} (partial ${unit})` : name;
}

export default function TrendChart({ trend, from, to }: Props) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [chosenUnit, setUnit] = useState<Unit | null>(null); // null = decide from the date range
  const unit = chosenUnit ?? defaultUnit(from, to);
  const points = rollUp(trend, from, to, unit);
  const hasPartial = points.some((p) => p.partial);
  // Partial periods are drawn as separate dots. Joining them to the line would
  // look like a sudden fall in sales.
  const series = points.map((p) => ({
    ...p,
    full: p.partial ? null : p[metric],
    part: p.partial ? p[metric] : null,
  }));
  const largest = Math.max(...points.map((p) => p[metric]));
  const tick = (n: number) => (metric === "revenue" ? "₹" : "") + axisLabel(n, largest);
  const format = metric === "revenue" ? rupees : number;

  return (
    <Card
      title={`${metric === "revenue" ? "Revenue" : "Orders"} over time`}
      note={hasPartial ? `Hollow points are partial ${unit}s, so they are left off the line.` : undefined}
      action={
        <div className="flex flex-wrap gap-2">
          <Toggle label="Measure" options={METRICS} value={metric} onChange={setMetric} />
          <Toggle label="Group by" options={UNITS} value={unit} onChange={setUnit} />
        </div>
      }
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 288 }}>
          <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="key"
              tickFormatter={unit === "month" ? monthLabel : shortDate}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              minTickGap={32}
            />
            <YAxis
              width={64}
              tickFormatter={tick}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as Point | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
                    <p className="font-semibold">{format(point[metric])}</p>
                    <p className="text-ink-2">{pointName(point, unit)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="linear"
              dataKey="full"
              stroke="var(--series-1)"
              strokeWidth={2}
              fill="var(--series-1)"
              fillOpacity={0.1}
              isAnimationActive={false}
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
              // A single point has no line to draw, so show it as a dot.
              dot={points.filter((p) => !p.partial).length === 1 ? { r: 4, fill: "var(--series-1)" } : false}
            />
            <Area
              dataKey="part"
              stroke="none"
              fill="none"
              isAnimationActive={false}
              activeDot={{ r: 5, fill: "var(--surface)", stroke: "var(--series-1)", strokeWidth: 2 }}
              dot={{ r: 4, fill: "var(--surface)", fillOpacity: 1, stroke: "var(--series-1)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-2">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full tabular-nums">
            <thead className="text-left text-ink-2">
              <tr>
                <th className="py-1 font-medium">Period</th>
                <th className="py-1 text-right font-medium">Revenue</th>
                <th className="py-1 text-right font-medium">Orders</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.key} className="border-t border-line">
                  <td className="py-1">{pointName(point, unit)}</td>
                  <td className="py-1 text-right">{rupees(point.revenue)}</td>
                  <td className="py-1 text-right">{number(point.orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
