import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB ships a native binary, so it must be loaded by Node, not bundled.
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
  // The data file is read at runtime, so it has to be shipped with the server code.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*"],
    "/api/*": ["./data/**/*"],
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
