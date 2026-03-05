import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    root: ".",
    include: ["src/renderer/src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist", "out"],
    setupFiles: ["./src/renderer/src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/renderer/src/**/*.{ts,vue}"],
      exclude: [
        "src/renderer/src/**/*.{test,spec}.ts",
        "src/renderer/src/__tests__/**",
        "src/renderer/src/types/**",
      ],
    },
  },
});
