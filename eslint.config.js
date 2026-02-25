import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores(["dist", "coverage/**"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
    },
    {
        files: ["src/tests/**/*.test.{ts,tsx}"],
        rules: {
            "no-restricted-globals": [
                "error",
                {
                    name: "describe",
                    message:
                        "Import describe from vitest instead of using globals.",
                },
                {
                    name: "it",
                    message: "Import it from vitest instead of using globals.",
                },
                {
                    name: "test",
                    message:
                        "Import test from vitest instead of using globals.",
                },
                {
                    name: "expect",
                    message:
                        "Import expect from vitest instead of using globals.",
                },
                {
                    name: "vi",
                    message: "Import vi from vitest instead of using globals.",
                },
                {
                    name: "beforeAll",
                    message:
                        "Import beforeAll from vitest instead of using globals.",
                },
                {
                    name: "afterAll",
                    message:
                        "Import afterAll from vitest instead of using globals.",
                },
                {
                    name: "beforeEach",
                    message:
                        "Import beforeEach from vitest instead of using globals.",
                },
                {
                    name: "afterEach",
                    message:
                        "Import afterEach from vitest instead of using globals.",
                },
            ],
        },
    },
    {
        files: ["src/components/Render/Render.tsx"],
        rules: {
            "react-refresh/only-export-components": "off",
        },
    },
]);
