import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const strictCoverage =
    process.env.STRICT_COVERAGE === "1" ||
    process.env.STRICT_COVERAGE === "true";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: "./src/tests/setup.ts",
        globals: true,
        css: true,
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            exclude: [
                "**/*.css",
                "**/public/**",
                "**/index.ts",
                "**/types.ts",
                "**/*.d.ts",
            ],
            thresholds: strictCoverage
                ? {
                      statements: 90,
                      lines: 90,
                      functions: 90,
                      branches: 85,
                  }
                : undefined,
        },
    },
});
