# Stato verso la Beta — novembre 2025

Questo documento fotografa l'analisi corrente della codebase e i passi prioritari per completare la versione **Beta**, riallineando quanto già presente nella roadmap post-MVP.

## Cosa è stato analizzato
- **Stack e setup**: confermato l'impianto Next.js 15.5/React 19/TypeScript 5 con Tailwind 4, Supabase (Auth/DB/Storage) e Sentry 10, gestito con pnpm 10.17.1 su Node 22 come baseline consigliata. Il README riporta anche le variabili d'ambiente chiave e la struttura repository (app, components, lib, hooks, types, supabase, tests, docs, scripts).
- **Roadmap post-MVP**: riviste le milestone PM-01…PM-12 per capire le feature e i controlli mancanti prima della Beta (email reali, A11y, riapertura CRUD club sotto flag admin, ricerca/filtering UI, tuning Sentry, sicurezza Supabase, artifact E2E, onboarding dev, performance, legal, analytics).

## Stato attuale sintetico
- MVP stabilizzata con `/clubs` in sola lettura e smoke test Node runner già documentati; deployment orientato a Vercel con flag di feature e configurazione Sentry/Resend opzionale.
- Documentazione aggiornata e coerente: README, roadmap operative (`ROADMAP.md`, `ROADMAP-post-MVP.md`) e audit repository già disponibili come base di riferimento.

### Segnalibri problemi aperti (da riprendere)
1. **Candidature non visibili dal Club**: verificare le API e i permessi Supabase (service role) per garantire la lettura delle candidature ricevute anche con RLS attive.
2. **Upload foto profilo (Club/Atleti) bloccato**: indagare le policy RLS sul bucket avatar e forzare l'uso del client con chiave service-role o regole Storage adeguate.
3. **Upload foto/video su bacheca/feed impossibile**: controllare l'integrazione Storage per gli allegati feed, le regole RLS e i formati supportati.
4. **Impossibile creare post su /feed**: verificare le API di creazione post, le policy RLS sulle tabelle feed/post e la coerenza con i permessi di upload degli allegati.

### Aggiornamento 06/11
- `/clubs` torna visibile (rimuovendo il 404) e resta **read-only** di default; i controlli CRUD sono caricati solo se `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=1` e l'utente è in allowlist (`NEXT_PUBLIC_CLUBS_ADMIN_EMAILS` / `CLUBS_ADMIN_EMAILS`).
- Le modali di creazione/modifica club sono ora importate in modo dinamico, per contenere il bundle iniziale quando la pagina opera in sola lettura.

### Da fare subito (Beta)
- Popolare `NEXT_PUBLIC_CLUBS_ADMIN_EMAILS` e `CLUBS_ADMIN_EMAILS` con l'allowlist effettiva e decidere quando attivare `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` in staging/preview.
- Validare che la protezione API (guard admin) sia allineata agli allowlist aggiornati e che l'esperienza guest su `/clubs` non mostri errori 401/403.
- Pianificare l'attivazione: testare in staging con account admin/guest e confermare che le azioni CRUD restino invisibili in modalità guest.
- Eseguire la [checklist di smoke test `/clubs` (guest vs admin)](./smoke-tests/clubs.md) a ogni deploy finché il flag resta attivo.
- Lanciare `node scripts/check-clubs-flags.mjs` per allineare rapidamente le allowlist client/server prima di ogni smoke test.
- Collegare i segnalibri aperti (candidature, avatar, upload feed, creazione post feed) a un giro di debug dedicato su staging con client service-role e log Sentry per ogni chiamata API.
- Prima di debuggare la `/feed`, eseguire `node scripts/check-feed-config.mjs` per validare bucket e tabella `posts` con la chiave service-role; seguire la [checklist feed](./smoke-tests/feed.md) per i flussi di creazione post con/ senza media.
- Per le candidature ricevute, seguire la [checklist dedicata](./smoke-tests/applications.md) e assicurare che le API usino la chiave service-role quando necessario.
- Configurare le email reali: popolare `RESEND_API_KEY`, `RESEND_FROM`, `BRAND_REPLY_TO`, disattivare `NOOP_EMAILS` e lanciare `node scripts/check-email-config.mjs` per validare la configurazione prima dei test su `/api/notify-email` e `/api/notifications/send`.
- Aggiornare `.env.local` partendo da `docs/env.sample` e riflettere le stesse variabili su Vercel (Production/Preview) per mantenere l'onboarding dev sotto i 15 minuti.

## Prossimi passi prioritari verso la Beta
1. **Email reali (PM-01)**: configurare Resend (`RESEND_API_KEY`, `RESEND_FROM`, `BRAND_REPLY_TO`) e disattivare il guard NOOP, validando le rotte `/api/notify-email` e `/api/notifications/send` su un ambiente protetto.
2. **Tuning Sentry (PM-07)**: impostare `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` e, se possibile, taggare le release con `VERCEL_GIT_COMMIT_SHA`; definire regole di ignore per errori rumorosi.
3. **Snellimento bundle /clubs read-only (PM-02)**: estrarre i componenti di editing dietro `NEXT_PUBLIC_FEATURE_CLUBS_READONLY` o simili (dynamic import/code-split) e verificare che la dimensione “First Load JS” non cresca.
4. **/clubs edit dietro flag admin (PM-04)**: introdurre la feature flag `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` con allowlist server `CLUBS_ADMIN_EMAILS`, mostrando i controlli CRUD solo agli admin e proteggendo le API.
5. **Filtri ricerca club (PM-05)**: completare la UI `/search/club` collegandola a `/api/clubs` con filtri geo, usando gli indici `pg_trgm` e l'indice `created_at` già previsti.
6. **Security Supabase (PM-06)**: verificare password policy (≥12 caratteri, numeri e simboli), scadenza OTP 900–1800s e rivedere le policy RLS su `profiles`, `clubs` (WITH CHECK coerenti).
7. **CI/CD quasi-bloccante (PM-08)**: pubblicare gli artifact degli smoke test e valutare l'opzione `SMOKE_ENFORCE` per rendere le PR critiche più robuste; considerare reintroduzione Playwright solo se necessario.
8. **Docs & onboarding dev (PM-09)**: mantenere README/roadmap allineati e aggiungere troubleshooting per variabili Vercel, auth callback, storage e Sentry; garantire setup <15 minuti.
9. **Performance, Legal, Analytics (PM-10/11/12)**: ottimizzare next/image e caching, preparare testi privacy/termini e scegliere una soluzione analytics privacy-first con rispetto DNT.

## Note operative
- Mantenere la protezione branch con lint/build; gli smoke test possono diventare quasi-bloccanti via `SMOKE_ENFORCE=true` se iniziamo a toccare percorsi critici.
- Usare branch per milestone (`pm-xx-nome`) con PR piccole e deploy preview su Vercel per validare feature flag e Sentry/Resend.
