import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // convex-test runs functions in a runtime that matches the deployment's,
    // so a test that passes here is a test that passes there.
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
