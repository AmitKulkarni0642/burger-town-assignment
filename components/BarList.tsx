type Row = { name: string; value: number; label: string; detail: string };
type Props = { rows: Row[]; selected: string[]; onSelect: (name: string) => void };

/** Horizontal bars with their values written out. Clicking one filters by it. */
export default function BarList({ rows, selected, onSelect }: Props) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-1">
      {rows.map((row) => {
        const on = selected.includes(row.name);
        return (
          <li key={row.name}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(row.name)}
              title={`${on ? "Remove filter" : "Filter by"} ${row.name}`}
              className={`group block w-full rounded-md px-2 py-1.5 text-left hover:bg-page ${on ? "bg-accent-soft" : ""}`}
            >
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="mr-2 text-ink-3 max-sm:hidden">{row.detail}</span>
                  <span className="font-medium">{row.label}</span>
                </span>
              </span>
              <span className="mt-1 block h-2">
                <span
                  className="block h-full rounded-r bg-(--series-1) group-hover:opacity-85"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
