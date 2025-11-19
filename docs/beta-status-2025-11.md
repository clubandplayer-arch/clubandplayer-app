# Stato verso la Beta — novembre 2025

Questo documento fotografa l'analisi corrente della codebase e i passi prioritari per completare la versione **Beta**, riallineando quanto già presente nella roadmap post-MVP.

## Cosa è stato analizzato
- **Stack e setup**: confermato l'impianto Next.js 15.5/React 19/TypeScript 5 con Tailwind 4, Supabase (Auth/DB/Storage) e Sentry 10, gestito con pnpm 10.17.1 su Node 22 come baseline consigliata. Il README riporta anche le variabili d'ambiente chiave e la struttura repository (app, components, lib, hooks, types, supabase, tests, docs, scripts).
- **Roadmap post-MVP**: riviste le milestone PM-01…PM-12 per capire le feature e i controlli mancanti prima della Beta (email reali, A11y, riapertura CRUD club sotto flag admin, ricerca/filtering UI, tuning Sentry, sicurezza Supabase, artifact E2E, onboarding dev, performance, legal, analytics).

## Stato attuale sintetico
- MVP stabilizzata con `/clubs` in sola lettura e smoke test Node runner già documentati; deployment orientato a Vercel con flag di feature e configurazione Sentry/Resend opzionale.
- Documentazione aggiornata e coerente: README, roadmap operative (`ROADMAP.md`, `ROADMAP-post-MVP.md`) e audit repository già disponibili come base di riferimento.

### Recap ultimi interventi
- **Feed**: il composer supporta nuovamente foto/video caricati sul bucket `posts` con policy RLS rispettate; l'API usa il client di sessione e fa fallback admin solo quando il bucket manca, mantenendo l'editing/cancellazione invariati.
- **Candidature**: `/club/applicants` legge i dati direttamente con il client autenticato (fallback admin solo se necessario) e le colonne `club_id`/`media` sono consolidate tramite migrazioni Supabase.
- **Avatar profilo**: l'upload usa helper dedicati con controlli espliciti sulla chiave service-role, rimuovendo gli errori RLS storici.
- **Pipeline**: gli artifact degli smoke test sono pubblicati a ogni CI run e `SMOKE_ENFORCE` può rendere il check bloccante per percorsi critici.
- **Documentazione**: README, roadmap, onboarding e stato Beta sono allineati; la sezione troubleshooting copre Vercel env, callback Supabase, storage e Sentry.

### Checklist finale per dichiarare la Beta
1. ✅ **Smoke test completi**: eseguiti il 10/03/2025 sul build di rilascio (`docs/smoke-tests/runs/2025-03-10.md`, artifact [`docs/smoke-tests/artifacts/2025-03-10-beta-go.log`](./smoke-tests/artifacts/2025-03-10-beta-go.log)). `SMOKE_ENFORCE=true` resta impostato automaticamente per `main` e `release/*` nel workflow “E2E (non-blocking)”.
2. ✅ **Allineamento ambienti**: Vercel Preview/Production sono stati confrontati con `.env.local` il 09/03/2025 tramite `node scripts/check-vercel-env.mjs --local=.env.local --preview=.env.vercel.preview --production=.env.vercel.production` (vedi [`docs/env-sync/2025-03-09.md`](./env-sync/2025-03-09.md)). Gli script `scripts/check-*` restano disponibili per replicare il controllo (email, Sentry, feed, flag clubs).
3. ✅ **Feature flag**: il rollout combinato di `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` e `CLUBS_ADMIN_EMAILS` è documentato in [`docs/feature-flags/clubs-admin-rollout.md`](./feature-flags/clubs-admin-rollout.md) con overlap obbligatorio rispetto a `ADMIN_EMAILS`, check script aggiornato e piano di rollback.
4. ✅ **Monitoraggio**: `scripts/check-monitoring.mjs` verifica DSN/env/release e può inviare un ping `--send-event` a Sentry; il runbook [`docs/monitoring/runbook.md`](./monitoring/runbook.md) documenta anche gli alert minimi (tag `layer=api`, `endpoint=/api/feed/posts*`) e ribadisce che l'analytics Plausible-like si attiva solo dopo il consenso + DNT off.
5. ✅ **Comunicazione legale**: le pagine `/legal/privacy`, `/legal/terms` e la nuova `/legal/beta` sono state revisionate, collegate dal footer e il testo condivisibile è disponibile in [`docs/legal/beta-invite.md`](./legal/beta-invite.md).
6. ✅ **Supporto/triage**: la casella `BRAND_REPLY_TO` (`support@clubandplayer.com`) è presidiata dal team Operazioni e gli errori Sentry vengono inoltrati sul canale Slack `#beta-triage` (vedi [`docs/support/beta-triage.md`](./support/beta-triage.md)).

