# Stato verso la Beta — novembre 2025

Questo documento fotografa l'analisi corrente della codebase e i passi prioritari per completare la versione **Beta**, riallineando quanto già presente nella roadmap post-MVP.

## Cosa è stato analizzato
- **Stack e setup**: confermato l'impianto Next.js 15.5/React 19/TypeScript 5 con Tailwind 4, Supabase (Auth/DB/Storage) e Sentry 10, gestito con pnpm 10.17.1 su Node 22 come baseline consigliata. Il README riporta anche le variabili d'ambiente chiave e la struttura repository (app, components, lib, hooks, types, supabase, tests, docs, scripts).
- **Roadmap post-MVP**: riviste le milestone PM-01…PM-12 per capire le feature e i controlli mancanti prima della Beta (email reali, A11y, riapertura CRUD club sotto flag admin, ricerca/filtering UI, tuning Sentry, sicurezza Supabase, artifact E2E, onboarding dev, performance, legal, analytics).

## Stato attuale sintetico
- MVP stabilizzata con `/clubs` in sola lettura e smoke test Node runner già documentati; deployment orientato a Vercel con flag di feature e configurazione Sentry/Resend opzionale.
- Documentazione aggiornata e coerente: README, roadmap operative (`ROADMAP.md`, `ROADMAP-post-MVP.md`) e audit repository già disponibili come base di riferimento.

### Recap ultimi interventi
- **Feed**: post di testo, modifica e cancellazione sono ora gestiti interamente con il client di sessione e rispettano le policy RLS. Le tab media sono state dismesse per eliminare i conflitti Storage.
- **Candidature**: `/club/applicants` legge i dati direttamente con il client autenticato (fallback admin solo se necessario) e le colonne `club_id`/`media` sono consolidate tramite migrazioni Supabase.
- **Avatar profilo**: l'upload usa helper dedicati con controlli espliciti sulla chiave service-role, rimuovendo gli errori RLS storici.
- **Pipeline**: gli artifact degli smoke test sono pubblicati a ogni CI run e `SMOKE_ENFORCE` può rendere il check bloccante per percorsi critici.
- **Documentazione**: README, roadmap, onboarding e stato Beta sono allineati; la sezione troubleshooting copre Vercel env, callback Supabase, storage e Sentry.

### Checklist finale per dichiarare la Beta
1. **Smoke test completi**: eseguire tutte le checklist in `docs/smoke-tests/` (feed, clubs, applications, full journey). Allegare gli artifact corrispondenti alla PR/Deploy e mantenere `SMOKE_ENFORCE=true` per i branch di release.
2. **Allineamento ambienti**: verificare che Vercel (Preview/Production) esponga lo stesso set di variabili di `.env.local` (Resend, Sentry, Supabase, analytics). Usare gli script `scripts/check-*.mjs` per email, Sentry, feed e flag clubs.
3. **Feature flag**: decidere il rollout combinato di `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` e `CLUBS_ADMIN_EMAILS`, assicurando almeno un account admin attivo e monitorato. Documentare il piano di inversione flag in caso di problemi.
4. **Monitoraggio**: confermare che Sentry riceva eventi con `environment`/`release` corretti e che l'analytics privacy-first sia abilitato solo dopo il consenso. Configurare alert minimi per `/api/*` e feed.
5. **Comunicazione legale**: rivedere un'ultima volta le pagine `/legal/privacy` e `/legal/terms`, linkarle dal footer e predisporre i testi per l'informativa beta agli utenti invitati.
6. **Supporto/triage**: definire chi gestisce Resend inbox (`BRAND_REPLY_TO`) e predisporre un canale Sentry/Slack per segnalare errori critici durante la beta chiusa.

Quando la checklist sopra è stata completata, aggiornare questo file con la data del via libera e aprire la sezione “Post Beta” per i miglioramenti successivi (es. reintroduzione upload media, nuove analytics, etc.).

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
