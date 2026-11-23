// One in-memory DuckDB per server instance. The Parquet file is loaded the first
// time it is needed, then reused by every request that instance handles.
import path from "node:path";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";

const FILE = path.join(process.cwd(), "data", "sales.parquet").replaceAll("'", "''");
const SOURCE = `read_parquet('${FILE}')`;
const TEXT_COLUMNS = ["outlet", "category", "item", "order_type", "payment"];

async function load(): Promise<DuckDBInstance> {
  const instance = await DuckDBInstance.create(":memory:");
  const db = await instance.connect();
  try {
    // ENUM stores repeated text (such as outlet names) as small numbers.
    for (const column of TEXT_COLUMNS) {
      await db.run(
        `CREATE TYPE ${column}_t AS ENUM (SELECT DISTINCT ${column} FROM ${SOURCE} ORDER BY 1)`,
      );
    }
    const casts = TEXT_COLUMNS.map((c) => `${c}::${c}_t AS ${c}`).join(", ");
    await db.run(`CREATE TABLE sales AS SELECT * REPLACE (${casts}) FROM ${SOURCE}`);
  } finally {
    db.closeSync();
  }
  return instance;
}

// Kept on globalThis so development hot reloads don't load the data again.
const store = globalThis as { salesDb?: Promise<DuckDBInstance> };

/** Opens a connection. The caller must close it. */
export async function connect(): Promise<DuckDBConnection> {
  store.salesDb ??= load().catch((error) => {
    store.salesDb = undefined; // allow the next request to try again
    throw error;
  });
  return (await store.salesDb).connect();
}
