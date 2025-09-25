// ESLint v9 Flat Config
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importX from 'eslint-plugin-import-x';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  // Ignora build e asset
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'public/**',
      '**/*.min.*',
    ],
  },

  // Regole generali (JS/TS) + React Hooks + Next + Imports
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'import-x': importX,
      '@next/next': nextPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Next.js (App Router-friendly)
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'warn',

      // Imports
      'import-x/order': ['warn', { 'newlines-between': 'always' }],
      'import-x/no-duplicates': 'warn',

      // Varie
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },

  // Regole TypeScript (senza project: per velocità in CI)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // project: './tsconfig.json', // abilita se vuoi le regole type-checked
        ecmaVersion: 2023,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Disattiva tutto ciò che confligge con Prettier
  prettier,
];
