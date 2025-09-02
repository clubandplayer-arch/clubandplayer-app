// eslint.config.mjs - Flat config per ESLint 9 + Next 15 + TS App Router

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // ignora build e vendor
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**"],
  },

  // base JS recommended
  js.configs.recommended,

  // TypeScript (con type-checking: richiede tsconfig.json)
  ...tseslint.configs.recommendedTypeChecked,
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
  next.configs["core-web-vitals"],

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
    rules: {
      // Evita false positive con try/catch “vuoti” che abbiamo commentato
      "no-empty": ["error", { "allowEmptyCatch": true }],
      // Preferisci la variante TS per unused vars; ignora underscores
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
];
