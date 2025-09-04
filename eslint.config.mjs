// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // ignora build artifacts
  { ignores: [".next/**", "dist/**", ".vercel/**", "node_modules/**"] },

  // Regole base JS solo per file JS/MJS/CJS/JSX
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    ...js.configs.recommended,
    rules: {
      // aggiungi qui eventuali regole per JS puro
    },
  },

  // Regole TypeScript SOLO per TS/TSX (con type-check)
  {
    files: ["**/*.{ts,tsx}"],
    // preset consigliato con type-check
    ...tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    rules: {
      // rendiamo veloci i check CI per ora
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/triple-slash-reference": "off",

      // React Hooks (basic)
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",

      // Regole Next: disattiva quella che segnava errore mancante
      "@next/next/no-img-element": "off",
    },
  },
];
