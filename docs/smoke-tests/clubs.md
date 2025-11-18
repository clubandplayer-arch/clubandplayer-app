# Smoke test `/clubs` (guest vs admin)

Questa checklist serve a verificare rapidamente che la pagina `/clubs` si comporti correttamente in modalità **guest** (read-only) e **admin** (CRUD abilitato tramite flag/allowlist).

## Prerequisiti
- Variabili configurate:
  - `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1` (default in prod).
 - `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=1` **solo** sull'ambiente di test/staging in cui provi i CRUD.
  - `NEXT_PUBLIC_CLUBS_ADMIN_EMAILS` e `CLUBS_ADMIN_EMAILS` valorizzate con l'allowlist reale (stesso set su client e server).
  - `ADMIN_EMAILS` / `ADMIN_USER_IDS` opzionali ma allineati, se usati per altri privilegi.
- Prima di iniziare, esegui `node scripts/check-clubs-flags.mjs` per confermare che flag e allowlist siano coerenti (exit code 1 se rileva mismatch).
- Due account Supabase:
  - **Guest**: qualsiasi utente non allowlist.
  - **Admin**: email presente in `CLUBS_ADMIN_EMAILS` (e loggata nell'app).
- Database con almeno 1–2 club esistenti per validare la tabella.

## Flusso guest (read-only)
1. Accedi come **guest** o apri in incognito non autenticato.
2. Visita `/clubs`.
3. Conferma che:
   - La tabella club è visibile (nessun 404/401).
   - **Non** compaiono pulsanti “Crea club”, “Modifica”, “Elimina” né modali.
   - In DevTools (Network → JS) non vengono scaricati chunk aggiuntivi per le modali di editing: il primo caricamento resta leggero in modalità read-only.
   - I link delle card/righe portano a `/clubs/[slug]` (o pagina profilo) senza errori.
4. Verifica che la console browser non mostri errori JS/Supabase.

## Flusso admin (CRUD dietro flag)
1. Attiva `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=1` sull'ambiente di test e riavvia.
2. Effettua login con l'account **admin** dell'allowlist.
3. Visita `/clubs` e controlla che:
   - Siano visibili i pulsanti/azioni per creare, modificare e cancellare club.
   - Le modali di creazione/modifica si aprano correttamente (dynamic import) e pre-compilino i dati esistenti.
   - Un salvataggio di prova risponda 200/201 e aggiorni la tabella senza errori RLS.
4. Ripeti il login come **guest** e verifica che le azioni CRUD siano di nuovo nascoste.

## Note di diagnosi rapida
- Se le candidature risultano vuote per un club, controlla l'endpoint `/api/applications/received` e che il server usi `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS).
- Se il caricamento avatar o allegati feed fallisce con RLS, verifica che le route usino il client service-role e che le policy Storage consentano `insert`/`update` agli utenti previsti.
- Aggiungi log Sentry sul server per chiamate `/clubs` e `/api/clubs` quando abiliti i CRUD in staging.
