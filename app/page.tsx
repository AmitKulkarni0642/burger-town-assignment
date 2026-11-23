import DashboardView from "@/components/DashboardView";
import { defaultFilters } from "@/lib/filters";
import { getDashboard } from "@/lib/queries";

// The unfiltered dashboard is queried once at build time and served as a static
// page, so a first visit never waits for a server to start.
export const dynamic = "force-static";

export default async function Page() {
  return <DashboardView initial={await getDashboard(defaultFilters())} />;
}
