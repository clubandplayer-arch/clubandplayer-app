# Fase 2 – Feed & Follow (TECH-04 / TECH-05)

## 1. Contesto attuale (riassunto)
- `/api/feed/posts` accetta `limit` (default 10, hard cap 50) ma non implementa pagina/cursor: la risposta include sempre `nextPage: null` e non espone `nextCursor`/`offset` server-side.
- Il frontend usa `useFeed()` per l’infinite scroll: calcola `page` in locale, usa un sentinel/intersection observer e decide se richiedere la pagina successiva in base alla lunghezza della risposta.
- Senza un cursor server-side, il client può ricaricare più volte la stessa prima pagina, con duplicati e spreco di banda.
- La pagina `/feed` rende tutti i post con `.map` senza virtualizzazione: il DOM cresce linearmente all’aumentare degli elementi, con rischio di rallentamenti su feed lunghi.
- Le API di messaggistica/notifiche/opportunità/search-map usano `standardResponses` (shape `{ ok, data|error, message }`); feed e follow usano invece `feedFollowResponses` con naming/shape diversi e messaggi di errore meno uniformi.
- Obiettivo della Fase 2: introdurre paginazione robusta + virtualizzazione (TECH-04) e allineare feed/follow a `standardResponses` (TECH-05) senza rompere il frontend attuale.

## 2. TECH-04 – Piano in micro-job

### TECH-04A – Cursor backend `/api/feed/posts`
- **Obiettivo:** aggiungere paginazione robusta (cursor o offset) all’endpoint `/api/feed/posts` con campo `nextCursor` esplicito.
- **Impatto previsto:** backend (API + eventuale DB query tuning).
- **Acceptance criteria:**
  - `GET /api/feed/posts` accetta un parametro cursor (es. `cursor=<created_at|id>`) oltre a `limit` con hard cap configurabile.
  - La risposta include `data` e `nextCursor` (null solo quando non ci sono ulteriori elementi).
  - Richieste senza cursor restituiscono la prima pagina ordinata in modo deterministico (es. `created_at DESC`).
  - Parametri invalidi producono errori strutturati (400) con messaggi leggibili.
- **Piano di test manuale:**
  - Utente loggato: verifica pagine successive con `limit` variabile (es. 5, 20) e `nextCursor` non nullo finché ci sono elementi.
  - Nessun post disponibile: risposta con `data: []` e `nextCursor: null`.
  - Edge di rete: simulare lentezza/failure e controllare che l’errore sia strutturato.
- **Rischi/fallback:**
  - Possibili regressioni di performance sulle query: prevedere monitoring e possibilità di ridurre il `limit` default.
  - In caso di problemi, tenere dietro feature flag per ripristinare il comportamento precedente (limit senza cursor).

### TECH-04B – Adattare `useFeed` al cursor
- **Obiettivo:** consumare `nextCursor` e non generare page/offset client-side; eliminare ricarichi duplicati della prima pagina.
- **Impatto previsto:** frontend (hook `useFeed`, eventuale service fetch).
- **Acceptance criteria:**
  - Il hook legge `nextCursor` dalla risposta e lo passa alle fetch successive; `nextPage` client-side non è più calcolato in locale.
  - L’infinite scroll non ripete la prima pagina e gestisce il termine lista quando `nextCursor` è null.
  - Nessuna regressione per utenti loggati/anonimi.
- **Piano di test manuale:**
  - Sessione loggata: scorrere fino a fine feed e verificare che ogni pagina sia diversa (nessun duplicato).
  - Sessione anonima/guest (se supportata): stesso comportamento.
  - Errori di rete: verificare che i messaggi mostrati siano coerenti e il caricamento si fermi.
- **Rischi/fallback:**
  - Se il backend cursor causa problemi, mantenere un toggle per tornare temporaneamente alla logica basata su `limit` solo.

### TECH-04C – Lista virtualizzata (frontend)
- **Obiettivo:** virtualizzare la lista del feed per ridurre il carico DOM su feed lunghi.
- **Impatto previsto:** frontend (componenti feed, potenzialmente layout/stili).
- **Acceptance criteria:**
  - Introduzione di una libreria di virtualizzazione (es. `react-virtuoso` o simile) o di una soluzione custom che renderizzi solo gli elementi visibili.
  - Attivazione condizionale oltre una soglia configurabile (es. 100+ elementi già caricati) per minimizzare la complessità su feed corti.
  - Scroll e focus rimangono fluidi, nessuna regressione nel caricamento di immagini/media.
