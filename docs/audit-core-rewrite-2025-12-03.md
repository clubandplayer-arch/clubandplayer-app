# Audit core rewrite – 2025-12-03

## Introduzione
Questa verifica confronta lo stato attuale del codice con il "Core rewrite plan (search-map, follow, messaging)", valutando il livello di allineamento per service layer, follow, messaging (JOB 4), search-map, logging e test. L’analisi si basa sul codice presente in `main` senza modificare la logica applicativa.

## Tabella riassuntiva
| Area | Stato | Note |
| --- | --- | --- |
| Service layer | Parziale | Esistono service condivisi per search-map e follow; la messaggistica usa direct_messages ma manca ancora un service unico lato client. |
| Follow flow | Quasi completato | FollowProvider è montato nello shell e il FollowButton unico delega allo stesso contesto; restano fetch ad hoc solo per liste/suggerimenti. |
| Messaging flow (JOB 4) | Parziale | Direct_messages è l’unico flusso attivo; lo stack legacy conversations/messages è stato dismesso (rotte 410 + redirect pagina legacy), ma manca ancora un service unico tipo `openConversation` e il pulsante “Messaggia” fa solo push di routing. |
| Search-map | Parziale | Il client usa un service centralizzato, ma le pagine legacy `/search/*` con query dirette Supabase sono ancora presenti. |
| Logging | Parziale | Console log sparsi su alcune rotte (es. direct-messages) ma non esiste una convenzione unica né integrazione estesa con Sentry per i flussi analizzati. |
| Test | Parziale | In package.json sono definiti solo `lint`, `build` e un test e2e; eseguiamo manualmente lint/tsc/build ma non c’è uno script dedicato di typecheck in CI. |

## Messaging (JOB 4)
- **Modello dati effettivo**: la UI predefinita usa `direct_messages` con lettura/scrittura e stato di lettura; l’endpoint `/api/direct-messages/threads` ricostruisce i thread 1-1 per il profilo attivo.【F:app/api/direct-messages/threads/route.ts†L13-L149】 Lo stack legacy `conversations` + `messages` è stato dismesso: le rotte `/api/conversations/*` restituiscono 410 e la pagina legacy reindirizza alla nuova inbox.【F:app/api/conversations/route.ts†L1-L15】【F:app/api/conversations/start/route.ts†L1-L15】【F:app/(dashboard)/messages/legacy/page.tsx†L1-L15】
- **API utilizzate**: il thread client chiama direttamente `/api/direct-messages/:profileId` per caricare, inviare e marcare letti i messaggi.【F:app/(dashboard)/messages/[profileId]/DirectMessageThread.tsx†L58-L199】 Il pulsante “Messaggia” effettua solo `router.push` verso `/messages/[profileId]` senza passare per un service comune.【F:components/messaging/MessageButton.tsx†L13-L40】
- **Componenti UI**: inbox e thread direct-messages vivono in `app/(dashboard)/messages/*`; il vecchio percorso `app/(dashboard)/messages/legacy` ora è solo un redirect a `/messages` (o `/messages/[id]` se presente il parametro `to`).【F:app/(dashboard)/messages/legacy/page.tsx†L1-L15】
- **Differenze rispetto al piano**: il piano prevedeva un unico service `openConversation(targetProfileId)` e logging strutturato; la dismissione delle rotte legacy è stata completata ma non esiste ancora un adapter unico lato client né logging coerente.
- **Stato JOB 4**: PARZIALE. La funzionalità 1-1 è operativa e le rotte legacy sono state ritirate; resta da introdurre il service unico condiviso e uniformare logging/error handling.

## Aggiornamento JOB 4.1 – deprecato stack conversations/messages
- Le API `/api/conversations` e `/api/conversations/start` rispondono ora 410 con messaggio di stack ritirato e hint verso `/messages` / `/api/direct-messages/*`.【F:app/api/conversations/route.ts†L1-L15】【F:app/api/conversations/start/route.ts†L1-L15】
- La pagina legacy `app/(dashboard)/messages/legacy` esegue un redirect immediato alla nuova inbox, preservando l’eventuale parametro `to` per aprire il profilo target.【F:app/(dashboard)/messages/legacy/page.tsx†L1-L15】
- I componenti e i servizi legacy (`MessagesClient`, `legacy/messaging/*`) sono stati rimossi per evitare dipendenze dallo stack deprecato.

## Micro-job proposti
1. **JOB 4.2 – Service unico di messaging**
   - Obiettivo: introdurre `lib/services/messaging.ts` con entry-point `openDirectConversation(profileId)` che incapsula creazione/recupero, lettura e invio messaggi direct.
   - File principali: `lib/services` (nuovo file), `components/messaging/MessageButton.tsx`, `app/(dashboard)/messages/*`.
   - Rischi/impatti: sincronizzazione con stato di lettura/notifiche; gestire errori e log coerenti.
   - Test manuali: clic su “Messaggia” da un profilo, invio messaggio, aggiornamento badge non letti, ricarica pagina.

2. **JOB 4.3 – Uniformare logging messaging**
   - Obiettivo: introdurre log strutturati con tag `[messaging]` e, se previsto, Sentry sugli endpoint direct-messages e sul service client.
   - File principali: `app/api/direct-messages/*`, nuovo `lib/services/messaging.ts`, `hooks/useUnreadDirectThreads.ts`.
   - Rischi/impatti: evitare leak di dati sensibili nei log; rispettare performance su endpoint ad alto traffico.
   - Test manuali: invio/ricezione messaggi e verifica di log coerenti in console/server.

3. **JOB S1 – Bonifica search legacy**
   - Obiettivo: riallineare o archiviare `app/search/*`, instradando la ricerca verso il service `searchProfilesOnMap` (o equivalenti) per evitare doppie logiche.
   - File principali: `app/search/athletes/page.tsx`, `app/search/club/page.tsx`, `app/(dashboard)/search-map/*`, `lib/services/search.ts`.
   - Rischi/impatti: eventuali utenti/bookmark sulle pagine legacy; differenze di filtro da riconciliare.
   - Test manuali: ricerca su mappa con bbox+filtri e ricerca testuale legacy verificando risultati coerenti o redirect previsto.

4. **JOB L1 – Pipeline di test e typecheck**
   - Obiettivo: aggiungere uno script `pnpm typecheck` (tsc --noEmit) e includerlo nella CI insieme a `pnpm lint` e `pnpm run build`, documentando i comandi ufficiali di smoke test.
   - File principali: `package.json`, configurazione CI.
   - Rischi/impatti: possibili nuove failure su codebase non allineata ai tipi; tempi build leggermente maggiori.
   - Test manuali: esecuzione locale di lint, typecheck, build.
