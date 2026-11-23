"use client";

import { useEffect, useState } from "react";
import type { Dashboard } from "@/lib/queries";

/**
 * Loads the dashboard for a query string. Answers already loaded are kept, so
 * returning to an earlier filter is instant. While a new answer loads, the last
 * one stays on screen.
 */
export function useDashboard(query: string, initial: Dashboard) {
  const [answers, setAnswers] = useState<Record<string, Dashboard>>({ "": initial });
  const [lastQuery, setLastQuery] = useState("");
  const [failure, setFailure] = useState<{ query: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const known = query in answers;

  useEffect(() => {
    if (known) return;
    const controller = new AbortController();
    // A short pause groups quick clicks into one request.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/dashboard?${query}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setAnswers((all) => ({ ...all, [query]: body }));
        setLastQuery(query);
        setFailure(null);
      } catch (error) {
        if (controller.signal.aborted) return; // the filters changed again
        const message = error instanceof Error ? error.message : "Could not load the data.";
        setFailure({ query, message });
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort(); // so an older answer can never replace a newer one
    };
  }, [query, known, attempt]);

  const error = !known && failure?.query === query ? failure.message : null;
  return {
    data: answers[query] ?? answers[lastQuery],
    loading: !known && !error,
    error,
    retry: () => {
      setFailure(null);
      setAttempt((n) => n + 1);
    },
  };
}
