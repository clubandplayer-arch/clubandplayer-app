# Audit core rewrite – 2025-12-03

## Introduzione
Questa verifica confronta lo stato attuale del codice con il "Core rewrite plan (search-map, follow, messaging)", valutando il livello di allineamento per service layer, follow, messaging (JOB 4), search-map, logging e test. L’analisi si basa sul codice presente in `main` senza modificare la logica applicativa.

## Tabella riassuntiva
| Area | Stato | Note |
| --- | --- | --- |
| Service layer | Parziale | Esistono service condivisi per search-map e follow, ma la messaggistica usa ancora fetch diretti e due stack distinti (direct_messages vs conversations). |
| Follow flow | Quasi completato | FollowProvider è montato nello shell e il FollowButton unico delega allo stesso contesto; restano fetch ad hoc solo per liste/suggerimenti. |
| Messaging flow (JOB 4) | Parziale | Convivono il nuovo flusso direct_messages 1:1 e quello legacy conversations/messages; manca un service unico tipo `openConversation` e il pulsante “Messaggia” fa solo push di routing. |
| Search-map | Parziale | Il client usa un service centralizzato, ma le pagine legacy `/search/*` con query dirette Supabase sono ancora presenti. |
| Logging | Parziale | Console log sparsi su alcune rotte (es. direct-messages) ma non esiste una convenzione unica né integrazione estesa con Sentry per i flussi analizzati. |
| Test | Parziale | In package.json sono definiti solo `lint`, `build` e un test e2e; eseguiamo manualmente lint/tsc/build ma non c’è uno script dedicato di typecheck in CI. |

## Messaging (JOB 4)
- **Modello dati effettivo**: la UI predefinita usa `direct_messages` con lettura/scrittura e stato di lettura; l’endpoint `/api/direct-messages/threads` ricostruisce i thread 1-1 per il profilo attivo.【F:app/api/direct-messages/threads/route.ts†L13-L149】 In parallelo resta il modello legacy basato su `conversations` + `messages` ancora esposto via API.【F:app/api/conversations/route.ts†L7-L55】【F:app/api/conversations/start/route.ts†L8-L68】
- **API utilizzate**: il thread client chiama direttamente `/api/direct-messages/:profileId` per caricare, inviare e marcare letti i messaggi.【F:app/(dashboard)/messages/[profileId]/DirectMessageThread.tsx†L58-L199】 Il pulsante “Messaggia” effettua solo `router.push` verso `/messages/[profileId]` senza passare per un service comune.【F:components/messaging/MessageButton.tsx†L13-L40】 Il codice legacy continua a usare fetch verso `/api/conversations/*` tramite `legacy/messaging/messaging.service.ts`.【F:legacy/messaging/messaging.service.ts†L10-L90】
- **Componenti UI**: inbox e thread direct-messages vivono in `app/(dashboard)/messages/*`, mentre la vecchia dashboard è sotto `app/(dashboard)/messages/legacy` e dipende dal provider legacy basato sul modello conversations.【F:app/(dashboard)/messages/legacy/MessagesClient.tsx†L1-L188】
- **Differenze rispetto al piano**: il piano prevedeva un unico service `openConversation(targetProfileId)` e la dismissione delle rotte legacy; oggi coesistono due stack e nessun adapter unico lato client. I log sono presenti ma non uniformati (console.info/error sparsi).
- **Stato JOB 4**: PARZIALE. La funzionalità 1-1 è operativa ma non è stata completata la migrazione/cleanup delle API legacy né la creazione di un servizio unico condiviso.

## Micro-job proposti
1. **JOB 4.1 – Deprecare conversations/messages legacy**  
   - Obiettivo: rimuovere o disabilitare le rotte `/api/conversations/*` e la UI `app/(dashboard)/messages/legacy`, dopo migrazione dati eventuale.  
   - File principali: `app/api/conversations/*`, `legacy/messaging/*`, `app/(dashboard)/messages/legacy/*`.  
   - Rischi/impatti: compatibilità con utenti che usano ancora l’URL legacy; verificare migrazione cronologia se necessaria.  
   - Test manuali: apertura inbox `/messages`, apertura chat `/messages/[profileId]`, verifica che i percorsi legacy reindirizzino o rispondano 404 controllati.

2. **JOB 4.2 – Service unico di messaging**  
   - Obiettivo: introdurre `lib/services/messaging.ts` con entry-point `openDirectConversation(profileId)` che incapsula creazione/recupero, lettura e invio messaggi direct.  
   - File principali: `lib/services` (nuovo file), `components/messaging/MessageButton.tsx`, `app/(dashboard)/messages/*`.  
   - Rischi/impatti: sincronizzazione con stato di lettura/notifiche; gestire errori e log coerenti.  
   - Test manuali: clic su “Messaggia” da un profilo, invio messaggio, aggiornamento badge non letti, ricarica pagina.

3. **JOB 4.3 – Uniformare logging messaging**  
   - Obiettivo: introdurre log strutturati con tag `[messaging]` e, se previsto, Sentry sugli endpoint direct-messages e sul service client.  
   - File principali: `app/api/direct-messages/*`, nuovo `lib/services/messaging.ts`, `hooks/useUnreadDirectThreads.ts`.  
   - Rischi/impatti: evitare leak di dati sensibili nei log; rispettare performance su endpoint ad alto traffico.  
   - Test manuali: invio/ricezione messaggi e verifica di log coerenti in console/server.

4. **JOB S1 – Bonifica search legacy**  
   - Obiettivo: riallineare o archiviare `app/search/*`, instradando la ricerca verso il service `searchProfilesOnMap` (o equivalente) per evitare doppie logiche.  
   - File principali: `app/search/athletes/page.tsx`, `app/search/club/page.tsx`, `app/(dashboard)/search-map/*`, `lib/services/search.ts`.  
   - Rischi/impatti: eventuali utenti/bookmark sulle pagine legacy; differenze di filtro da riconciliare.  
   - Test manuali: ricerca su mappa con bbox+filtri e ricerca testuale legacy verificando risultati coerenti o redirect previsto.

5. **JOB L1 – Pipeline di test e typecheck**  
   - Obiettivo: aggiungere uno script `pnpm typecheck` (tsc --noEmit) e includerlo nella CI insieme a `pnpm lint` e `pnpm run build`, documentando i comandi ufficiali di smoke test.  
   - File principali: `package.json`, configurazione CI.  
   - Rischi/impatti: possibili nuove failure su codebase non allineata ai tipi; tempi build leggermente maggiori.  
   - Test manuali: esecuzione locale di lint, typecheck, build.
