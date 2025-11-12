// eslint.config.mjs - Flat config per ESLint 9 + Next 15 + TS App Router
<<<<<<< HEAD
=======

>>>>>>> codex/verify-repository-correctness
import process from "node:process";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const tsRecommendedConfigs = tseslint.configs.recommended.map((config) => {
  const withFiles = config.files
    ? config
<<<<<<< HEAD
    : { ...config, files: ["**/*.{ts,tsx,cts,mts}"] };
  return {
    ...withFiles,
    plugins: { ...(withFiles.plugins ?? {}), "@typescript-eslint": tseslint.plugin },
=======
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
>>>>>>> codex/verify-repository-correctness
  };
});

const nextRecommended = {
  ...next.configs.recommended,
<<<<<<< HEAD
  plugins: { "@next/next": next },
=======
  plugins: {
    "@next/next": next,
  },
>>>>>>> codex/verify-repository-correctness
};

const nextCoreWebVitals = {
  ...nextRecommended,
  rules: {
    ...nextRecommended.rules,
    ...next.configs["core-web-vitals"].rules,
<<<<<<< HEAD
=======
  },
};

export default [
  // ignora build e vendor
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "next-env.d.ts",
    ],
>>>>>>> codex/verify-repository-correctness
  },
};

export default [
  // ignora output e il file di config stesso
  { ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**", "next-env.d.ts", "eslint.config.*"] },

  js.configs.recommended,
  ...tsRecommendedConfigs,

<<<<<<< HEAD
  // codice TypeScript dell'app
=======
  // TypeScript base (senza type-checking pesante)
  ...tsRecommendedConfigs,
>>>>>>> codex/verify-repository-correctness
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: process.cwd() },
    },
  },

<<<<<<< HEAD
  // Next.js rules
=======
  // Next.js core web vitals
  {
    ...nextCoreWebVitals,
    plugins: {
      "@next/next": next,
    },
  },

  // React hooks/refresh
>>>>>>> codex/verify-repository-correctness
  {
    ...nextCoreWebVitals,
    plugins: { "@next/next": next },
  },

  // React rules
  {
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "off",
    },
  },

  // regole comuni
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    rules: {
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
<<<<<<< HEAD
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // tests: usa il progetto TS dei test
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      parserOptions: { project: "./tests/tsconfig.json", tsconfigRootDir: process.cwd() },
    },
  },

  // Playwright config: non cercare un project TS (evita il parsing error)
  {
    files: ["playwright.config.ts"],
    languageOptions: {
      parserOptions: { project: null },
    },
  },

  // ✅ scripts node: dichiara i global necessari (evita i no-undef)
  {
    files: ["scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        URLSearchParams: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
=======
      // Nel codice attuale circolano ancora molti `any` espliciti
      "@typescript-eslint/no-explicit-any": "off",
>>>>>>> codex/verify-repository-correctness
    },
  },
];
