# Audit core rewrite – 2025-12-03

## Introduzione
Questa verifica confronta lo stato attuale del codice con il "Core rewrite plan (search-map, follow, messaging)", valutando il livello di allineamento per service layer, follow, messaging (JOB 4), search-map, logging e test. L’analisi si basa sul codice presente in `main` senza modificare la logica applicativa.

## Tabella riassuntiva
| Area | Stato | Note |
| --- | --- | --- |
| Service layer | Quasi completo | Esistono service condivisi per search-map, follow e messaggistica (wrapper client unico). Restano da allineare eventuali chiamate residue/edge-case non ancora migrate. |
| Follow flow | Quasi completato | FollowProvider è montato nello shell e il FollowButton unico delega allo stesso contesto; restano fetch ad hoc solo per liste/suggerimenti. |
| Messaging flow (JOB 4) | Quasi completo | Direct_messages è l’unico flusso attivo; lo stack legacy è stato dismesso e ora esiste un service unico con `openDirectConversation`. Il logging strutturato è stato aggiunto (JOB 4.3). |
| Search-map | Completato | La ricerca ufficiale è la mappa con service condiviso; gli URL legacy `/search/*` reindirizzano a `/search-map` e non eseguono più query separate. |
| Logging | Quasi completo (messaggistica) | Le rotte direct-messages applicano logging strutturato con tag `[direct-messages]` e invio a Sentry sugli errori inattesi; restano da coprire gli altri domini (search-map/follow). |
| Test | Completo | Scripts standard: `pnpm lint`, `pnpm typecheck`, `pnpm run build` (raccomandato `pnpm ci:check` per sequenza completa). I workflow GitHub Actions Lint/Type check/CI usano questi comandi; il build può fallire solo in ambienti senza accesso ai Google Fonts. |

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

## Aggiornamento JOB S1 – bonifica search legacy
- Gli URL legacy `/search`, `/search/club` e `/search/athletes` sono ora redirect server-side verso `/search-map`, così qualsiasi link o bookmark precedente porta all’esperienza nuova senza eseguire query Supabase dedicate.【F:app/search/page.tsx†L1-L8】【F:app/search/club/page.tsx†L1-L8】【F:app/search/athletes/page.tsx†L1-L8】
- Le voci di navigazione e i link “trending” puntano alla nuova ricerca su mappa; il service ufficiale resta `lib/services/search.ts` con `searchProfilesOnMap`.【F:components/Navbar.tsx†L68-L80】【F:components/layout/MarketingNavbar.tsx†L3-L10】【F:components/feed/TrendingTopics.tsx†L5-L22】【F:lib/services/search.ts†L1-L73】

## Pipeline di test
- **Comandi ufficiali**: `pnpm lint`, `pnpm typecheck`, `pnpm run build`; per eseguire l’intero smoke: `pnpm ci:check` (lint + typecheck + build).
- **Workflow GitHub Actions**: i job “Lint” e “Type check” eseguono rispettivamente `pnpm lint` e `pnpm typecheck`; il job “CI” esegue `pnpm ci:check` con installazione pnpm in cache.【F:.github/workflows/lint.yml†L1-L29】【F:.github/workflows/typecheck.yml†L1-L29】【F:.github/workflows/ci.yml†L1-L30】

## Micro-job proposti
1. **JOB L1 – Pipeline di test e typecheck (COMPLETATO)**
   - Obiettivo: introdurre `pnpm typecheck`, `pnpm ci:check` e allineare la CI; documentazione aggiornata con la pipeline ufficiale.
   - File principali: `package.json`, configurazione CI.
   - Test manuali: lint, typecheck, build (con nota sui Google Fonts in ambienti senza rete).
