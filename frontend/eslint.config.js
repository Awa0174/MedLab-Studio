import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

const hooksConfig =
  reactHooks.configs.flat?.recommended ?? reactHooks.configs["recommended-latest"];

export default defineConfig([
  globalIgnores([
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
    "src/api/schema.d.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      hooksConfig,
      reactRefresh.configs.vite,
    ],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
]);
