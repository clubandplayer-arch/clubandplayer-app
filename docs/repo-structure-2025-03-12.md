# Repository structure snapshot (2025-03-12)

## Framework and build tooling
- Next.js 15 App Router project with Turbopack used for dev/build (`package.json`).
- TypeScript 5 with ESLint 9 and Tailwind CSS 4 for styling; React 19 runtime.
- Sentry integration present via `sentry.*.config.ts*` and `instrumentation.ts`, plus global `middleware.ts`.

## Application surface (`app/`)
- App Router root contains grouped route segments such as `(authenticated)`, `(dashboard)`, `admin`, and feature-specific folders like `athletes`, `applications`, `favorites`, `messages`, `reports`, `search`, and `settings`.
- Shared framework files include `layout.tsx`, `page.tsx`, `globals.css`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, and auth flows under `login`, `logout`, `reset-password`, and `update-password`.
- API routes live under `app/api/`, and sitemap/robots definitions live at `app/sitemap.ts` and `app/robots.ts`.

## Shared UI and feature modules
- `components/` hosts reusable UI and domain components, grouped by feature (e.g., `analytics`, `applications`, `clubs`, `profiles`, `shell`, `ui`).
- `hooks/` carries custom React hooks; `lib/` contains domain logic modules (`auth`, `analytics`, `search`, `profiles`, `opps`, `supabase` helpers, etc.) plus adapter layers and utility helpers.
- `types/` and `lib/types` capture shared TypeScript models.

## Ops, docs, and scripts
- `docs/` includes onboarding, audits, legal notes, and SQL snippets for Supabase features (notifications, feed reactions, applications). `scripts/` provides repo support tooling.
- `supabase/migrations` stores database migration SQL.
- Root configs include ESLint (`eslint.config.mjs`), Tailwind/PostCSS (`postcss.config.mjs`), Next runtime settings (`next.config.ts`), and Supabase client/server configs (`supabaseBrowser.ts`, `lib/supabase`).

## Notable attention points
- Recent commits focus on opportunity flows and auth routes (`git log --oneline -5`), so check opportunity update helpers and auth callback removal when modifying related areas.
- App leverages Turbopack; prefer compatible tooling when adjusting build/lint scripts.
