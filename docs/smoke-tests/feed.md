# Smoke test `/feed` (post e media)

> **Ultima esecuzione:** 10/03/2025 (run `docs/smoke-tests/runs/2025-03-10.md`) – ✅ completata.

Checklist manuale per verificare la bacheca autenticata con post di testo + immagini/video caricati nel bucket `posts`.

## Prerequisiti
- Variabili configurate:
  - `SUPABASE_SERVICE_ROLE_KEY` disponibile sull'API solo per il fallback di insert nel caso in cui le RLS blocchino il record `posts`.
  - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` valide per l'ambiente di test.
  - `NEXT_PUBLIC_POSTS_BUCKET` valorizzato se usi un bucket diverso da `posts`.
- Esegui `node scripts/check-feed-config.mjs` per assicurarti che bucket e tabella `posts` siano raggiungibili (lo storage ora è gestito direttamente dal client Supabase).
- Bucket Storage:
  - Esiste il bucket `posts` (o quello indicato in `NEXT_PUBLIC_POSTS_BUCKET`) ed è pubblico.
  - Policy RLS Storage coerenti: l'utente autenticato può fare `upload` sul bucket; non è più previsto il proxy via API.
- Account Supabase autenticato (club o atleta) e almeno 1 post esistente per confrontare il filtraggio.

## Flusso base (creazione post)
1. Login con un utente qualsiasi (club o atleta).
2. Visita `/feed`: deve comparire la lista post filtrata per ruolo dell'autore.
3. Nel composer, scrivi un messaggio di test e premi "Pubblica":
   - Atteso: risposta 201 e il post appare in cima senza errori.
   - Se ricevi `insert_failed` o 401, verifica `SUPABASE_SERVICE_ROLE_KEY` e le policy RLS su `posts`.
4. Aggiorna la pagina: il nuovo post resta visibile e modificabile/eliminabile solo dall'autore.

## Allegare immagini/video
1. Nel composer clicca "Allega foto/video" e scegli un file ammesso:
   - Immagini: JPEG/PNG/WebP/GIF fino a 8MB.
   - Video: MP4/QuickTime fino a 50MB (upload diretto su Supabase Storage).
2. Pubblica il post con o senza testo.
   - Atteso: il client carica il file direttamente nel bucket `posts/<auth.uid>/...` e la POST a `/api/feed/posts` salva `media_url`/`media_type` usando il percorso ottenuto.
   - In UI deve comparire l'anteprima immagine o il player video dopo il refresh.
3. Ripeti con un video per garantire che il bucket `posts` consenta sia immagini sia video.

Se ricevi `new row violates row-level security policy` durante l'upload, verifica le policy di `storage.objects` (bucket `posts`) e che il percorso rispetti lo schema `<auth.uid>/<nome_file>`; gli errori `Upload non riuscito: ...` indicano bucket mancante o ACL errata.

## Diagnosi rapida
- `new row violates row-level security policy` su POST: l'API ha fatto fallback al client utente; verifica che l'utente autenticato sia proprietario del post.
- Filtri vuoti: controlla i ruoli in `profiles.account_type`/`profiles.type` e che l'utente abbia un valore coerente (`club`/`athlete`).
