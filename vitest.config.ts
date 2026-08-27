import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone Vitest config — intentionally independent of the Lovable/Vite
// app config so unit tests on the extracted pure logic (dates, zones, pacing,
// aggregations) run fast in a Node environment without DOM/SSR baggage.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});