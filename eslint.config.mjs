// eslint.config.mjs
// ESLint v9 flat config – Next 15, TypeScript, React 19, Playwright

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Ignori globali
  {
    ignores: [
      'node_modules/',
      '.next/',
      'dist/',
      'build/',
      'out/',
      'coverage/',
      '.vercel/',
      'test-results/',
      'playwright-report/',
      'next-env.d.ts',
      '**/*.d.ts',
    ],
  },

  // Base JS
  js.configs.recommended,

  // TypeScript con type-checking reale
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Regole/applicazione per TS/TSX
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        // Rileva automaticamente i tsconfig del progetto
        projectService: true,
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // Next (Core Web Vitals)
      ...nextPlugin.configs['core-web-vitals'].rules,

      // React hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TS quality of life
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },

  // File JS puri (se presenti)
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },

  // Test E2E (Playwright)
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        test: 'readonly',
        expect: 'readonly',
        page: 'readonly',
      },
    },
  }
);