Checklist completata il 10/03/2025: vedere la sezione successiva per la data ufficiale e i miglioramenti “Post Beta”.

## Via libera Beta
- **Data**: 10 marzo 2025
- **Commit di riferimento**: 781af2f9a6ab79635b3796cb1466680e6cb8b692 (Vercel preview promossa a produzione)
- **Note**:
  - Artifact smoke test allegato (`docs/smoke-tests/artifacts/2025-03-10-beta-go.log`).
  - `SMOKE_ENFORCE=true` lasciato attivo sui branch di release per mantenere il gate automatico.
  - Canali legali, supporto e monitoraggio attivati come da runbook aggiornati.

## Post Beta
- ✅ **Reintroduzione upload media nel feed**: la bacheca accetta nuovamente immagini (8MB) e video MP4 (80MB) caricati nel bucket `posts`, con fallback admin e logging Sentry sugli errori.
- **Analytics avanzate**: valutare l’invio di eventi aggiuntivi (conversioni candidature, retention) mantenendo l’approccio privacy-first.
- **Miglioramenti performance**: continuare a ottimizzare caching/lazy loading nelle viste più trafficate (feed, search club) e monitorare Web Vitals reali.
- **Ampliamento supporto**: formalizzare SLA/turni per `BRAND_REPLY_TO` e canale `#beta-triage` quando il numero di utenti crescerà.

## Prossimi passi prioritari verso la Beta
1. ✅ **Email reali (PM-01)**: configurazione Resend obbligatoria (`RESEND_API_KEY`, `RESEND_FROM`, `BRAND_REPLY_TO`) e NOOP disattivato; gli endpoint `/api/notify-email` e `/api/notifications/send` rifiutano la richiesta se l'env non è completa.
2. ✅ **Tuning Sentry (PM-07)**: client/server/edge condividono environment (`SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT`) e release (`SENTRY_RELEASE` o `VERCEL_GIT_COMMIT_SHA`) con filtri anti-rumore dedicati.
3. ✅ **A11y & UX sweep (PM-03)**: layout con skip link globale, form `/login` etichettati, `/feed` e `/search/club` con annunci `aria-live`, heading coerenti e feedback tastiera-friendly per Composer e moduli di modifica.
4. ✅ **Snellimento bundle /clubs read-only (PM-02)**: i componenti CRUD sono caricati dinamicamente solo quando i flag consentono la modifica, mantenendo invariato il “First Load JS”.
5. ✅ **/clubs edit dietro flag admin (PM-04)**: flag `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` e allowlist `CLUBS_ADMIN_EMAILS` governano UI e API, esponendo i controlli CRUD solo agli utenti autorizzati.
6. ✅ **Filtri ricerca club (PM-05)**: la UI `/search/club` usa `/api/clubs` con filtri geo e ricerca testuale indicizzata (`pg_trgm`, `idx_clubs_created_at`).
7. ✅ **Security Supabase (PM-06)**: password policy portata a ≥12 caratteri con numeri/simboli, OTP expiry fissato a 900s e policy RLS su `profiles`/`clubs` riallineate con `WITH CHECK` coerenti.
8. ✅ **CI/CD quasi-bloccante (PM-08)**: gli smoke test salvano log/metadata come artifact `smoke-artifacts` e `SMOKE_ENFORCE` può bloccare PR critiche; Playwright resta opzionale.
9. ✅ **Docs & onboarding dev (PM-09)**: README e roadmap sono allineati con il setup ≤15 minuti, includono una sezione di troubleshooting e rimandano alla nuova guida [docs/dev-onboarding.md](./dev-onboarding.md) per variabili Vercel, auth callback, storage e Sentry.
10. ✅ **Performance, Legal, Analytics (PM-10/11/12)**: ottimizzati `next/image` e gli header di caching, aggiornati privacy/termini e sostituita la telemetria con un loader Plausible-like che rispetta DNT e consenso.

## Note operative
- Mantenere la protezione branch con lint/build; gli smoke test possono diventare quasi-bloccanti via `SMOKE_ENFORCE=true` se iniziamo a toccare percorsi critici.
- Usare branch per milestone (`pm-xx-nome`) con PR piccole e deploy preview su Vercel per validare feature flag e Sentry/Resend.