- **Piano di test manuale:**
  - Feed con molti post (mock o seed): verificare performance di scroll e assenza di “salti” o glitch visivi.
  - Interazioni card (reazioni/commenti) funzionano anche quando gli elementi vengono smontati/remontati.
  - Responsive mobile/desktop.
- **Rischi/fallback:**
  - Potenziali incompatibilità con layout esistenti; prevedere flag per disattivare la virtualizzazione se emergono bug.

## 3. TECH-05 – Piano in micro-job

### TECH-05A – Wrapper `standardResponses` per feed/follow (backend only)
- **Scope:** introdurre un adapter/wrapper che consenta di usare `standardResponses` nelle route feed/follow senza cambiare subito la shape verso il frontend.
- **Acceptance criteria:**
  - Nuovo helper o adapter che mappa le risposte attuali di feed/follow nella forma `{ ok, data|error, message }` internamente, mantenendo la response esterna invariata.
  - Gestione uniforme di errori comuni (400 payload invalidi, 401/403 auth/RLS, 500 errori DB) con messaggi leggibili nei log.
- **Piano di test:**
  - Chiamate manuali alle route feed/follow (successo + errori di auth + payload mancante) verificando che i log usino il nuovo schema e che il client non riceva breaking changes.
- **Strategia rollout:**
  - Feature flag backend per attivare/disattivare il wrapper senza cambiare la risposta esposta.

### TECH-05B – Migrare le route feed a `standardResponses`
- **Scope:** `/api/feed/posts`, reazioni, commenti.
- **Acceptance criteria:**
  - Le risposte pubbliche delle route feed adottano `standardResponses` mantenendo campi di payload compatibili (es. `data.posts`, `nextCursor`).
  - Errori strutturati con codici coerenti (400/401/403/429/500) e messaggi leggibili lato client.
  - Aggiornamento di eventuali tipi condivisi (solo se non breaking) o adapter lato FE se necessario.
- **Piano di test:**
  - Percorso successo: creare post, reagire, commentare e leggere feed verificando struttura e codici HTTP.
  - Percorso errore: payload invalido, user non autenticato, RLS forbidden.
  - Edge: paginazione al termine (nextCursor null), commenti multipli, reazioni duplicate.
- **Strategia rollout:**
  - Migrazione route-by-route, con flag per tornare temporaneamente a `feedFollowResponses` se servisse.

### TECH-05C – Migrare le route follow a `standardResponses`
- **Scope:** `/api/follows*` (follow/unfollow/list/suggestions se presenti).
- **Acceptance criteria:**
  - Shape di successo/allineamento errori come in messaging/notifications (codici 2xx/4xx/5xx coerenti, messaggi leggibili).
  - Compatibilità con frontend esistente (nessuna rottura nelle chiamate correnti).
- **Piano di test:**
  - Percorsi follow/unfollow, liste dei seguiti/seguaci, errori di permesso, parametri mancanti.
  - Verifica caching/invalidazioni se esistono.
- **Strategia rollout:**
  - Flag per rollback rapido; migrazione progressiva endpoint per endpoint.

### TECH-05D – Cleanup finale + messaggi di errore allineati
- **Scope:** rimozione/archiviazione di `feedFollowResponses` (solo quando tutto è migrato) e allineamento messaggi/codici su feed/follow.
- **Acceptance criteria:**
  - Nessun riferimento residuo a `feedFollowResponses` nelle route attive.
  - Messaggi di errore standardizzati (`invalidPayload`, `notAuthenticated`, `forbidden`, `rateLimited`, ecc.) con codici HTTP coerenti.
  - Documentazione aggiornata (README/ROUTE docs) e checklist di regressioni verdi.
- **Piano di test:**
  - Regression su tutte le route feed/follow già migrate; verifica che il frontend riceva shape/coerenza attese.
- **Strategia rollout:**
  - Ultimo step dopo TECH-05B/C; richiede smoke test completo e possibilità di rollback a versione precedente del backend.
