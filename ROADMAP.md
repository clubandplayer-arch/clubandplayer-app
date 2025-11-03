# Club&Player — Roadmap operativa
_Stato al 30/10/2025 — timezone: Europe/Rome_

## ✅ Fatto di recente
- CP21: API `/api/clubs` (GET/POST) e `/api/clubs/[id]` (GET/PATCH/DELETE)
- CP21.2 – ClubForm con cascade Regione → Provincia → Comune (Supabase)
- **/clubs** disabilitata: 404 forzato via `middleware.ts`
- CP21.3 – mini E2E smoke (Playwright): home, login, /clubs 404, /api/health
- Next 15: **viewport pass-2** (rimosso `metadata.viewport`, centralizzato in `app/viewport.ts`)
- **next/image pass-1**: componenti core migrati
- Tag stabile: `v2025.10.30-stable`
- Next/image: allowlist immagini (Dicebear + Supabase) in `next.config.ts`

## �� In corso / PR
- Nessuna critica aperta (main allineato).

## 🎯 Prossime 24–48h (ordine consigliato)
1) **ESLint v9 flat-config definitivo**
   - Consolidare `eslint.config.mjs`
   - Allineare pacchetti `@typescript-eslint`
   - Ripulire `eslint-disable` orfani
2) **Sentry Verify (EU DSN)**
   - Verifica eventi da `/api/debug/error` e dal client
3) **E2E estesi**
   - CTA “Login con Google” su `/login`
   - Onboarding: ChooseRole → Club → salvataggio geo
4) **Ricerca/filtri DB**
   - Filtri geo su `/search/club` (region/province/municipality/sport)
5) **Security (Supabase)**
   - Password policy, OTP 900–1800s, HIBP quando disponibile, RLS extra

## 📌 Note operative
- CI: branch protection su “Lint” e “Type check”
- Supabase: Google OAuth ➜ `/auth/callback`; env coerenti su Vercel
- Sentry: DSN EU configurati (da verificare ingestion)

# Club&Player — Roadmap operativa
_Stato al 31/10/2025 — timezone: Europe/Rome_

## ✅ Fatto di recente
- **Auth callback**: supporto `redirect_to` con **sanificazione same-origin** in `app/auth/callback/page.tsx`.
- **Login**: persistenza di `redirect_to` in `sessionStorage` per round-trip col callback.
- **/clubs disabilitata**: pagina 404 (via `notFound()` in `app/(dashboard)/clubs/page.tsx`) in linea con la policy prodotto.
- **E2E smoke (Playwright)**: home → ok, login → ok, `/clubs` → 404 ok, `/api/health` → 200 ok.
- **ESLint v9 flat-config**: escluso `eslint.config.*` dagli input per evitare crash typed-lint; lint/build verdi.
- **Next/image — allowlist domini**: `api.dicebear.com` e Supabase storage consentiti in `next.config.ts`.
- **Next 15 — viewport**: centralizzato in `app/viewport.ts` (warnings legacy rimossi).
- **Tag stabile**: `v2025.10.30-stable`.

## 🟡 In corso / PR
- Nessuna PR critica aperta; `main` verde su **Lint** e **Type check**.

## 🎯 Prossime 24–48h (ordine consigliato)
1) **Supabase security hardening**
   - Password policy: lunghezza ≥ 12, numero + speciale.
   - OTP: scadenza 900–1800s; secure password change.
   - HIBP: abilitarlo quando disponibile sul piano.
   - RLS quick check: tabelle `profiles`, `clubs`.
2) **E2E aggiuntivi**
   - Round-trip `redirect_to` (`/login?redirect_to=/feed` → `/auth/callback` → redirect finale).
   - Accesso `/profile` dopo login.
3) **Email branding**
   - Verifica logo/URL prod nei template, test rapido `POST /api/notify-email` (solo in preview protetta).
4) **Sentry check**
   - Trigger di prova `/api/debug/error` e verifica `environment` e `release` in Sentry.

## 📌 Backlog mirato
- **next/image pass-2**: estendere progressivamente dove ancora presente `<img>` (bassa priorità).
- **CI**: mantenere solo “Lint” e “Type check” come required checks.
- **A11y**: sweep veloce (landmarks, alt text, focus ring) su pagine principali.


## 3 novembre 2025 — Aggiornamento (CP21 read-only)
- **Clubs UI**: tipizzazione allineata (page → ClubsClient → ClubsTable), colonna "Azioni" nascosta in read-only.
- **Sentry**: ingest in produzione verificato con `/api/debug/error`.
- **Lint/Build**: verdi.
