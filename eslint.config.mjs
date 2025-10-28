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
    : {
        ...config,
        files: ["**/*.{ts,tsx,cts,mts}"],
      };

  return {
    ...withFiles,
    plugins: {
      ...(withFiles.plugins ?? {}),
      "@typescript-eslint": tseslint.plugin,
    },
  };
});

const nextRecommended = {
  ...next.configs.recommended,
  plugins: {
    "@next/next": next,
  },
};

const nextCoreWebVitals = {
  ...nextRecommended,
  rules: {
    ...nextRecommended.rules,
    ...next.configs["core-web-vitals"].rules,
  },
};

export default [
  // ignora build e vendor
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**"],
  },

  // base JS recommended
  js.configs.recommended,

  // TypeScript base (senza type-checking pesante)
  ...tsRecommendedConfigs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
      },
    },
  },

  // Next.js core web vitals
  {
    ...nextCoreWebVitals,
    plugins: {
      "@next/next": next,
    },
  },

  // React hooks/refresh
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "off",
    },
  },

  // Aggiusta qualche regoletta comune del tuo repo (facoltative)
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    rules: {
      // Evita false positive con try/catch “vuoti” che abbiamo commentato
      "no-empty": ["error", { "allowEmptyCatch": true }],
      // Preferisci la variante TS per unused vars; ignora underscores
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // Nel codice attuale circolano ancora molti `any` espliciti
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
