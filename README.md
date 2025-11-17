# Club & Player — MVP

“Club & Player” è una piattaforma social che mette in contatto società sportive dilettantistiche e atleti, ispirata ai flussi di LinkedIn. Questa repo contiene la **MVP read-only per i club**, con autenticazione Supabase, feed pubblico, pagine profilo e area /clubs consultabile.

## Stack principale
- **Next.js 15.5** (App Router, Turbopack)
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4**
- **Supabase** (Auth, Database, Storage)
- **Sentry 10** (client + server)
- **pnpm 10.17.1** (bloccato via `packageManager`)
- **Node.js 22** (consigliato; minimo 20)

## Setup rapido
1. Abilita Corepack e installa la versione corretta di pnpm:
   ```bash
   corepack enable
   corepack prepare pnpm@10.17.1 --activate
   ```
2. Installa le dipendenze (verifica che Node sia ≥ 20, consigliato 22):
   ```bash
   pnpm install --frozen-lockfile
   ```
3. Copia `.env.example` (se assente, crea `.env.local`) e valorizza le variabili indicate nella tabella seguente.
4. Avvia l'applicazione in sviluppo:
   ```bash
   pnpm dev
   ```
   L'app sarà disponibile su http://127.0.0.1:3000.

## Variabili d'ambiente
| Variabile | Scope | Obbligatoria | Descrizione |
|-----------|-------|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | client/server | ✅ | URL del progetto Supabase (anon). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client/server | ✅ | Chiave anon Supabase per le chiamate pubblico/auth. |
| `SUPABASE_URL` | server | ⚪️ | Fallback lato server (se diverso dall'anon). |
| `SUPABASE_ANON_KEY` | server | ⚪️ | Fallback lato server per chiamate browser-like. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | ⚪️ | Necessaria per API che usano privilegi elevati (notify/email, bootstrap admin). |
| `NEXT_PUBLIC_BASE_URL` | client/server | ⚪️ | URL pubblico dell'app (es. `https://clubandplayer.app`). |
| `NEXT_PUBLIC_FEATURE_CLUBS_READONLY` | client | ✅ in prod | Mantienilo a `1` per lasciare `/clubs` in sola lettura sull'MVP. |
| `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` | client | ⚪️ | Abilita i controlli di creazione/modifica/cancellazione su `/clubs` (solo per admin allowlist). |
| `NEXT_PUBLIC_CLUBS_ADMIN_EMAILS` | client | ⚪️ | Lista CSV di email autorizzate all'editing `/clubs` (allineala a `CLUBS_ADMIN_EMAILS`). |
| `CLUBS_ADMIN_EMAILS` | server | ⚪️ | Allowlist server per CRUD club; usala insieme a `ADMIN_EMAILS`/`ADMIN_USER_IDS`. |
| `ADMIN_EMAILS` / `ADMIN_USER_IDS` | server | ⚪️ | Liste (CSV) per concedere privilegi amministrativi. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | server/client | ⚪️ | Abilitano il tracking errori Sentry. |
| `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | server/client | ⚪️ | Ambiente usato in Sentry (es. `production`). |
| `SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_RELEASE` | server/client | ⚪️ | Etichetta release/commit per Sentry (es. `VERCEL_GIT_COMMIT_SHA`). |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | client | ⚪️ | Telemetria opzionale PostHog. |
| `RESEND_API_KEY`, `RESEND_FROM`, `BRAND_REPLY_TO` | server | ⚪️ | Abilitano l'invio email reale. Se assenti, le rotte notifiche rimangono in NOOP. |
| `NOOP_EMAILS` | server | ⚪️ | Imposta `1` per forzare il NOOP (default). |
| `E2E_HOST`, `E2E_PORT`, `E2E_BASE_URL` | test | ⚪️ | Override per gli smoke test E2E. |

> Suggerimento: usa `.env.local` per lo sviluppo, mentre su Vercel configura gli stessi valori su Production/Preview.

## Script principali
| Comando | Descrizione |
|---------|-------------|
| `pnpm dev` | Avvia Next.js in modalità sviluppo (Turbopack). |
| `pnpm build` | Build production (`next build --turbopack`). |
| `pnpm start` | Avvia il server production dopo la build. |
| `pnpm lint` | ESLint flat-config senza warning ammessi. |
| `pnpm test:e2e` | Smoke test Node (`node --test`) che avviano Next.js e validano `/api/health`, `/logout` e `/feed`. |
| `node scripts/check-clubs-flags.mjs` | Diagnostica rapida di flag/allowlist `/clubs` (allinea client/server prima di attivare i CRUD). |

## Struttura repository
- `app/` — Route Next.js (pagine, layout, API handlers).
- `components/` — Componenti UI condivisi (card profilo, tabella club, shell).
- `lib/` — Helper (Supabase client, adapter club, utils logging/feature flag).
- `hooks/` — Hook custom (Supabase, preferenze, UI state).
- `types/` — Tipizzazioni comuni (club, profili, opportunità).
- `public/` — Asset statici.
- `supabase/` — Script/migrazioni SQL e note RLS.
- `tests/` — Harness E2E minimale basato su Node test runner.
- `docs/` — Checklist, audit e roadmap.
- `scripts/` — Utility CLI (es. bootstrap admin).

## Testing & QA
1. Esegui gli smoke test locali:
   ```bash
   pnpm test:e2e
   ```
   Lo script avvia automaticamente un dev server su `127.0.0.1:3010`, controlla `/api/health`, esegue il logout e verifica che un utente guest venga reindirizzato da `/feed` alla pagina di login. In ambienti offline è normale ricevere un warning sul download del font Inter: Next.js userà fallback senza impattare il risultato.
2. Controlla manualmente le pagine chiave:
   - `/login` → form Supabase.
   - `/feed` → redirect a `/login` per guest o feed pubblico.
   - `/clubs` → tabella read-only con colonna “Nome” basata su `displayLabel` dell'adapter.
   - `/debug/client-error` e `/api/debug/error` → verifiche per Sentry.
3. Quando abiliti i CRUD su `/clubs` in staging, segui la [checklist di smoke test guest vs admin](docs/smoke-tests/clubs.md) per verificare flag, allowlist e RLS.
3. Verifica la salute del backend con `curl http://127.0.0.1:3000/api/health` (risposta 200 JSON con info ambiente).

## Smoke test in CI (GitHub Actions)
- Il workflow **E2E (non-blocking)** esegue `pnpm test:e2e` con il Node test runner e pubblica l'output come artifact `e2e-smoke-log`.
- Il riepilogo del job include automaticamente le ultime righe di log per diagnosi rapide.
- Per rendere gli smoke test "quasi-bloccanti" sulle PR, definisci la variabile di repository `SMOKE_ENFORCE=true`. Se i test falliscono e la PR modifica file che combaciano con `app/**` (o con i pattern personalizzati nella variabile `SMOKE_ENFORCE_PATHS`), il job fallirà.

## Checklist deploy MVP
- `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1` su produzione.
- Variabili Supabase e Sentry configurate (vedi tabella).
- Decisione email: lascia `NOOP_EMAILS=1` oppure imposta chiavi Resend per invio reale.
- Conferma RLS Supabase su `clubs` e tabelle profilo (`WITH CHECK` coerenti con gli inserimenti).
- Password policy Supabase ≥ 12 caratteri + numero + carattere speciale, OTP 900–1800s.
- E2E locali verdi (`pnpm test:e2e`).

## Passi rapidi verso la **Beta**
- **Sentry**: imposta `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` e `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` (tipicamente `VERCEL_GIT_COMMIT_SHA`) per distinguere ambienti e release in dashboard.
- **Email reali**: configura `RESEND_API_KEY`, `RESEND_FROM`, `BRAND_REPLY_TO` e disattiva `NOOP_EMAILS`.
- **Storage feed**: assicurati che il bucket `posts` esista e che le policy di upload/lettura siano applicate (vedi note in roadmap post-MVP).
- **Smoke test quasi-bloccanti**: su GitHub abilita `SMOKE_ENFORCE=true` per PR che toccano `app/**` o i pattern personalizzati.
- **Sicurezza Supabase**: verifica le policy RLS su `profiles`, `clubs` e `posts` (WITH CHECK coerenti), password minima 12 caratteri e OTP con scadenza 15–30 minuti.
- **Onboarding dev**: mantieni aggiornata `.env.local` e le variabili Vercel per consentire a nuovi dev di avviare l'ambiente in <15 minuti.

## Documentazione aggiuntiva
- `ROADMAP.md` — Stato MVP e passaggi futuri.
- `ROADMAP-post-MVP.md` — Milestone successive (email reali, A11y, ecc.).
- `docs/repo-audit-2025-03-09.md` — Audit aggiornato della codebase.

Per dubbi o onboarding, consulta anche `/app/debug/env` (verifica rapida env) e `scripts/create-admin-user.mjs` per promuovere utenti nel database.
