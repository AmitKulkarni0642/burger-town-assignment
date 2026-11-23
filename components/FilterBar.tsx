"use client";

import { useState } from "react";
import MultiSelect from "@/components/MultiSelect";
import meta from "@/data/meta.json";
import { defaultFilters, LIST_FILTERS, toQuery, type Filters, type ListKey } from "@/lib/filters";
import { addDays } from "@/lib/series";

type Props = { filters: Filters; onChange: (filters: Filters) => void };

const PRESETS = [
  { label: "Full year", from: meta.minDate },
  { label: "Last 90 days", from: addDays(meta.maxDate, -89) },
  { label: "Last 30 days", from: addDays(meta.maxDate, -29) },
  { label: "Last 7 days", from: addDays(meta.maxDate, -6) },
];

const field = "h-10 rounded-lg border border-line bg-surface px-2 text-sm";

/** Categories limit which items can be picked, so the two can't contradict each other. */
function itemsIn(categories: string[]): string[] {
  return meta.items
    .filter((i) => categories.length === 0 || categories.includes(i.category))
    .map((i) => i.name);
}

export function withList(filters: Filters, key: ListKey, values: string[]): Filters {
  const next = { ...filters, [key]: values };
  if (key === "categories") {
    const allowed = itemsIn(values);
    next.items = next.items.filter((item) => allowed.includes(item));
  }
  return next;
}

export default function FilterBar({ filters, onChange }: Props) {
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const active = LIST_FILTERS.filter(({ key }) => filters[key].length > 0).length;
  const preset =
    filters.to === meta.maxDate ? PRESETS.find((p) => p.from === filters.from)?.label : undefined;

  const setDate = (key: "from" | "to", value: string) => {
    if (!value || value < meta.minDate || value > meta.maxDate) return; // still being typed
    const next = { ...filters, [key]: value };
    // Keep the range valid by moving the other end along.
    if (next.from > next.to) next[key === "from" ? "to" : "from"] = value;
    onChange(next);
  };

  return (
    <section aria-label="Filters" className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Date range preset"
        value={preset ?? "Custom"}
        onChange={(e) => {
          const chosen = PRESETS.find((p) => p.label === e.target.value);
          if (chosen) onChange({ ...filters, from: chosen.from, to: meta.maxDate });
        }}
        className={`${field} max-sm:w-full`}
      >
        {PRESETS.map((p) => (
          <option key={p.label}>{p.label}</option>
        ))}
        <option disabled>Custom</option>
      </select>
      <div className="flex items-center gap-2 max-sm:w-full">
        {(["from", "to"] as const).map((key) => (
          <input
            // The key resets the box when the range changes elsewhere.
            key={`${key}-${filters[key]}`}
            type="date"
            aria-label={key === "from" ? "From date" : "To date"}
            min={meta.minDate}
            max={meta.maxDate}
            defaultValue={filters[key]}
            onChange={(e) => setDate(key, e.target.value)}
            className={`${field} max-sm:min-w-0 max-sm:flex-1`}
          />
        ))}
      </div>

      <button
        type="button"
        aria-expanded={openOnPhone}
        onClick={() => setOpenOnPhone(!openOnPhone)}
        className={`${field} w-full px-3 text-left sm:hidden`}
      >
        {openOnPhone ? "Hide filters" : `More filters${active ? ` (${active} active)` : ""}`}
      </button>
      <div className={`${openOnPhone ? "grid w-full gap-2" : "hidden"} sm:contents`}>
        {LIST_FILTERS.map(({ key, label, options }) => (
          <MultiSelect
            key={key}
            label={label}
            options={key === "items" ? itemsIn(filters.categories) : options}
            selected={filters[key]}
            onChange={(values) => onChange(withList(filters, key, values))}
          />
        ))}
      </div>

      {toQuery(filters) !== "" && (
        <button
          type="button"
          onClick={() => onChange(defaultFilters())}
          className="h-10 rounded-lg px-3 text-sm font-medium text-accent hover:bg-surface"
        >
          Reset
        </button>
      )}
    </section>
  );
}
