import { FilterError, parseFilters, type Filters } from "@/lib/filters";
import { EXPORT_COLUMNS, exportRows } from "@/lib/queries";
import { toCsv } from "@/lib/csv";

// Streams the matching line items as CSV, batch by batch. Streaming keeps memory
// low and avoids the size limit on ordinary serverless responses.
export async function GET(request: Request) {
  let filters: Filters;
  try {
    filters = parseFilters(new URL(request.url).searchParams);
  } catch (error) {
    const message = error instanceof FilterError ? error.message : "Invalid request.";
    return Response.json({ error: message }, { status: 400 });
  }

  const batches = exportRows(filters);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(toCsv([EXPORT_COLUMNS])));
    },
    async pull(controller) {
      try {
        const { value, done } = await batches.next();
        if (done) controller.close();
        else controller.enqueue(encoder.encode(toCsv(value)));
      } catch (error) {
        console.error(error);
        controller.error(error);
      }
    },
    async cancel() {
      await batches.return(undefined);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales_${filters.from}_to_${filters.to}.csv"`,
    },
  });
}
