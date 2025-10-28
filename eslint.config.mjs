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
  { ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**", "next-env.d.ts"] },

  js.configs.recommended,

  ...tsRecommendedConfigs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: process.cwd() },
    },
  },

  {
    ...nextCoreWebVitals,
    plugins: { "@next/next": next },
  },

  {
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "off",
    },
  },

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
];
