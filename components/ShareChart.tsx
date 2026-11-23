"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import Card from "@/components/Card";
import { percent, rupees, shortRupees } from "@/lib/format";

type Slice = { name: string; revenue: number };

// Colors belong to a name, not a rank, so filtering never recolors a slice.
type Props = { title: string; slices: Slice[]; names: string[] };

export default function ShareChart({ title, slices, names }: Props) {
  const color = (name: string) => `var(--series-${names.indexOf(name) + 1})`;
  const total = slices.reduce((sum, slice) => sum + slice.revenue, 0);
  const share = (slice: Slice) => percent(total ? slice.revenue / total : 0);

  return (
    <Card title={title} className="flex-1">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <PieChart width={200} height={200}>
          <Pie
            data={slices}
            dataKey="revenue"
            nameKey="name"
            innerRadius={62}
            outerRadius={96}
            startAngle={90}
            endAngle={-270}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={color(slice.name)} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              const slice = payload?.[0]?.payload as Slice | undefined;
              if (!active || !slice) return null;
              return (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
                  <p className="font-semibold">{rupees(slice.revenue)}</p>
                  <p className="text-ink-2">{slice.name}, {share(slice)}</p>
                </div>
              );
            }}
          />
        </PieChart>
        <table className="min-w-56 flex-1 text-sm">
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.name}>
                <th scope="row" className="py-1.5 text-left font-normal">
                  <span
                    aria-hidden
                    className="mr-2 inline-block size-3 rounded-sm"
                    style={{ background: color(slice.name) }}
                  />
                  {slice.name}
                </th>
                <td className="py-1.5 text-right text-ink-2 tabular-nums">{shortRupees(slice.revenue)}</td>
                <td className="w-14 py-1.5 text-right font-medium tabular-nums">{share(slice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
