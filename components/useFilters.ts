"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { defaultFilters, FilterError, parseFilters, toQuery, type Filters } from "@/lib/filters";

// The URL is the single place filters are stored. React re-reads it whenever we
// change it or the user presses Back or Forward.
const CHANGED = "filters-changed";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function useFilters() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "", // on the server there is no URL state: show the default view
  );

  const { filters, problem } = useMemo(() => {
    try {
      return { filters: parseFilters(new URLSearchParams(search)), problem: null };
    } catch (error) {
      if (!(error instanceof FilterError)) throw error;
      return { filters: defaultFilters(), problem: error.message };
    }
  }, [search]);

  const setFilters = useCallback((next: Filters) => {
    const query = toQuery(next);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  return { filters, problem, setFilters };
}
