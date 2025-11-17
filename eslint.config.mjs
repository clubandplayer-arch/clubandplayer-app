// eslint.config.mjs - Flat config per ESLint 9 + Next 15 + TS App Router

import process from "node:process";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const tsRecommendedConfigs = tseslint.configs.recommended.map((config) => {
  const withFiles = config.files
    ? config
    : { ...config, files: ["**/*.{ts,tsx,cts,mts}"] };
  return {
    ...withFiles,
    plugins: { ...(withFiles.plugins ?? {}), "@typescript-eslint": tseslint.plugin },
  };
});

const nextRecommended = {
  ...next.configs.recommended,
  plugins: { "@next/next": next },
};

const nextCoreWebVitals = {
  ...nextRecommended,
  rules: {
    ...nextRecommended.rules,
    ...next.configs["core-web-vitals"].rules,
  },
};

export default [
  // ✅ ignora output e il file di config stesso (già presente nel tuo repo)
  { ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**", "next-env.d.ts", "eslint.config.*"] },

  js.configs.recommended,

  ...tsRecommendedConfigs,

  // ✅ codice TypeScript dell'app
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: process.cwd() },
    },
  },

  // ✅ Next.js rules
  {
    ...nextCoreWebVitals,
    plugins: { "@next/next": next },
  },

  // ✅ React rules
  {
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "off",
    },
  },

  // ✅ regole comuni
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    rules: {
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // ➕ tests: usa il progetto TS dei test
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      parserOptions: { project: "./tests/tsconfig.json", tsconfigRootDir: process.cwd() },
    },
  },

];
