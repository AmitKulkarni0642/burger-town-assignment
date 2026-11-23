"use client";

import BarList from "@/components/BarList";
import Card from "@/components/Card";
import FilterBar, { withList } from "@/components/FilterBar";
import Heatmap from "@/components/Heatmap";
import ShareChart from "@/components/ShareChart";
import TrendChart from "@/components/TrendChart";
import { useDashboard } from "@/components/useDashboard";
import { useFilters } from "@/components/useFilters";
import meta from "@/data/meta.json";
import { defaultFilters, toQuery, type ListKey } from "@/lib/filters";
import { longDate, number, percent, rupees, shortRupees } from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import type { Dashboard } from "@/lib/queries";

export default function DashboardView({ initial }: { initial: Dashboard }) {
  const { filters, problem, setFilters } = useFilters();
  const query = toQuery(filters);
  const { data, loading, error, retry } = useDashboard(query, initial);

  const toggle = (key: ListKey, name: string) => {
    const now = filters[key];
    const next = now.includes(name) ? now.filter((n) => n !== name) : [...now, name];
    setFilters(withList(filters, key, next));
  };

  const { kpis } = data;
  const share = (revenue: number) => percent(kpis.revenue ? revenue / kpis.revenue : 0);
  const itemsOnly = filters.categories.length > 0 || filters.items.length > 0;
  const insights = buildInsights(data, filters);

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Burger Town sales</h1>
          <p className="text-sm text-ink-2">{longDate(filters.from)} to {longDate(filters.to)}</p>
        </div>
        <a
          href={`/api/export${query ? `?${query}` : ""}`}
          download
          className="flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:border-accent"
        >
          Export CSV
        </a>
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      {problem && (
        <p role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          <span className="font-medium text-danger">This link has a filter problem.</span> {problem} Showing all data instead.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          <span className="font-medium text-danger">Could not update.</span> {error} Showing the previous results.{" "}
          <button type="button" onClick={retry} className="font-medium text-accent underline">Try again</button>
        </p>
      )}

      <div aria-busy={loading} className={`space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi className="max-lg:col-span-2" label="Revenue" value={shortRupees(kpis.revenue)} detail={rupees(kpis.revenue)} />
          <Kpi label="Orders" value={number(kpis.orders)} detail={itemsOnly ? "with a matching item" : "distinct bills"} />
          <Kpi label="Revenue per order" value={rupees(kpis.revenuePerOrder)} detail={itemsOnly ? "matching items only" : "average order value"} />
          <Kpi label="Units sold" value={number(kpis.units)} detail="items across all orders" />
          <Kpi label="Line items" value={number(kpis.lineItems)} detail="total records" />
        </dl>

        {kpis.lineItems === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-10 text-center">
            <p className="font-medium">No sales match these filters</p>
            <button type="button" onClick={() => setFilters(defaultFilters())} className="mt-2 text-sm font-medium text-accent">
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                <TrendChart trend={data.trend} from={filters.from} to={filters.to} />
              </div>
              <Card title="Insights" note="Calculated from the current view">
                <ul className="space-y-3">
                  {insights.map((insight) => (
                    <li key={insight.title} className="text-sm">
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-ink-2">{insight.detail}</p>
                    </li>
                  ))}
                </ul>
                {insights.length === 0 && <p className="text-sm text-ink-2">Nothing stands out in this view.</p>}
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Revenue by outlet" note="Select a bar to filter">
                <BarList
                  selected={filters.outlets}
                  onSelect={(name) => toggle("outlets", name)}
                  rows={data.byOutlet.map((o) => ({
                    name: o.name, value: o.revenue, label: shortRupees(o.revenue),
                    detail: `${number(o.orders)} orders, ${share(o.revenue)}`,
                  }))}
                />
              </Card>
              <Card title="Revenue by category" note="Select a bar to filter">
                <BarList
                  selected={filters.categories}
                  onSelect={(name) => toggle("categories", name)}
                  rows={data.byCategory.map((c) => ({
                    name: c.name, value: c.revenue, label: shortRupees(c.revenue),
                    detail: `${number(c.units)} units, ${share(c.revenue)}`,
                  }))}
                />
              </Card>
              <Card title="Top items by revenue" note="Select a bar to filter">
                <BarList
                  selected={filters.items}
                  onSelect={(name) => toggle("items", name)}
                  rows={data.topItems.map((i) => ({
                    name: i.name, value: i.revenue, label: shortRupees(i.revenue),
                    detail: `${number(i.units)} units`,
                  }))}
                />
              </Card>
              <div className="flex min-w-0 flex-col gap-4">
                <ShareChart title="Revenue by payment" slices={data.byPayment} names={meta.payments} />
                <ShareChart title="Revenue by order type" slices={data.byOrderType} names={meta.orderTypes} />
              </div>
            </div>

            <Heatmap heatmap={data.heatmap} from={filters.from} to={filters.to} />
          </>
        )}
      </div>

      <footer className="pb-4 text-xs text-ink-3">
        Revenue is price × quantity, in rupees. 1 L (lakh) = 1,00,000 and 1 Cr (crore) = 1,00,00,000.
      </footer>
    </main>
  );
}

function Kpi({ label, value, detail, className = "" }: { label: string; value: string; detail: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
      <dd className="text-xs text-ink-3">{detail}</dd>
    </div>
  );
}
