# Smoke test `/applications/received` (candidature)

Checklist per garantire che un club possa vedere le candidature ricevute senza violazioni RLS.

## Prerequisiti
- Variabili configurate:
  - `SUPABASE_SERVICE_ROLE_KEY` disponibile per le API (obbligatorio per leggere le candidature bypassando RLS).
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` valorizzate.
- Dati di test:
  - Almeno 1 opportunità creata dal club corrente (`opportunities.owner_id` o `created_by`).
  - Almeno 1 candidatura associata a quelle opportunità (`applications.opportunity_id`).
- Account Supabase **club** loggato nell'app.

## Flusso di verifica
1. Autenticati come club proprietario delle opportunità di test.
2. Vai su `/applications/received` (o `/club/applicants`):
   - Atteso: la tabella mostra le candidature con nome atleta, data e stato.
   - Nessun errore 401/403/500.
3. Se la tabella è vuota ma esistono candidature nel DB:
   - Controlla che l'ambiente esponga `SUPABASE_SERVICE_ROLE_KEY` (l'endpoint rifiuta senza).
   - Verifica che `applications.opportunity_id` punti alle opportunità del club loggato.
4. Forza un refresh: la pagina non deve lampeggiare su errori e deve mantenere i dati caricati.

## Diagnosi rapida
- Risposta 500 con messaggio "Servizio non configurato": manca `SUPABASE_SERVICE_ROLE_KEY` lato server.
- Risposta 200 ma lista vuota: controlla che `owner_id`/`created_by` delle opportunità coincidano con l'utente loggato e che le candidature siano legate a quei record.
- Errori CORS/fetch: apri la console browser e verifica che `/api/applications/received` risponda 200; se 401, rifai login.
