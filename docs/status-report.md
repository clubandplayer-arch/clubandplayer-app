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

## Come utilizzare questo documento
- Condividere l'URL GitHub di `docs/status-report.md` nella chat di supporto o in qualsiasi conversazione con altri collaboratori.
- Usarlo come checklist per pianificare correzioni mirate, una volta deciso di intervenire sul codice.
- Aggiornarlo man mano che i problemi vengono risolti o che ne emergono di nuovi.

