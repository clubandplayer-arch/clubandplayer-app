# Smoke test end-to-end (club e atleta)

> **Ultima esecuzione:** 10/03/2025 (run `docs/smoke-tests/runs/2025-03-10.md`) – ✅ completata.

Checklist per verificare rapidamente che le principali funzionalità funzionino sia per un club sia per un atleta, usando un ambiente di test effimero e da eliminare al termine.

## Ambiente effimero
- Crea un nuovo progetto Supabase di test (o una nuova base dati) per isolare i dati.
- Configura le variabili `.env.local` (o Vercel preview) con le chiavi del progetto di test:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  - Bucket Storage pubblico `posts` (o `NEXT_PUBLIC_POSTS_BUCKET`) e tabella `posts` esistente.
- Esegui `pnpm install` e `pnpm dev` in locale per interagire con l'app; usa account separati per club e atleta.
- **Teardown**: a fine test elimina i dati di prova (profili/post/candidature/opportunità) o distruggi il progetto Supabase per non lasciare residui.

## Percorso atleta
1. **Registrazione e profilo**: crea un account atleta, completa il profilo (bio, sport, ruolo). Salva e ricarica la pagina: i dati devono persistere.
2. **Media profilo**: carica una foto profilo (video opzionale solo se riabilitato nel progetto di test); verifica che la nuova immagine sia visibile dopo il refresh.
3. **Feed**: pubblica un post test con immagine (8MB max) e, se possibile, un secondo con video MP4. Atteso: upload riuscito, visualizzazione dell'anteprima e assenza di `insert_failed`/`upload_failed`.
4. **Ricerca club**: vai su `/search-map`, disegna un’area e applica filtri club/sport: i risultati devono popolarsi senza errori API.
5. **Candidatura**: dalla lista opportunità, apri un'opportunità e invia una candidatura. Atteso: conferma di invio e visibilità in "Le mie candidature".

## Percorso club
1. **Registrazione e profilo**: crea un account club, compila dettagli (nome, città/provincia/regione/Paese, bio). Dopo refresh i dati restano e sono visibili nella ricerca.
2. **Feed**: pubblica almeno un post con media (immagine o video) oltre a uno di testo; verifica che resti visibile agli altri utenti con corretta ownership RLS.
3. **Opportunità**: crea un'opportunità, verifica che appaia nella lista pubblica e che le candidature arrivino sul pannello club senza errori RLS.
4. **Candidature ricevute**: apri `/applications/received` e controlla che la tabella mostri le candidature con i dettagli corretti; nessun 401/403/500.
5. **Ricerca club**: ricerca il proprio club su `/search-map` (area + query testuale) per verificare che location e display name siano indicizzati e che i filtri rispondano.

## Controlli trasversali
- **Sicurezza**: verifica che le API protette (CRUD club, opportunità, candidature) rispondano 401/403 se richiamate da utente non autorizzato.
- **Email/Notifiche**: con `RESEND_API_KEY` configurato e `NOOP_EMAILS=false`, prova una notifica (es. candidatura) e controlla che arrivi impostando `BRAND_REPLY_TO`.
- **Sentry**: assicurati che `SENTRY_ENVIRONMENT`/`NEXT_PUBLIC_SENTRY_ENVIRONMENT` e la release siano valorizzate e che i filtri anti-rumore non blocchino errori reali.
- **Pulizia dati**: elimina post/opportunità/candidature di test e conferma che l'interfaccia reagisca senza errori; se usi progetto effimero, distruggilo.
