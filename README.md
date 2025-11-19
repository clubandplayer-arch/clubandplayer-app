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

## Setup rapido (≤15 minuti)
1. Abilita Corepack e installa la versione corretta di pnpm:
   ```bash
   corepack enable
   corepack prepare pnpm@10.17.1 --activate
   ```
2. Installa le dipendenze (verifica che Node sia ≥ 20, consigliato 22):
   ```bash
   pnpm install --frozen-lockfile
   ```
3. Copia `docs/env.sample` in `.env.local` e valorizza le variabili indicate nella tabella seguente (mantieni gli stessi valori anche su Vercel per Production/Preview).
4. Avvia l'applicazione in sviluppo:
  ```bash
  pnpm dev
  ```
  L'app sarà disponibile su http://127.0.0.1:3000.
5. Esegui `pnpm test:e2e` per ottenere uno smoke test di riferimento e verificare che l'ambiente sia allineato.

> Se qualcosa blocca il setup (variabili Vercel, auth callback, storage o Sentry), consulta [docs/dev-onboarding.md](docs/dev-onboarding.md) per una diagnosi rapida.

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
| `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` | client | ⚪️ | Abilita i controlli di creazione/modifica/cancellazione su `/clubs` per gli admin in allowlist server. |
| `NEXT_PUBLIC_CLUBS_ADMIN_EMAILS` | client | ⚪️ | Facoltativa (solo diagnostica/UI); la allowlist effettiva è `CLUBS_ADMIN_EMAILS`. |
| `CLUBS_ADMIN_EMAILS` | server | ⚪️ | Allowlist server per CRUD club (usata per UI e API) da affiancare a `ADMIN_EMAILS`/`ADMIN_USER_IDS`. |
| `ADMIN_EMAILS` / `ADMIN_USER_IDS` | server | ⚪️ | Liste (CSV) per concedere privilegi amministrativi. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | server/client | ⚪️ | Abilitano il tracking errori Sentry. |
| `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | server/client | ⚪️ | Ambiente usato in Sentry (es. `production`). |
| `SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_RELEASE` | server/client | ⚪️ | Etichetta release/commit per Sentry (es. `VERCEL_GIT_COMMIT_SHA`). |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | client | ⚪️ | Dominio tracciato dal loader Plausible-like (es. `clubandplayer.app`). |
| `NEXT_PUBLIC_ANALYTICS_SRC`, `NEXT_PUBLIC_ANALYTICS_API` | client | ⚪️ | URL script/API della soluzione analytics privacy-first. |
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
| `node scripts/check-clubs-flags.mjs [--env-file .env.vercel.preview]` | Diagnostica rapida di flag/allowlist `/clubs` (allinea client/server prima di attivare i CRUD e verifica l'overlap con `ADMIN_EMAILS`). |
| `node scripts/check-feed-config.mjs` | Verifica che il bucket Storage `posts` e la tabella `posts` siano accessibili con la chiave service-role. |
| `node scripts/check-email-config.mjs` | Controlla che le variabili Resend siano presenti e che `NOOP_EMAILS` sia disattivato prima di inviare email reali. |
| `node scripts/check-sentry-config.mjs` | Verifica DSN, environment e release Sentry (server/client) prima di abilitare il monitoraggio. |
| `node scripts/check-monitoring.mjs [--env-file .env.vercel.production] [--send-event]` | Controlla Sentry (DSN, environment, release) e l'analytics privacy-first; con `--send-event` invia un ping che deve apparire in dashboard con i tag corretti. |
| `node scripts/check-vercel-env.mjs --local=.env.local --preview=.env.vercel.preview --production=.env.vercel.production` | Confronta `.env.local` con i file generati da `vercel env pull` (Preview/Production) e segnala variabili mancanti per Supabase, Resend, Sentry e analytics. |

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
-3. Quando abiliti i CRUD su `/clubs` in staging, segui la [checklist di smoke test guest vs admin](docs/smoke-tests/clubs.md) per verificare flag, allowlist e RLS.
-4. Per feed e candidature, usa le checklist manuali dedicate: [smoke test `/feed`](docs/smoke-tests/feed.md) e [smoke test `/applications/received`](docs/smoke-tests/applications.md).
-5. Ultima esecuzione completa (feed, clubs, applications, full journey): vedi [`docs/smoke-tests/runs/2025-03-09.md`](docs/smoke-tests/runs/2025-03-09.md) e l'artifact testuale (`docs/smoke-tests/artifacts/2025-03-09-e2e.log`). Ripeti la checklist ad ogni release.
5. Verifica la salute del backend con `curl http://127.0.0.1:3000/api/health` (risposta 200 JSON con info ambiente).

## Smoke test in CI (GitHub Actions)
- Il workflow **E2E (non-blocking)** esegue `pnpm test:e2e`, salva log e metadati (`artifacts/smoke/e2e-smoke.log`, `metadata.json`) e li pubblica come artifact `smoke-artifacts` scaricabile da GitHub Actions.
- Il riepilogo del job include automaticamente le ultime righe del log oltre allo stato registrato in `metadata.json` per diagnosi rapide.
- Per rendere gli smoke test "quasi-bloccanti" sulle PR, definisci la variabile di repository `SMOKE_ENFORCE=true`. Se i test falliscono e la PR modifica file che combaciano con `app/**` o i pattern configurati in `SMOKE_ENFORCE_PATHS`, il job verrà segnato come failed. I branch `main` e `release/*` li considerano automaticamente obbligatori.

