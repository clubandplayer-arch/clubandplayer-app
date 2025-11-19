# Onboarding dev & troubleshooting

Questa guida raccoglie gli step minimi per avviare il progetto in meno di 15 minuti e una serie di diagnosi rapide per i problemi più frequenti (variabili Vercel, callback Supabase, storage feed e Sentry).

## Setup <15 minuti
1. **Prerequisiti**
   - Node.js 22 (minimo 20) + pnpm 10.17.1 (`corepack prepare pnpm@10.17.1 --activate`).
   - Accesso al progetto Supabase e alla dashboard Vercel.
2. **Installazione**
   ```bash
   pnpm install --frozen-lockfile
   cp docs/env.sample .env.local
   ```
3. **Variabili chiave**
   - Copia su `.env.local` e su Vercel > Project Settings > Environment Variables gli stessi valori per Supabase, Sentry, Resend e feature flag.
   - Esegui `vercel env pull .env.vercel.preview --environment preview` e `vercel env pull .env.vercel.production --environment production`, quindi lancia `node scripts/check-vercel-env.mjs --local=.env.local --preview=.env.vercel.preview --production=.env.vercel.production` per verificare che i tre ambienti siano allineati.
   - Verifica con `pnpm dev` che il server parta su `http://127.0.0.1:3000`.
4. **Smoke test**
   - Lancia `pnpm test:e2e` (richiede ~1 minuto) per avere una baseline dello stato dell'app.

> Suggerimento: la pagina `/app/debug/env` mostra un riepilogo runtime delle variabili più importanti (solo in dev).

## Troubleshooting rapidi

### Variabili Vercel/ENV desincronizzate
- **Sintomi**: build preview che falliscono con `NEXT_PUBLIC_*` mancanti, client che usa URL sbagliati.
- **Check**:
  1. Confronta `.env.local` e `docs/env.sample` con le sezioni "Production" / "Preview" di Vercel.
  2. Genera i file `.env.vercel.preview` / `.env.vercel.production` con `vercel env pull` e lancia `node scripts/check-vercel-env.mjs --local=.env.local --preview=.env.vercel.preview --production=.env.vercel.production` per ottenere la lista delle variabili mancanti.
  3. Verifica `NEXT_PUBLIC_BASE_URL` e `NEXT_PUBLIC_SUPABASE_URL` coincidano con l'host effettivo del deploy.
  4. Esegui `node scripts/check-feed-config.mjs`, `node scripts/check-sentry-config.mjs` e `node scripts/check-monitoring.mjs --env-file .env.vercel.production` per ulteriori variabili mancanti.
- **Fix**: aggiorna le environment su Vercel e riesegui `vercel env pull` se usi i file `.vercel/env.*`.

### Callback Supabase/Auth rotte su URL errati
- **Sintomi**: login completato ma redirect su pagina vuota o 404.
- **Check**:
  1. In Supabase > Authentication > URL Settings assicurati che `Site URL` punti alla produzione (es. `https://clubandplayer.app`).
  2. In "Additional Redirect URLs" includi `http://127.0.0.1:3000` e `http://localhost:3000` per lo sviluppo.
  3. Lato Next.js, controlla che `NEXT_PUBLIC_BASE_URL` e `SUPABASE_URL` coincidano con quanto configurato in Supabase.
  4. Se usi Vercel Preview, aggiungi l'URL preview alla lista redirect prima di effettuare test di login.
- **Fix**: aggiorna le URL in Supabase, poi ripeti il login (clear storage/cookie o `pnpm dev --clear-screen`).

### Storage feed (bucket `posts`) non disponibile
- **Sintomi**: errori `new row violates row-level security policy` o `bucket not found` quando si pubblicano post (ora solo testuali, ma i check restano utili).
- **Check**:
  1. In Supabase > Storage verifica che esista il bucket `posts` e che le policy consentano `auth.uid() = owner` per insert/select.
  2. Lancia `node scripts/check-feed-config.mjs` per confermare la presenza del bucket e delle policy lato CLI.
  3. Se in futuro riabiliti media, controlla che i path seguano `posts/<user_id>/...`.
- **Fix**: crea/ricrea il bucket e reimporta le policy dal file `supabase/migrations/*feed*.sql`.

### Sentry (DSN o release mancanti)
- **Sintomi**: errori non arrivano in dashboard o sono etichettati su `production` generico.
- **Check**:
  1. Conferma `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` e gli environment `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT`.
  2. Imposta `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` oppure lascia che Vercel popoli `VERCEL_GIT_COMMIT_SHA` (già gestito dagli helper in `lib/sentry/config.ts`).
  3. Esegui `node scripts/check-sentry-config.mjs` prima del deploy e, quando devi allegare una prova del monitoraggio, `node scripts/check-monitoring.mjs --env-file .env.vercel.production --send-event` (vedi `docs/monitoring/runbook.md`).
- **Fix**: aggiorna le env e rilancia `pnpm run build` localmente per verificare che il bootstrap non lanci warning.

### Auth callback 500 su `/api/auth/callback`
- **Sintomi**: dopo il login appare errore generico 500.
- **Check**:
  1. Assicurati che `SUPABASE_SERVICE_ROLE_KEY` sia valorizzata quando usi API che richiedono privilegi elevati.
  2. Controlla i log di Vercel per eccezioni legate a `auth.getUser()` o mismatch delle chiavi Supabase.
- **Fix**: rigenera le chiavi in Supabase, aggiornale su Vercel e ripeti il login.

- **Sintomi**: nessun hit in analytics o lo script non compare in `<head>`.
- **Check**:
  1. Imposta `NEXT_PUBLIC_ANALYTICS_DOMAIN` e, se usi un endpoint self-hosted, `NEXT_PUBLIC_ANALYTICS_SRC` / `NEXT_PUBLIC_ANALYTICS_API`.
  2. Conferma che l'utente abbia accettato i cookie (localStorage `cp-consent-v1` con `consent="all"`).
  3. Disattiva eventuali estensioni Do Not Track se vuoi testare in locale: il loader rispetta `navigator.doNotTrack` e non carica script quando il segnale è attivo.
- **Fix**: aggiorna le env e rilancia il client; per forzare un nuovo consenso elimina `cp-consent-v1` da localStorage.

Per problemi diversi, consulta `docs/repo-audit-2025-03-09.md` (sezione rischi) e le checklist in `docs/smoke-tests/`.
