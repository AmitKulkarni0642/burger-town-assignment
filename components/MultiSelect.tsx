"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

/** A button that opens a list of checkboxes. Nothing ticked means "all". */
export default function MultiSelect({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (option: string) =>
    onChange(
      selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option],
    );

  const summary =
    selected.length === 0 ? "All" : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  const visible = options.filter((o) => o.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-sm ${
          selected.length > 0 ? "border-accent bg-accent-soft" : "border-line bg-surface"
        }`}
      >
        <span className="text-ink-2">{label}</span>
        <span className="truncate font-medium">{summary}</span>
        <span aria-hidden className="ml-auto text-ink-3">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-2 shadow-lg">
          {options.length > 10 && (
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}s`}
              aria-label={`Search ${label.toLowerCase()}s`}
              className="mb-2 h-9 w-full rounded-md border border-line bg-page px-2 text-sm"
            />
          )}
          <div role="group" aria-label={label} className="max-h-64 overflow-y-auto">
            {visible.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-page"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="size-4 accent-(--accent)"
                />
                {option}
              </label>
            ))}
            {visible.length === 0 && <p className="px-2 py-1.5 text-sm text-ink-3">No matches</p>}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm text-accent hover:bg-page"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
