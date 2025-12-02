# Core rewrite plan (search-map, follow, messaging)

## Visione
Costruire un "LinkedIn per lo sport" con profili Club e Player/Athlete, opportunità e feed social. Ogni scelta tecnica deve mantenere i flussi chiave affidabili: ricerca su mappa, follow/unfollow e messaggistica.

## Domain model attuale
- **Profile** (tabella `profiles`): contiene `account_type` (`club`, `athlete`, `player`), dati anagrafici, localizzazione, avatar, sport/ruolo. Tipi centralizzati in `types/profile.ts` e `types/domain.ts`.
- **Club** (`types/club.ts`): estende `Profile` con info sportive (lega, categoria, staff).
- **Athlete/Player** (`types/application.ts`, `types/opportunity.ts`): collegati a candidature e opportunità; ruoli, sport, disponibilità, posizione geografica.
- **Opportunities** (API `app/api/opportunities/*`): pubblicazione e filtro offerte; collegata a candidature (`applications`).
- **Follow** (`follows` Supabase + hook `hooks/useFollowState.ts`): relazione follower → target (club o player) con `target_type`.
- **Feed** (`app/api/feed/*`): post, reazioni, commenti; utilizza i follow per costruire il feed personalizzato.
- **Messaging** (`conversations`, `messages` + tipi in `types/messaging.ts`): conversazioni bipartite `participant_a`/`participant_b`, lista messaggi e ultimi preview.

## API map (principali)
- **Ricerca/mappe**: `app/api/search/map/route.ts` costruisce query per i profili entro un bounding box. Altre ricerche legacy: `app/search/*` (athletes, club) senza mappa.
- **Follow**: `app/api/follows` (stato), `app/api/follows/toggle`, `app/api/follows/list`, `followers`, `suggestions`. Utenze disparate consumano queste rotte in modo non uniforme.
- **Messaging**: `app/api/messages` (invio), `app/api/messages/threads`, `app/api/messages/start`, `app/api/messages/[id]` (dettaglio). UI in `app/(dashboard)/messages`.
- **Profilazione**: `app/api/profiles/*`, `app/api/club/logo`, `app/api/views` (conteggi), `app/api/auth/*` (sessione/whoami).
- **Opportunità**: `app/api/opportunities/*`, `applications/*`, `notify-opportunity`.

## Component / page map
- **Search-map UI**: `app/(dashboard)/search-map/SearchMapClient.tsx` + `page.tsx`; usa Leaflet client-side e chiama `/api/search/map` con bbox + filtri.
- **Profili**: `/c/[id]` (club), `/athletes/[id]`, `/u/[id]`, `/profile` (dashboard). I pulsanti follow/messaggia sono replicati con logiche disallineate.
- **Messaging UI**: `app/(dashboard)/messages/*` (lista, thread), utilizza API `messages`/`threads`/`[id]`.
- **Feed**: `app/(dashboard)/feed/*` integra follow per personalizzare post.
- **Follow list**: `app/(dashboard)/following/page.tsx` legge `follows` e profili associati.

## Duplicazioni / legacy / conflitti
- **Ricerca**: doppia implementazione (`app/(dashboard)/search-map` con bbox + testi e `app/search/*` per athlete/club). I filtri testuali non sono condivisi e non c'è un adapter unico per query.
- **Follow state**: hook `useFollowState` convive con fetch manuali (es. controlli in pagine opportunità e profili). Manca un singolo provider e un'API unica di toggle richiamata ovunque.
- **Messaging**: più rotte (`start`, `threads`, `[id]`, `messages`) con logiche simili; alcuni componenti creano conversazioni client-side, altri assumono l'esistenza. Non esiste un service unico per apertura/creazione conversazioni.
- **Store duplicati**: alcune pagine importano direttamente Supabase lato server (es. opportunità) mentre altre passano per API, creando divergenza di forma dati e cache.
- **Error handling**: logging limitato o inesistente su punti critici (bbox, follow toggle, creazione messaggi), rendendo difficile il debug dei flussi end-to-end.

## Cosa tenere
- Tipi consolidati (`types/*`) per dominio, messaging e opportunità.
- API consolidate e compatibili con Supabase: `/api/follows/*`, `/api/messages/*`, `/api/search/map` (da estendere), `/api/opportunities/*`.
- Hook condivisi riutilizzabili: `useCurrentProfileContext`, `useFollowState` (da potenziare e rendere l’unico punto di verità).
- UI principali già allineate alla visione: `app/(dashboard)/search-map`, pagine profilo (`/c/[id]`, `/athletes/[id]`, `/profile`), messaging dashboard.

## Cosa eliminare o archiviare
- Ricerca legacy senza mappa in `app/search/*` (athletes/club) se non integrata nello stesso servizio di ricerca con bbox/testo.
- Chiamate dirette a Supabase lato client o server che duplicano `/api/follows/toggle` e `/api/messages/*`. Preferire un service client (es. `lib/api/follows.ts`, `lib/api/messaging.ts`).
- Hook/store locali per follow o messaggistica non basati su `useFollowState` o sul futuro messaging service.
- API alternative di messaging che non gestiscono creazione+recupero in un unico passo (valutare merge di `start`+`[id]`).

## Proposta di riscrittura (branch suggerito `codex/rewrite-core-2025-02-02`)
1. **Service layer unico**
   - Creare adapter client in `lib/services/search.ts`, `lib/services/follow.ts`, `lib/services/messaging.ts` che incapsulano fetch, parsing e logging.
   - Ogni UI importa solo i service e non effettua fetch ad hoc.
2. **Follow flow**
   - Esporre `FollowProvider` basato su `useFollowState` che inizializza lo stato (`/api/follows`) e fornisce `toggleFollow(targetId, targetType)` con ottimismo e rollback su errore.
   - Sostituire pulsanti follow in profili, search-map, opportunità con un componente unico `FollowButton` (lib/components) che usa il provider.
3. **Messaging flow**
   - Unire `start` + `threads` + `[id]` in un service `openConversation(targetProfileId)` che crea o recupera e ritorna `ConversationDetail` + messaggi.
   - UI: pulsante "Messaggia" richiama il service e naviga/mostra thread; invio messaggi con append immediata (ottimistico) e sync server.
   - Logging dettagliato su input, response e errori.
4. **Search-map**
   - Normalizzare query builder con funzione pure che accetta `bbox + text + filtri (sport, ruolo, location)` e restituisce payload per `/api/search/map`.
   - Applicare filtraggio client-side che rispetta l’area disegnata (`pointInPolygon`) evitando di rimuovere punti interni; loggare parametri e risultati.
   - Riallineare i filtri testuali con la logica di `app/search/*` o dismettere le vecchie pagine.
5. **Logging e osservabilità**
   - Aggiungere console/error log strutturati (tag `[search-map]`, `[follow]`, `[messaging]`) lato client e server.
   - Integrare Sentry per errori critici se non già registrato nelle rotte interessate.
6. **Test e manuale**
   - Automatizzare smoke test CLI (`pnpm lint`, `pnpm exec tsc --noEmit --pretty false --project tsconfig.json`, `pnpm run build`).
   - Manuale: flow ricerca con testo+bbox, follow/unfollow da profilo e search, messaggi da profilo con creazione recupero thread.

## Prossimi passi operativi
- Creare il branch di riscrittura e migrare progressivamente iniziando dai service layer.
- Rifattorizzare search-map per usare il nuovo builder e logging.
- Rifattorizzare FollowButton e messaging UI per dipendere dai nuovi service.
- Rimuovere/archiviare le pagine legacy di ricerca e i fetch diretti che bypassano le API comuni.
