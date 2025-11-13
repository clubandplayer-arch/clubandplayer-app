# Club&Player — Roadmap operativa
_Stato al 05/11/2025 — timezone: Europe/Rome_

---

## ✅ Fatto (ultimi giorni)
- **CP21 – API Clubs**
  - Endpoints: `GET/POST /api/clubs`, `GET/PATCH/DELETE /api/clubs/[id]`
  - Paginazione `page/pageSize`, filtro `q`, validazione parametri
  - RLS hardening in Supabase: **WITH CHECK** su INSERT/UPDATE
- **UI /clubs (read-only)**
  - Pagina abilitata in sola lettura (niente creazione/modifica/cancellazione)
  - Feature flag: `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1` (prod)
  - Middleware aggiornato: nessun rewrite a 404 quando la flag è ON
  - `ClubsClient` → `ClubsTable` tipizzati; data “Creato” in **it-IT (Europe/Rome)**
  - Adapter introdotto: `lib/adapters/clubs.ts` (`mapClubsList`) + wiring nel client
- **Auth / Onboarding**
  - `/auth/callback` (PKCE + implicit) → sync cookie via `/api/auth/session`, bootstrap profilo, redirect smart
  - `middleware.ts`: routing base (login/signup redirect se già autenticato, protezione rotte /club/*)
- **Email branding**
  - `POST /api/notifications/send` e `POST /api/notify-email` resilienti (noop se ENV mancanti)
  - Template base predisposto (CTA, previewText)
- **Sicurezza DB**
  - RLS quick-check applicato su tabelle chiave; policy INSERT corretta
- **Sentry**
  - Config unificata (client/server) via `withSentryConfig`
  - DSN letti da env; endpoint di prova server: `/api/debug/error`
  - **Verifica ingestion produzione**: ok
  - Pagina di prova client: `/debug/client-error` (ok)
- **next/image**
  - Migrazione componenti core; allowlist remote patterns (DiceBear + Supabase) in `next.config.ts`
- **Viewport (pass-3)**
  - Rimosso `metadata.viewport` ovunque; `export const viewport` centralizzato
- **Smoke test E2E (Node test runner)**
  - Harness dedicato (`tests/e2e/helpers/server.mjs`) che avvia Next.js su `127.0.0.1:3010`
  - Test `tests/e2e/auth.logout.test.mjs` verifica `/api/health`, `/logout` e `/feed` (redirect a login o feed pubblico)
  - `pnpm test:e2e` compatibile con CI (senza Playwright) e con fallback su font offline
- **Build & CI**
  - ESLint v9 flat-config allineato; Lint/Build verdi
  - Tag precedente: `v2025.10.30-stable`

---

## 🟢 Stato MVP
- MVP **ready for market**: `/clubs` read-only, onboarding Supabase completato, Sentry client/server configurato.
- README aggiornato con setup, variabili e checklist deploy.
- Smoke test eseguibili localmente/CI con `pnpm test:e2e`.
- Decisione email: default NOOP; abilitare Resend solo quando pronti.

> Prossimi passi operativi (fuori codice):
> 1. Verificare che in produzione `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1` e variabili Supabase/Sentry siano presenti.
> 2. Confermare su Supabase password policy ≥ 12, OTP 900–1800s, RLS `clubs` e profili attive.
> 3. Decidere se lasciare email in NOOP o impostare le chiavi Resend (`RESEND_API_KEY`, `RESEND_FROM`, `BRAND_REPLY_TO`).

---

## 🎯 Consigliato (stessa finestra, non bloccante)
- **CI E2E (non-blocking)**: workflow GitHub Actions che lancia gli E2E su PR/push (`|| true`)
- **Indice performance `/api/clubs` (se dataset cresce)**
  - Estensione `pg_trgm` + GIN su `name`, `display_name`, `city`; indice su `created_at`
- **Sentry tuning**
  - `SENTRY_ENVIRONMENT=production`
  - `SENTRY_RELEASE=${VERCEL_GIT_COMMIT_SHA}`
- **Snellire bundle read-only**
  - Evitare import di `Modal/ClubForm` quando `readOnly=true` (dynamic import o rimozione)
- **A11y sweep veloce**
  - Landmarks, alt text coerenti, focus ring, label nei form principali

---

## 🗺️ Roadmap storica
- **30/10/2025**
  - API clubs, ClubForm (cascade geo), /clubs disabilitata (404 via middleware), E2E smoke
  - Next 15: viewport pass-2; next/image pass-1; allowlist immagini; tag `v2025.10.30-stable`
- **31/10/2025**
  - Auth callback: `redirect_to` same-origin; persistenza in sessionStorage
  - /clubs 404 tramite `notFound()`; ESLint v9 flat-config; next/image allowlist; viewport centralizzato
- **03/11/2025**
  - /clubs read-only sempre attiva; adapter `mapClubsList` + wiring; data it-IT
  - Sentry client+server verificati; smoke test (Playwright) robusti
  - Esclusi test dal type-check Next; viewport pass-3 completato
- **04/11/2025**
  - /clubs: colonna Nome usa `displayLabel` (adapter) con fallback `display_name|name`
  - Smoke check: /api/health 200; /api/debug/error 500 (Sentry server); client-error page ok
  - CI: workflow GitHub Actions E2E (non-bloccante) con Playwright (disattivato dopo migrazione Node)
  - Ricerca club: indici `pg_trgm` su `name`, `display_name`, `city` + indice `created_at`
- **05/11/2025**
  - Smoke test migrati a Node test runner (`node --test`)
  - README e documentazione MVP aggiornati

---

## 🔖 Tag suggerito
- `v2025.11.05-mvp-ready` — *CP21 read-only stabile + Sentry OK + smoke test Node + documentazione aggiornata*
