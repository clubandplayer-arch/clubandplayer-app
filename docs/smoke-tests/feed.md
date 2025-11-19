# Smoke test `/feed` (post di testo)

> **Ultima esecuzione:** 10/03/2025 (run `docs/smoke-tests/runs/2025-03-10.md`) – ✅ completata.

Checklist manuale per verificare la bacheca autenticata (solo post di testo, upload media disattivati nella Beta).

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

## Nota sui media
Durante la Beta l'upload di foto/video è disabilitato: eventuali controlli in UI devono risultare nascosti e l'endpoint `/api/feed/posts` deve rifiutare payload con `media_url`/`media_type`.

## Diagnosi rapida
- `new row violates row-level security policy` su POST: l'API ha fatto fallback al client utente; verifica che l'utente autenticato sia proprietario del post.
- Filtri vuoti: controlla i ruoli in `profiles.account_type`/`profiles.type` e che l'utente abbia un valore coerente (`club`/`athlete`).
