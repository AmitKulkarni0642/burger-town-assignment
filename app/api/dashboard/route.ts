import { FilterError, parseFilters } from "@/lib/filters";
import { getDashboard } from "@/lib/queries";

// The data only changes when a new version is deployed, so the CDN can keep
// each answer for a day. Browsers check again after five minutes.
const CACHE = "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400";

export async function GET(request: Request) {
  try {
    const filters = parseFilters(new URL(request.url).searchParams);
    const started = performance.now();
    const data = await getDashboard(filters);
    const ms = (performance.now() - started).toFixed(1);
    return Response.json(data, {
      headers: { "Cache-Control": CACHE, "Server-Timing": `db;dur=${ms}` },
    });
  } catch (error) {
    if (error instanceof FilterError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Something went wrong loading the data." }, { status: 500 });
  }
}
