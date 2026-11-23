// Filters are shared by the browser and the API. They live in the URL, so a
// filtered view can be bookmarked, shared and cached.
import meta from "@/data/meta.json";

export type Filters = {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  outlets: string[];
  categories: string[];
  items: string[];
  orderTypes: string[];
  payments: string[];
};

export type ListKey = Exclude<keyof Filters, "from" | "to">;

/** Each multi-select filter: its URL name and the only values it accepts. */
export const LIST_FILTERS: { key: ListKey; param: string; label: string; options: string[] }[] = [
  { key: "outlets", param: "outlet", label: "Outlet", options: meta.outlets },
  { key: "categories", param: "category", label: "Category", options: meta.categories },
  { key: "items", param: "item", label: "Item", options: meta.items.map((i) => i.name) },
  { key: "orderTypes", param: "type", label: "Order type", options: meta.orderTypes },
  { key: "payments", param: "payment", label: "Payment", options: meta.payments },
];

/** A problem with the user's input, shown to them as is. */
export class FilterError extends Error {}

export function defaultFilters(): Filters {
  return {
    from: meta.minDate,
    to: meta.maxDate,
    outlets: [],
    categories: [],
    items: [],
    orderTypes: [],
    payments: [],
  };
}

function checkDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const isReal =
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value); // rejects 2025-02-31
  if (!isReal) throw new FilterError(`"${value}" is not a valid date.`);
  return value;
}

/** Reads filters from a query string. Throws FilterError on anything unexpected. */
export function parseFilters(params: URLSearchParams): Filters {
  const filters = defaultFilters();

  // Dates in YYYY-MM-DD form sort correctly as plain text.
  const from = checkDate(params.get("from") ?? meta.minDate);
  const to = checkDate(params.get("to") ?? meta.maxDate);
  if (from > to) throw new FilterError("The start date is after the end date.");
  if (from > meta.maxDate || to < meta.minDate) {
    throw new FilterError(`Data is available from ${meta.minDate} to ${meta.maxDate}.`);
  }
  filters.from = from < meta.minDate ? meta.minDate : from;
  filters.to = to > meta.maxDate ? meta.maxDate : to;

  for (const { key, param, label, options } of LIST_FILTERS) {
    const chosen = new Set(params.getAll(param));
    for (const value of chosen) {
      if (!options.includes(value)) throw new FilterError(`${label} "${value}" was not found.`);
    }
    filters[key] = options.filter((option) => chosen.has(option));
  }
  return filters;
}

/** Writes filters as a query string, always in the same order. Defaults are left out. */
export function toQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.from !== meta.minDate) params.set("from", filters.from);
  if (filters.to !== meta.maxDate) params.set("to", filters.to);
  for (const { key, param, options } of LIST_FILTERS) {
    for (const option of options) {
      if (filters[key].includes(option)) params.append(param, option);
    }
  }
  return params.toString();
}
