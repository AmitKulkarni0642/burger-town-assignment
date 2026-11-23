// Plain-language observations, calculated from the numbers on screen. They use
// fixed rules rather than an AI model, so each one can be checked, and they
// describe what happened without claiming why.
import type { Dashboard } from "@/lib/queries";
import type { Filters } from "@/lib/filters";
import { hourLabel, percent, rupees, shortDate } from "@/lib/format";
import { addDays, daysBetween } from "@/lib/series";

export type Insight = { title: string; detail: string };

const PERIOD = 30; // days compared on each side
const STEADY = 0.02; // changes smaller than 2% are called steady

export function buildInsights(d: Dashboard, filters: Filters): Insight[] {
  const insights: Insight[] = [];
  const total = d.kpis.revenue;
  if (total === 0) return insights;

  const change = recentChange(d, filters);
  if (change) insights.push(change);

  if (d.byOutlet.length > 1) {
    const top = d.byOutlet[0];
    const last = d.byOutlet[d.byOutlet.length - 1];
    const ratio = last.revenue > 0 ? `, ${(top.revenue / last.revenue).toFixed(1)}x ${last.name}` : "";
    insights.push({
      title: `${top.name} leads outlets`,
      detail: `${percent(top.revenue / total)} of revenue${ratio}.`,
    });
  }

  if (d.byCategory.length > 2) {
    const [a, b] = d.byCategory;
    insights.push({
      title: `${a.name} and ${b.name} carry the menu`,
      detail: `Together they bring in ${percent((a.revenue + b.revenue) / total)} of revenue.`,
    });
  }

  const peak = busiestHours(d);
  if (peak) insights.push(peak);

  if (d.byOrderType.length > 1) {
    const top = d.byOrderType[0];
    insights.push({
      title: `${top.name} is the largest order type`,
      detail: `${percent(top.revenue / total)} of revenue.`,
    });
  }
  return insights;
}

/** Last 30 days of the range against the 30 days before. Needs 60 days. */
function recentChange(d: Dashboard, { from, to }: Filters): Insight | null {
  if (daysBetween(from, to) < PERIOD * 2) return null;
  const start = addDays(to, 1 - PERIOD);
  const previousStart = addDays(start, -PERIOD);
  let recent = 0;
  let previous = 0;
  for (const { day, revenue } of d.trend) {
    if (day >= start) recent += revenue;
    else if (day >= previousStart) previous += revenue;
  }
  if (previous === 0) return null;

  const change = recent / previous - 1;
  const detail = `${rupees(recent)} from ${shortDate(start)} to ${shortDate(to)}, against ${rupees(previous)} in the 30 days before.`;
  if (Math.abs(change) < STEADY) return { title: "Recent revenue is steady", detail };
  const direction = change > 0 ? "up" : "down";
  return { title: `Recent revenue is ${direction} ${percent(Math.abs(change))}`, detail };
}

/** The three hours in a row with the most orders. */
function busiestHours(d: Dashboard): Insight | null {
  const hours = new Array<number>(24).fill(0);
  for (const { hour, orders } of d.heatmap) hours[hour] += orders;
  const windowSum = (h: number) => hours[h] + hours[h + 1] + hours[h + 2];

  let best = 0;
  for (let h = 1; h <= 21; h++) if (windowSum(h) > windowSum(best)) best = h;
  if (d.kpis.orders === 0) return null;
  return {
    title: `Busiest from ${hourLabel(best)} to ${hourLabel(best + 3)}`,
    detail: `${percent(windowSum(best) / d.kpis.orders)} of orders arrive in these three hours.`,
  };
}
