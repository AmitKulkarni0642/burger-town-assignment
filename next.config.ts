import type { NextConfig } from "next";

// The data file is read at runtime, so it has to be shipped with the server code.
// On Linux, DuckDB also needs a shared library that file tracing can miss.
const runtimeFiles = ["./data/**/*", "./node_modules/@duckdb/node-bindings-linux-x64/**/*"];

const nextConfig: NextConfig = {
  // DuckDB ships a native binary, so it must be loaded by Node, not bundled.
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
  outputFileTracingIncludes: {
    "/api/*": runtimeFiles,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
