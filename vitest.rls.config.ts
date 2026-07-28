import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "rls",
    include: ["src/**/rls.test.ts", "src/**/*.rls.test.ts"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
