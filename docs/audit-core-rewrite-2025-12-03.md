# Audit core rewrite – 2025-12-03

## Introduzione
Questa verifica confronta lo stato attuale del codice con il "Core rewrite plan (search-map, follow, messaging)", valutando il livello di allineamento per service layer, follow, messaging (JOB 4), search-map, logging e test. L’analisi si basa sul codice presente in `main` senza modificare la logica applicativa.

## Tabella riassuntiva
| Area | Stato | Note |
| --- | --- | --- |
| Service layer | Quasi completo | Esistono service condivisi per search-map, follow e messaggistica (wrapper client unico). Restano da allineare eventuali chiamate residue/edge-case non ancora migrate. |
| Follow flow | Quasi completato | FollowProvider è montato nello shell e il FollowButton unico delega allo stesso contesto; restano fetch ad hoc solo per liste/suggerimenti. |
| Messaging flow (JOB 4) | Quasi completo | Direct_messages è l’unico flusso attivo; lo stack legacy è stato dismesso e ora esiste un service unico con `openDirectConversation`. Il logging strutturato è stato aggiunto (JOB 4.3). |
| Search-map | Parziale | Il client usa un service centralizzato, ma le pagine legacy `/search/*` con query dirette Supabase sono ancora presenti. |
| Logging | Quasi completo (messaggistica) | Le rotte direct-messages applicano logging strutturato con tag `[direct-messages]` e invio a Sentry sugli errori inattesi; restano da coprire gli altri domini (search-map/follow). |
| Test | Parziale | In package.json sono definiti solo `lint`, `build` e un test e2e; eseguiamo manualmente lint/tsc/build ma non c’è uno script dedicato di typecheck in CI. |

## Messaging (JOB 4)
- **Modello dati effettivo**: la UI predefinita usa `direct_messages` con lettura/scrittura e stato di lettura; l’endpoint `/api/direct-messages/threads` ricostruisce i thread 1-1 per il profilo attivo.【F:app/api/direct-messages/threads/route.ts†L13-L149】 Lo stack legacy `conversations` + `messages` è stato dismesso: le rotte `/api/conversations/*` restituiscono 410 e la pagina legacy reindirizza alla nuova inbox.【F:app/api/conversations/route.ts†L1-L15】【F:app/api/conversations/start/route.ts†L1-L15】【F:app/(dashboard)/messages/legacy/page.tsx†L1-L15】
- **API utilizzate**: l’UI passa dal service unico `lib/services/messaging.ts` che wrappa tutte le chiamate `/api/direct-messages/*` (inbox, thread, send, mark-read, unread-count).【F:lib/services/messaging.ts†L1-L139】
- **Componenti UI**: inbox e thread direct-messages vivono in `app/(dashboard)/messages/*`; il vecchio percorso `app/(dashboard)/messages/legacy` ora è solo un redirect a `/messages` (o `/messages/[id]` se presente il parametro `to`).【F:app/(dashboard)/messages/legacy/page.tsx†L1-L15】
- **Differenze rispetto al piano**: la parte di service unico e di entry point `openDirectConversation` è stata realizzata; il logging strutturato è stato aggiunto lato API e service.
- **Stato JOB 4**: QUASI COMPLETATO. La funzionalità 1-1 è operativa, le rotte legacy sono ritirate e la UI usa il service condiviso con logging strutturato; resta eventualmente da estendere la telemetria ad altri domini.

## Aggiornamento JOB 4.1 – deprecato stack conversations/messages
- Le API `/api/conversations` e `/api/conversations/start` rispondono ora 410 con messaggio di stack ritirato e hint verso `/messages` / `/api/direct-messages/*`.【F:app/api/conversations/route.ts†L1-L15】【F:app/api/conversations/start/route.ts†L1-L15】
- La pagina legacy `app/(dashboard)/messages/legacy` esegue un redirect immediato alla nuova inbox, preservando l’eventuale parametro `to` per aprire il profilo target.【F:app/(dashboard)/messages/legacy/page.tsx†L1-L15】
- I componenti e i servizi legacy (`MessagesClient`, `legacy/messaging/*`) sono stati rimossi per evitare dipendenze dallo stack deprecato.

## Micro-job proposti
1. **JOB 4.3 – Uniformare logging messaging (COMPLETATO)**
   - Obiettivo: introdurre log strutturati con tag `[direct-messages]` e, dove presente, invio a Sentry sugli endpoint direct-messages e sul service client.
   - Stato: completato con logging coerente su API `/api/direct-messages/*` e service `lib/services/messaging.ts`; gli errori inattesi vengono tracciati su Sentry.
   - Test manuali: invio/ricezione messaggi e verifica di log coerenti in console/server.

2. **JOB S1 – Bonifica search legacy**
   - Obiettivo: riallineare o archiviare `app/search/*`, instradando la ricerca verso il service `searchProfilesOnMap` (o equivalenti) per evitare doppie logiche.
   - File principali: `app/search/athletes/page.tsx`, `app/search/club/page.tsx`, `app/(dashboard)/search-map/*`, `lib/services/search.ts`.
   - Rischi/impatti: eventuali utenti/bookmark sulle pagine legacy; differenze di filtro da riconciliare.
   - Test manuali: ricerca su mappa con bbox+filtri e ricerca testuale legacy verificando risultati coerenti o redirect previsto.

3. **JOB L1 – Pipeline di test e typecheck**
   - Obiettivo: aggiungere uno script `pnpm typecheck` (tsc --noEmit) e includerlo nella CI insieme a `pnpm lint` e `pnpm run build`, documentando i comandi ufficiali di smoke test.
   - File principali: `package.json`, configurazione CI.
   - Rischi/impatti: possibili nuove failure su codebase non allineata ai tipi; tempi build leggermente maggiori.
   - Test manuali: esecuzione locale di lint, typecheck, build.
