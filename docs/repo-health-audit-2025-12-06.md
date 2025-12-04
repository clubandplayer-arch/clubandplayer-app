# Repo health audit – 2025-12-06

## Panoramica
Il codice risulta coerente con l’assetto post-core rewrite: service layer condiviso per follow, messaging e search, API protette dal wrapper `withAuth` e workflow CI basati su pnpm. Restano però aree non uniformi (fetch diretti dentro componenti, validazione input manuale, webhook senza firma) che possono diventare punti deboli quando il traffico aumenta.

## Tabella riassuntiva
| Area | Stato | Dettagli/Note | Suggerimento |
| --- | --- | --- | --- |
| Services & data layer | Attenzione | I service client ufficiali coprono solo follow/messaging/search; altre pagine (es. feed) eseguono fetch diretti multipli verso API, senza caching o wrapper comuni. | Estendere il pattern dei services a feed/opportunità, aggiungendo hook typed condivisi e politiche di cache coerenti. |
| API & validazione | Critico | Molti handler validano “a mano” l’input e mancano firme o rate limit per webhook (`/api/webhooks/sync` ha TODO sulla signature). | Introdurre validazione schema (es. zod) e verifica firma per webhook/eventi esterni; applicare risposte errore coerenti e logging strutturato. |
| UI & performance | Attenzione | La pagina feed è un unico client component che fa più fetch e gestione stato locale per post, reazioni e commenti, senza paginazione/virtualizzazione. | Estrarre hook per dati feed, aggiungere paginazione/“load more” e considerare virtualizzazione per ridurre re-render e payload. |
| Supabase & sicurezza | Attenzione | Le API usano `withAuth` ma alcune rotte pubbliche (feed GET) tornano 200 con `items: []` su errori DB; manca controllo firma nei webhook. | Rafforzare gestione errori con codici coerenti, log Sentry e fallimenti espliciti su percorsi sensibili; valutare check di ownership esplicito dove si mutano record. |
| CI/Tooling | OK | Workflow `lint`, `typecheck`, `ci` e smoke e2e allineati a pnpm; script in package.json coerenti con pipeline ufficiale. | Mantenere allineamento e, se necessario, promuovere gli e2e da “non-blocking” a condizionali su percorsi critici. |
| Legacy/TODO | OK | Pochi TODO residui (signature webhook) e redirect già presenti per stack legacy (messaging, search). | Chiudere i TODO di sicurezza e programmare una passata di rimozione eventuale codice morto dopo i prossimi rilasci. |

## Rischi principali (Top 5)
1. **Webhook senza verifica firma**: endpoint `/api/webhooks/sync` accetta payload senza autenticazione, potenzialmente abusabile.
2. **Validazione input eterogenea**: molte API normalizzano a mano (es. feed, follows) e potrebbero accettare payload inattesi o rumorosi.
3. **Feed client pesante**: più fetch paralleli e stato locale su un’unica pagina senza paginazione né caching condiviso → rischio di lentezza e race condition su abort controller.
4. **Accesso dati non centralizzato**: alcune UI consumano API direttamente, aggirando il service layer e duplicando error handling.
5. **Gestione errori non uniforme**: alcuni endpoint restituiscono 200 con payload vuoto su errori DB, riducendo la visibilità di problemi lato client e monitoring.

## Micro-job consigliati
- **TECH-01 – Firma webhook sync**: Aggiungere verifica di firma/secret e rate limit a `app/api/webhooks/sync/route.ts`; loggare eventi respinti. Rischio: medio.
- **TECH-02 – Validazione schema API feed/follow**: Introdurre zod (o schema simile) per payload in `/api/feed/*` e `/api/follows/toggle`, con errori coerenti e log Sentry. Rischio: medio.
- **TECH-03 – Hooks/feed service unificati**: Estrarre un hook (es. `useFeedData`) e un service client per post/reazioni/commenti riusabili in `app/(dashboard)/feed/page.tsx`, con caching e abort gestito centralmente. Rischio: medio.
- **TECH-04 – Paginazione/virtualizzazione feed**: Aggiungere “load more” o infinite scroll e virtualizzazione lista post per ridurre lavoro del main thread. Rischio: medio-basso.
- **TECH-05 – Error handling coerente**: Uniformare le risposte errore (status != 200 quando fallisce il DB) e instradare gli errori a Sentry nei principali handler (feed, follows, search). Rischio: basso.

## Appendice – Sicurezza webhook `/api/webhooks/sync`
- L’endpoint ora richiede un header `X-Webhook-Secret` valorizzato con `WEBHOOK_SYNC_SECRET` configurato nell’ambiente runtime.
- In caso di secret mancante o errato, la rotta risponde con 401 (o 500 se l’ambiente non definisce la variabile) e logga l’evento respinto con path e IP (`x-forwarded-for`).
- Il payload atteso non è cambiato; per integrazioni esterne basta aggiungere l’header condiviso.

## Aggiornamento 2025-12-07 – TECH-02 (validazione API feed/follow)
- Implementati schemi Zod per le API feed e follow in `lib/validation/feed.ts` e `lib/validation/follow.ts`.
- Le rotte `/api/feed/posts`, `/api/feed/comments`, `/api/feed/reactions` e `/api/follows/toggle` validano ora i payload con risposta 400 uniforme `{ ok: false, code: 'BAD_REQUEST', message, details }` in caso di input non valido.

## Aggiornamento 2025-12-08 – TECH-05 (error handling coerente)
- Introdotto helper comune per le risposte API (`lib/api/responses.ts`) con codici standardizzati: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `TOO_MANY_REQUESTS`, `INTERNAL_ERROR` e risposta `ok: true` sui successi dove compatibile.
- Applicato il formato uniforme a feed (`/api/feed/posts`, `/api/feed/comments`, `/api/feed/reactions`), follow (`/api/follows/toggle`), search map (`/api/search/map`) e messaging (`/api/direct-messages/*`).
