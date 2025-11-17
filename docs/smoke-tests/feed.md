# Smoke test `/feed` (post + media)

Checklist manuale per verificare la bacheca in modalità autenticata, inclusi gli upload media con Supabase Storage.

## Prerequisiti
- Variabili configurate:
  - `SUPABASE_SERVICE_ROLE_KEY` disponibile sull'API per bypassare RLS in fallback (creazione post/upload).
  - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` valide per l'ambiente di test.
  - `NEXT_PUBLIC_POSTS_BUCKET` valorizzato se usi un bucket diverso da `posts`.
- Esegui `node scripts/check-feed-config.mjs` per assicurarti che bucket e tabella `posts` siano raggiungibili con il client service-role.
- Bucket Storage:
  - Esiste il bucket `posts` (o quello indicato in `NEXT_PUBLIC_POSTS_BUCKET`) ed è pubblico. Se non esiste, l'API tenta di crearlo con il client admin.
  - Policy RLS Storage coerenti: l'utente autenticato può fare `upload` sul bucket, oppure è presente il fallback admin.
- Account Supabase autenticato (club o atleta) e almeno 1 post esistente per confrontare il filtraggio.

## Flusso base (creazione post)
1. Login con un utente qualsiasi (club o atleta).
2. Visita `/feed`: deve comparire la lista post filtrata per ruolo dell'autore.
3. Nel composer, scrivi un messaggio di test e premi "Pubblica":
   - Atteso: risposta 201 e il post appare in cima senza errori.
   - Se ricevi `insert_failed` o 401, verifica `SUPABASE_SERVICE_ROLE_KEY` e le policy RLS su `posts`.
4. Aggiorna la pagina: il nuovo post resta visibile e modificabile/eliminabile solo dall'autore.

## Flusso con media (foto/video)
1. Nel composer seleziona **Foto** o **Video**, carica un file valido e pubblica.
2. Controlla che l'upload su Storage vada a buon fine e che l'URL pubblico venga restituito (nessun errore `bucket_not_found` o `public_url_unavailable`).
3. Verifica che il post mostri l'anteprima immagine/video e che l'autore possa eliminarlo.
4. In caso di errore RLS sull'upload, assicurati che il bucket esista e che l'API abbia accesso service-role.

## Diagnosi rapida
- `new row violates row-level security policy` su POST: l'API ha fatto fallback al client utente; aggiungi/controlla `SUPABASE_SERVICE_ROLE_KEY` in ambiente server.
- `bucket_not_found` su upload: crea il bucket `posts` (pubblico) o definisci `NEXT_PUBLIC_POSTS_BUCKET` e riavvia l'API.
- Filtri vuoti: controlla i ruoli in `profiles.account_type`/`profiles.type` e che l'utente abbia un valore coerente (`club`/`athlete`).
