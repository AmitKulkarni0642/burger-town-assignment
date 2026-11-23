import type { ReactNode } from "react";

type Props = { title: string; note?: ReactNode; action?: ReactNode; className?: string; children: ReactNode };

export default function Card({ title, note, action, className = "", children }: Props) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {note && <p className="mt-0.5 text-sm text-ink-2">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type ToggleProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A small row of buttons where exactly one is selected. */
export function Toggle<T extends string>({ label, options, value, onChange }: ToggleProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-line p-0.5 text-sm">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 ${
            option.value === value ? "bg-accent-soft font-medium text-ink" : "text-ink-2 hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
