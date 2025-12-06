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

### [x] PROFILE-01 – Competenze / endorsement *(priorità: media)*

- Obiettivo: aggiungere una sezione “Competenze” ai profili (player e club) con piccole pillole e endorsement (es. “Velocità”, “Leadership”, “Settore giovanile”).
- Aumenta il valore informativo dei profili in ottica scouting.
- Stato: completato con tabella `profile_skill_endorsements`, API endorse/remove, conteggi in lettura e UI con pulsante e contatori.

### [x] JOBS-01 – Filtri avanzati opportunità + suggerimenti *(completato, ex priorità: media)*

- Stato: implementati filtri avanzati (ruolo, categoria/livello, sport, località, stato) e la sezione “Opportunità per te”
  basata su sport/area del profilo.
- Avvicina la sezione opportunità a “LinkedIn Jobs”.

> NOTIF-01 e SEARCH-01 risultano già completati.

---

## 2. Salute tecnica (repo health) – Debito da smaltire

Questi job derivano da `repo-health-audit-2025-12-06.md` (sezione TECH-XX).

### [x] TECH-02 – Validazione schema API feed/follow *(priorità: alta, ma compatibile con Go Live)*

- Rischio: molte API usano validazione manuale dei payload.
- Obiettivo:
  - introdurre uno schema coerente (es. Zod) per:
    - `/api/feed/*` (creazione post, reazioni),
    - `/api/follows/toggle` e altre rotte follow,
  - uniformare forme di errore (`code`, `message`) e log (Sentry).
- Beneficio: meno bug e input “sporchi” in produzione, errori più chiari.

### [x] TECH-03 – Hook/service feed unificati *(priorità: media)*

- Rischio: la pagina feed fa più fetch/stati locali separati, con potenziale complessità.
- Obiettivo:
  - estrarre un hook `useFeed()` o simile che:
    - incapsuli fetch iniziale, refresh, error handling,
    - esponga un’unica API al componente UI.
- Beneficio: codice più leggibile e facile da estendere.

### [~] TECH-04 – Paginazione / virtualizzazione feed *(priorità: media-bassa ma strategica)*

- Rischio: feed con molti post renderizzati tutti insieme → pesantezza su device lenti.
- Obiettivo:
  - introdurre una paginazione (“Carica altri”) o infinite scroll con limite (10–20 post per pagina),
  - valutare in futuro virtualizzazione per liste molto lunghe.
- Beneficio: migliore performance e UX su mobile.
> Mancano ancora: eventuale virtualizzazione/lazy rendering per liste molto lunghe.

### [ ] TECH-05 – Error handling coerente sulle API principali *(priorità: media)*

- Rischio: formati di errore non uniformi tra API (feed, follow, messaging, opportunità).
- Obiettivo:
  - definire un formato standard (es. `{ ok: boolean, code, message }`),
  - applicarlo almeno a:
    - feed,
    - follow,
    - search,
    - messaging,
  - loggare sempre gli errori 500 in Sentry.

---

## 3. Ordine suggerito dei prossimi sprint post-Go Live

1. **Hardening tecnico**
   - TECH-02 (validazione schema API feed/follow) – completato
   - TECH-05 (error handling coerente)
2. **Valore visibile al’utente**
   - FEED-01 (reshare/quote post) **oppure** JOBS-01 (filtri opportunità), in base alla direzione di prodotto.
3. **Scalabilità e manutenzione**
   - TECH-03 (hook/service feed),
   - TECH-04 (paginazione/virtualizzazione feed),
   - FEED-02, PROFILE-01 quando il traffico e le esigenze dei club lo suggeriranno.

Questa roadmap è pensata come guida post-Go Live: il progetto è considerabile al 100% “pronto” per lanciare, ma ha una coda chiara di miglioramenti da pianificare negli sprint successivi.
