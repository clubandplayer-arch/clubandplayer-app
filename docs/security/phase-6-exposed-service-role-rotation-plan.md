# FASE 6 — Piano coordinato per la credenziale Supabase privilegiata esposta

Data: 2026-09-11  
Stato: **PIANO PRONTO — NESSUNA ROTAZIONE ESEGUITA**

## Perimetro accertato

Il passaggio della variabile Vercel a `Secret` impedisce nuove visualizzazioni casuali, ma non revoca il valore già esposto. La chiave viene consumata esclusivamente lato server dalle route Registry/admin, Ads e notifiche/email, oltre che da script operativi manuali. Browser e Mobile non devono mai riceverla. Il codice accetta anche il vecchio alias `SUPABASE_SERVICE_KEY` in alcuni adapter: durante la sostituzione va verificato che non resti valorizzato con la credenziale esposta.

Non è possibile stabilire dal nome della variabile se lo screenshot contenesse una legacy `service_role` JWT o una nuova secret key `sb_secret_…`; la distinzione deve essere fatta nella Dashboard senza copiare il valore.

## Sequenza proposta, non autorizzata automaticamente

1. In Supabase API Keys identificare **solo tramite tipo/nome/fingerprint**, senza mostrare il valore, a quale progetto appartiene la chiave esposta: Preview `fase6-github`, Production o entrambi.
2. Se è una nuova secret key revocabile, creare una seconda secret key nello stesso progetto. Se è una legacy `service_role` JWT, creare prima una nuova secret key moderna; **non ruotare il JWT secret** in questa attività.
3. Aggiornare `SUPABASE_SERVICE_ROLE_KEY` esclusivamente nello scope Vercel interessato. Eliminare o allineare l'eventuale alias `SUPABASE_SERVICE_KEY`; non cambiare anon/publishable key.
4. Generare un nuovo deployment nello stesso ambiente e verificare, con account amministrativo di test, le route Registry health/claims, Ads serve e notifiche/email. Verificare soltanto status HTTP e assenza di errori credenziali, senza inviare notifiche reali se non previsto.
5. Dopo PASS del nuovo deployment, revocare la vecchia secret key dalla Dashboard Supabase e ripetere i probe. Conservare soltanto fingerprint, data e risultato.
6. Cercare la vecchia credenziale anche in altri provider/deployment e aggiornare eventuali job esterni prima della revoca. Gli script locali non devono contenere valori persistenti.
7. Se la credenziale esposta è la legacy JWT non revocabile singolarmente, fermarsi dopo la migrazione dei consumer alla nuova secret key. La successiva rotazione del JWT secret è un rollout Production separato perché può invalidare legacy anon/service keys e client pubblicati.

## Consumer da includere nel canary

- Registry pubblico e amministrativo: ricerca club, claim, contestazioni, approvazione/rifiuto e health.
- Ads serving.
- Invio notifiche applicative, email e notifiche Opportunity.
- Adapter server `lib/supabase/admin.ts` e script manuali di import/seed/check soltanto se usati nell'ambiente interessato.

## Stop gate

Nessuna revoca prima che il nuovo deployment abbia superato i consumer necessari. Nessun secret deve entrare in Git, log, PR, screenshot o endpoint diagnostici. Production non viene inclusa per inferenza: se il fingerprint mostra che l'esposizione riguarda Production, serve una specifica autorizzazione prima di modificarne la variabile o revocare la chiave.
