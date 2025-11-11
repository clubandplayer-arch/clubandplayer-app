# Stato attuale del progetto "Club and Player"

Questo documento riassume la situazione corrente della repository dopo il rollback, così che possa essere condiviso rapidamente (ad esempio incollando il link al file nella chat di supporto) e fornire a chi legge un quadro fedele dei problemi ancora aperti.

## Contesto
- Applicazione Next.js 15 con Supabase per autenticazione e storage dati.
- Deploy su Vercel con `pnpm@10.17.1` come package manager bloccato.
- Ultima richiesta: identificare incongruenze senza proporre patch immediate.

## Stato delle criticità (febbraio 2025)
- ✅ **Variabili Supabase allineate** – sia il client server-side sia gli handler API ora leggono `SUPABASE_*` con fallback automatico a `NEXT_PUBLIC_SUPABASE_*`, così da funzionare con un unico set di variabili su Vercel e in locale.
- ✅ **Owner delle opportunità coerente** – tutte le API, i componenti e le pagine usano `owner_id` (con alias legacy `created_by` solo per compatibilità in lettura), permettendo ai club di gestire annunci e candidature senza blocchi RLS.
- ✅ **Ruolo /whoami corretto** – l'endpoint normalizza `account_type` e restituisce il ruolo effettivo, evitando che gli utenti autenticati finiscano nello stato "guest".
- ✅ **Login Google abilitato ovunque** – rimossa la whitelist rigida di domini dalla pagina di login; Supabase può reindirizzare a `/auth/callback` da qualsiasi origine configurata nel progetto.
- ✅ **Script duplicato rimosso** – eliminato il file `club/applicants` che replicava la pagina JSX e poteva causare sovrascritture.
- ✅ **README aggiornato** – le istruzioni riportano ora `pnpm@10.17.1` e i passaggi reali per installare le dipendenze con Corepack.

## Nuove osservazioni (marzo 2025)
- ⚠️ **Form profilo atleta** – il campo "piede preferito" deve salvare valori normalizzati (`right/left/both`) per rispettare il vincolo `profiles_foot_check`; i menu sportivi vanno popolati con l'elenco completo degli sport di squadra.
- ⚠️ **Feed: sezione social** – la colonna "Chi seguire" deve mostrare anche i profili già seguiti, non solo le proposte, così da non farli sparire dopo il follow.
- ⚠️ **Esperienza visiva** – la mini-card profilo necessita di font e avatar più grandi per rispettare il design previsto.
- 🔜 **MVP da completare** – restano da implementare il composer dei post, la colonna pubblicitaria e la sostituzione definitiva dei repository mock con query Supabase (vedi `docs/mvp-next-steps.md`).

## Come utilizzare questo documento
- Condividere l'URL GitHub di `docs/status-report.md` nella chat di supporto o in qualsiasi conversazione con altri collaboratori.
- Usarlo come checklist per pianificare correzioni mirate, una volta deciso di intervenire sul codice.
- Aggiornarlo man mano che i problemi vengono risolti o che ne emergono di nuovi.