## Troubleshooting onboarding rapido
- **Variabili Vercel**: copia `docs/env.sample` in `.env.local`, poi genera `.env.vercel.preview` / `.env.vercel.production` con `vercel env pull`. Il comando `node scripts/check-vercel-env.mjs --local=.env.local --preview=.env.vercel.preview --production=.env.vercel.production` evidenzia differenze o variabili mancanti per Supabase, Resend, Sentry e analytics.
- **Auth callback Supabase**: assicurati che in Supabase > Authentication > URL Settings siano presenti sia il dominio production sia `http://127.0.0.1:3000` / `http://localhost:3000`, e che `NEXT_PUBLIC_BASE_URL` punti allo stesso host.
- **Storage feed**: controlla che il bucket `posts` esista e applichi le policy RLS previste; il comando `node scripts/check-feed-config.mjs` conferma bucket e permessi.
- **Sentry**: popola `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, imposta `SENTRY_ENVIRONMENT` e lascia che `VERCEL_GIT_COMMIT_SHA` (o `SENTRY_RELEASE`) tagghi la release; verifica con `node scripts/check-sentry-config.mjs` e allega una prova con `node scripts/check-monitoring.mjs --send-event` prima del deploy.

> Per maggiori dettagli e altre casistiche consulta [docs/dev-onboarding.md](docs/dev-onboarding.md).

## Analytics privacy-first
- La raccolta di metriche usa uno script compatibile con [Plausible](https://plausible.io/) o equivalenti self-hosted.
- Lo script viene caricato solo se:
  1. è presente `NEXT_PUBLIC_ANALYTICS_DOMAIN` (con eventuali `NEXT_PUBLIC_ANALYTICS_SRC` / `NEXT_PUBLIC_ANALYTICS_API`),
  2. l'utente ha accettato tutti i cookie dal banner (`cp-consent-v1`),
  3. il browser **non** espone un segnale *Do Not Track* attivo.
- I componenti che tracciano eventi (es. `TrackListView`, `TrackOpportunityOpen`) inviano solo eventi aggregati e privi di dati personali tramite `window.plausible`.
- Se vuoi disattivare completamente la telemetria basta omettere le variabili `NEXT_PUBLIC_ANALYTICS_*` e nessuno script verrà caricato.

## Checklist deploy MVP
- `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1` su produzione.
- Variabili Supabase e Sentry configurate (vedi tabella).
- Decisione email: lascia `NOOP_EMAILS=1` oppure imposta chiavi Resend per invio reale.
- Conferma RLS Supabase su `clubs` e tabelle profilo (`WITH CHECK` coerenti con gli inserimenti).
- Password policy Supabase ≥ 12 caratteri + numero + carattere speciale, OTP 900–1800s.
- E2E locali verdi (`pnpm test:e2e`).

## Passi rapidi verso la **Beta**
- **Sentry**: imposta `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` e `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` (tipicamente `VERCEL_GIT_COMMIT_SHA`) per distinguere ambienti e release in dashboard.
  - Usa `node scripts/check-sentry-config.mjs` per validare rapidamente DSN, environment e release prima dei deploy.
  - Se non specifichi la release, Sentry userà automaticamente `VERCEL_GIT_COMMIT_SHA` (anche in edge) così gli errori sono già collegati al commit.
  - Il client ignora automaticamente errori rumorosi noti (es. `ResizeObserver loop limit exceeded`, abort di fetch) per mantenere la dashboard più pulita, inclusi quelli generati da estensioni browser comuni.
- **Email reali**: configura `RESEND_API_KEY`, `RESEND_FROM`, `BRAND_REPLY_TO`, disattiva `NOOP_EMAILS` e valida con `node scripts/check-email-config.mjs` (le rotte `/api/notify-email` e `/api/notifications/send` rispondono 500 se la configurazione è assente).
- **Storage feed**: assicurati che il bucket `posts` esista e che le policy di upload/lettura siano applicate (vedi note in roadmap post-MVP).
- **Smoke test quasi-bloccanti**: su GitHub abilita `SMOKE_ENFORCE=true` per PR che toccano `app/**` o i pattern personalizzati.
- **Sicurezza Supabase**: verifica le policy RLS su `profiles`, `clubs` e `posts` (WITH CHECK coerenti), password minima 12 caratteri e OTP con scadenza 15–30 minuti.
- **Onboarding dev**: mantieni aggiornata `.env.local` e le variabili Vercel per consentire a nuovi dev di avviare l'ambiente in <15 minuti.

## Documentazione aggiuntiva
- `ROADMAP.md` — Stato MVP e passaggi futuri.
- `ROADMAP-post-MVP.md` — Milestone successive (email reali, A11y, ecc.).
- `docs/dev-onboarding.md` — Checklist <15 minuti e troubleshooting per variabili/env/Sentry.
- `docs/env-sync/2025-03-09.md` — Evidenza dell'ultimo check di allineamento fra `.env.local` e gli ambienti Vercel.
- `docs/repo-audit-2025-03-09.md` — Audit aggiornato della codebase.
- `docs/feature-flags/clubs-admin-rollout.md` — Piano di rollout (e rollback) per `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` e l'allowlist `CLUBS_ADMIN_EMAILS`.
- `docs/monitoring/runbook.md` — Self-check monitoraggio (Sentry, analytics privacy-first e alert minimi) con riferimento agli artifact dei test.

Per dubbi o onboarding, consulta anche `/app/debug/env` (verifica rapida env) e `scripts/create-admin-user.mjs` per promuovere utenti nel database.
