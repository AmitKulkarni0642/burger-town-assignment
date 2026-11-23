"use client";

import { useState } from "react";
import Card from "@/components/Card";
import { hourLabel } from "@/lib/format";
import type { Dashboard } from "@/lib/queries";
import { weekdayCounts } from "@/lib/series";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 13 }, (_, i) => 11 + i); // outlets sell from 11 am to midnight

type Props = { heatmap: Dashboard["heatmap"]; from: string; to: string };

/**
 * Average orders for each weekday and hour. Averages are used because a date
 * range can contain more of one weekday than another.
 */
export default function Heatmap({ heatmap, from, to }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const occurrences = weekdayCounts(from, to);
  const totals = new Map(heatmap.map((c) => [`${c.weekday}-${c.hour}`, c.orders]));
  const average = (day: number, hour: number) =>
    occurrences[day] ? (totals.get(`${day}-${hour}`) ?? 0) / occurrences[day] : 0;
  const max = Math.max(...DAYS.flatMap((_, i) => HOURS.map((h) => average(i + 1, h))), 0.01);

  return (
    <Card
      title="When orders arrive"
      note={<span aria-live="off">{hovered ?? "Average orders in each hour. Stronger color means more orders."}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <th className="w-10" />
              {HOURS.map((hour) => (
                <th key={hour} scope="col" className="pb-1 font-normal text-ink-3">{hourLabel(hour)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((name, i) => (
              <tr key={name}>
                <th scope="row" className="pr-2 text-left font-normal text-ink-2">{name.slice(0, 3)}</th>
                {HOURS.map((hour) => {
                  const value = average(i + 1, hour);
                  const text = `${name}, ${hourLabel(hour)}: ${value.toFixed(1)} orders on average`;
                  return (
                    <td
                      key={hour}
                      onPointerEnter={() => setHovered(text)}
                      onPointerLeave={() => setHovered(null)}
                      className="relative h-8 rounded-sm hover:outline-2 hover:outline-ink"
                      style={{
                        background: `color-mix(in oklab, var(--heat-high) ${Math.round((value / max) * 100)}%, var(--heat-low))`,
                      }}
                    >
                      <span className="sr-only">{value.toFixed(1)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
        <span>0</span>
        <span
          aria-hidden
          className="h-2 w-32 rounded-full"
          style={{ background: "linear-gradient(in oklab to right, var(--heat-low), var(--heat-high))" }}
        />
        <span>{max.toFixed(1)} orders an hour</span>
      </div>
    </Card>
  );
}
