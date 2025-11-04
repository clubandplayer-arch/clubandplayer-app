# Club&Player — Roadmap operativa
_Stato al 03/11/2025 — timezone: Europe/Rome_

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
- **Playwright E2E**
  - Config introdotta: `playwright.config.ts` con `use.baseURL` e `webServer` su `127.0.0.1:3010`
  - `tests/tsconfig.json` valido (UTF-8, no BOM)
  - E2E **robusti**:
    - Smoke: home/login, `/api/health`
    - Auth/logout + redirect a login su `/feed` **oppure** feed pubblico (accettati entrambi)
    - `/clubs` read-only: ricerca/paginazione; accetta tabella, empty state, banner 401 o redirect a login
  - Esclusi `tests` e `playwright.config.ts` dal type-check di Next (build Vercel ok)
- **Build & CI**
  - ESLint v9 flat-config allineato; Lint/Build verdi
  - Tag precedente: `v2025.10.30-stable`

---

## 🟡 Da fare per “CHIUSURA DEFINITIVA” (blocchi must-do)
1. **ClubsTable → colonna Nome usa `displayLabel` dell’adapter**
   - Sostituire lo span del nome con:  
     `((c as any).displayLabel ?? c.display_name ?? c.name)`
2. **Verifica feature flag in produzione**
   - Vercel (Production): `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1`
3. **Email: decisione finale**
   - Restare in **noop** _oppure_ attivare invio reale con:
     - `RESEND_API_KEY`
     - `BRAND_FROM`, `BRAND_REPLY_TO`
   - Fare un test `POST /api/notifications/send`
4. **Supabase — ultimo passaggio sicurezza**
   - Confermare: RLS su `clubs` e tabelle profilo ok
   - (Se presenti) impostare `security_invoker` su view esposte
   - Verificare `search_path` delle function
   - Password policy forte (min 12 + numero + speciale), OTP 900–1800s
5. **Roadmap/README**
   - Aggiornare README con avvio locale (Node 22, pnpm 10.17.1), variabili richieste e note su feature flag

> Con i 5 punti sopra ✅ possiamo dichiarare l’MVP **ready for market** (read-only per i club).

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

## 🧩 Checklist ambienti (Vercel)
**Required**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1`

**Opzionale (email reale)**
- `RESEND_API_KEY`
- `BRAND_FROM`, `BRAND_REPLY_TO`

---

## 🔬 QA / Go-Live checklist
- `/api/health` → 200 ok
- `/debug/client-error` → evento client su Sentry
- `/api/debug/error` → evento server su Sentry
- `/clubs` (guest) → tabella/empty/banner 401 o redirect a `/login` (accettato)
- `/feed` (guest) → redirect a `/login` **oppure** feed pubblico (accettato)
- E2E locali verdi (`pnpm run test:e2e`)
- Build Vercel verde

---

## 🔖 Tag suggerito
- `v2025.11.03-stable-2` — *CP21 read-only stabile + Sentry OK + E2E robusti + viewport cleanup + adapter /clubs*

---

## 📜 Cronologia snapshot (estratto)
- **30/10/2025**
  - API clubs, ClubForm (cascade geo), /clubs disabilitata (404 via middleware), E2E smoke
  - Next 15: viewport pass-2; next/image pass-1; allowlist immagini; tag `v2025.10.30-stable`
- **31/10/2025**
  - Auth callback: `redirect_to` same-origin; persistenza in sessionStorage
  - /clubs 404 tramite `notFound()`; ESLint v9 flat-config; next/image allowlist; viewport centralizzato
- **03/11/2025**
  - /clubs read-only sempre attiva; adapter `mapClubsList` + wiring; data it-IT
  - Sentry client+server verificati; Playwright baseURL+webServer; E2E robusti
  - Esclusi test dal type-check Next; viewport pass-3 completato

## 4 novembre 2025 — Rifinitura tabella
- **/clubs**: colonna Nome ora usa `displayLabel` (adapter) con fallback `display_name|name`.
- Smoke check: /api/health 200; /api/debug/error 500 (Sentry server); client-error page ok.

## 4 novembre 2025 — Ordinamento e CI
- **/clubs**: lista ordinata A→Z su `displayLabel` con collator locale `it`.
- **CI**: aggiunto workflow GitHub Actions E2E (non-bloccante) con Playwright.
