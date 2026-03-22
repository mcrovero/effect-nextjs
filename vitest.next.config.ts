import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./integration/**/*.test.ts"],
    fileParallelism: false,
    globals: true,
    hookTimeout: 180_000,
    testTimeout: 180_000
  }
})
