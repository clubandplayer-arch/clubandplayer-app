# Go Live roadmap – Club&Player (post 2025-12-06)

Questa roadmap riassume i punti aperti emersi da:
- docs/linkedin-gap-analysis-2025-12-06.md
- docs/repo-health-audit-2025-12-06.md

Le attività critiche per la messa in produzione iniziale sono state completate:

- [x] TECH-01 – Protezione webhook `/api/webhooks/sync` con secret
- [x] NOTIF-01 – Badge notifiche in navbar + segna tutte come lette
- [x] SEARCH-01 – Layout mappa + lista risultati in `/search-map`
- [x] FEED-01 – Reshare / quote dei post
- [x] Dock messaggistica stile LinkedIn + service unificato
- [x] Layout wide 3 colonne (feed) + banner ADV
- [x] Tema gradiente condiviso tra dashboard, login e signup
- [x] Cleanup routing/feature legacy (search/messages, ecc.)

Da qui in avanti le attività sono **post-Go Live**: non bloccano il lancio ma aumentano valore e robustezza.

---

## 1. Funzionalità “tipo LinkedIn” ancora aperte

Questi job derivano da `linkedin-gap-analysis-2025-12-06.md`. Sono ordinati per area e priorità, ma tutti NON bloccano il Go Live.

### [x] FEED-02 – Vista “Seguiti” nel feed *(priorità: media)*

- Obiettivo: aggiungere un toggle o filtro “Tutti” / “Solo profili che segui” nel feed.
- Usa le relazioni `follows` già esistenti; non richiede nuove tabelle.
- Utile quando il feed diventerà più popolato.

### [x] PROFILE-01 – Competenze / endorsement *(completato)*

> Skills su `profiles`, tabella `profile_skill_endorsements`, endpoint `/api/profiles/[id]/skills/endorse` e UI profilo con contatori reali (`ProfileSkill = { name, endorsementsCount, endorsedByMe }`).

### [x] JOBS-01 – Filtri avanzati opportunità + suggerimenti *(completato, ex priorità: media)*

- Stato: implementati filtri avanzati (ruolo, categoria/livello, sport, località, stato) e la sezione “Opportunità per te”
  basata su sport/area del profilo.
- Avvicina la sezione opportunità a “LinkedIn Jobs”.

> NOTIF-01 e SEARCH-01 risultano già completati.

---

## 2. Salute tecnica (repo health) – Debito da smaltire

Questi job derivano da `repo-health-audit-2025-12-06.md` (sezione TECH-XX).

### [x] TECH-02 – Validazione schema API feed/follow *(completato)*

> Zod per payload/query di feed/follow con gestione errori RLS/DB già in produzione.

### [x] TECH-03 – Hook/service feed unificati *(priorità: media)*

- Rischio: la pagina feed fa più fetch/stati locali separati, con potenziale complessità.
- Obiettivo:
  - estrarre un hook `useFeed()` o simile che:
    - incapsuli fetch iniziale, refresh, error handling,
    - esponga un’unica API al componente UI.
- Beneficio: codice più leggibile e facile da estendere.

### [~] TECH-04 – Paginazione / virtualizzazione feed *(parziale)*

> **Stato attuale**
> - L’endpoint `/api/feed/posts` espone un parametro `limit` (default 10, hard cap 50) ma non implementa ancora pagina/cursor: la risposta torna sempre con `nextPage: null` e non usa un offset/cursor server-side.
> - L’hook `useFeed()` implementa l’infinite scroll lato client usando page/limit e un sentinel, ma calcola `nextPage` in locale e può finire per ricaricare più volte la stessa prima pagina.
> - La pagina `/feed` rende tutti i post in una lista `.map` senza virtualizzazione: all’aumentare dei post il DOM cresce linearmente.
>
> **Post-Go Live (fase 2)**
> - Introdurre una vera paginazione backend (cursor o offset) per `/api/feed/posts` con un campo `nextCursor` esplicito, da usare in `useFeed()` al posto del fallback attuale.
> - Valutare e implementare una lista virtualizzata (es. `react-virtuoso` o simile) da attivare oltre una certa soglia di post (es. 100+), per mantenere il feed reattivo anche con molti elementi.
> - Rivedere i limiti e la sanitizzazione dei parametri di pagina per evitare richieste troppo “pesanti”.

### [~] TECH-05 – Error handling coerente sulle API principali *(parziale)*

> **Stato attuale**
> - Le API di messaggistica (`/api/direct-messages/*`), notifiche (`/api/notifications/*`), opportunità (`/api/opportunities/*`) e search-map (`/api/search/map`) utilizzano già l’helper condiviso `standardResponses`, con shape uniforme `{ ok, data|error, message }` e codici HTTP coerenti (4xx/5xx) per errori di payload, auth e DB.
> - Le API di feed (`/api/feed/posts`, reazioni, commenti) e follow (`/api/follows*`) usano invece un helper dedicato (`feedFollowResponses`) con shape e naming diversi; alcune risposte non espongono errori dettagliati o eventuali metadati (es. cursor).
>
> **Post-Go Live (fase 2)**
> - Progettare una migrazione graduale di feed e follow verso `standardResponses`, mantenendo la compatibilità con il frontend esistente (es. introducendo un sottoschema `data.feed` / `data.follow` invece di cambiare brutalmente le shape).
> - Allineare codici HTTP e messaggi di errore alle convenzioni già adottate in messaging/notifications/opportunities/search-map.
> - Aggiungere, dove mancano, informazioni strutturate sugli errori (es. tipo `invalidPayload`, `notAuthenticated`, `forbidden`) per semplificare la gestione lato client.

---

## 3. Ordine suggerito dei prossimi sprint post-Go Live

1. **Hardening tecnico**
   - TECH-02 (validazione schema API feed/follow) – completato
   - TECH-05 (allineare feed/follow a `standardResponses`)
2. **Valore visibile al’utente**
   - FEED-01 (reshare/quote post) **oppure** JOBS-01 (filtri opportunità), in base alla direzione di prodotto.
3. **Scalabilità e manutenzione**
   - TECH-03 (hook/service feed),
   - TECH-04 (cursor + virtualizzazione feed),
   - FEED-02, PROFILE-01 quando il traffico e le esigenze dei club lo suggeriranno.

Questa roadmap è pensata come guida post-Go Live: il progetto è considerabile al 100% “pronto” per lanciare, ma ha una coda chiara di miglioramenti da pianificare negli sprint successivi.

---

## 4. UX e rifiniture dashboard

- [x] UX-MEDIA-01 – Rifiniture MyMedia (header, tab Video/Foto, card media, empty state, microcopy share) – SOLO UI, nessun cambiamento a feed/API.
- [x] UX-PROFILE-UI-01 – Badge Club/Player e rifinitura Competenze (view+edit) – SOLO UI.
- [x] UX-ONBOARDING-01 – Alleggerimento e chiarificazione del box onboarding in /feed (SOLO UI, logica dismiss invariata).
