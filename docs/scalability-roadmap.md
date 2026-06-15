# Club & Player scalability roadmap status

Tracker delle attività fatte e delle attività residue per rendere l'app più resistente a picchi di iscrizioni, feed, upload e search.

## Stato sintetico

| Area | Stato | Note |
| --- | --- | --- |
| Rate limit distribuito | Fatto | Redis/Upstash/KV REST con fallback in-memory. |
| Indici DB P0 | Fatto | Migrazione con trigram, unique applications e hot-path indexes. |
| Applications idempotenti | Fatto | Duplicate insert → `409 Already applied`. |
| Avatar upload hardening | Fatto | Rate limit, MIME allowlist, max size, cache lunga. |
| Club logo upload hardening | Fatto | Rate limit, MIME allowlist, max size, cache lunga. |
| Feed media cache | Fatto | Cache lunga per media/poster/event poster immutable. |
| Listing pagination senza count exact | Fatto | Clubs/opportunities con `limit + 1`, `hasMore`, `totalIsExact: false`. |
| Search fuzzy min length | Fatto | Soglia minima 2 caratteri per clubs/opportunities/registry. |
| Feed author lookup optimization | Fatto | Query by `user_id` prima, fallback by `id` solo per mancanti. |
| Feed enrichment parallelization | Fatto | Author profiles, media e quoted map in parallelo. |
| Feed club verification cache | Fatto | Cache breve 5 minuti per badge club verificato. |
| Notifications unread count cache | Fatto | Cache 5 secondi e API usata dalla campanella. |
| Runbook operativa | Fatto | `docs/scalability-runbook.md`. |

## PR completate

1. **Scalability DB indexes + applications duplicate handling**
   - Aggiunta migrazione `20261201090000_scalability_p0_indexes.sql`.
   - Aggiunto unique index su `applications(opportunity_id, athlete_id)`.
   - Gestione `409 Already applied`.

2. **Distributed rate limiting**
   - Nuovo `lib/api/rateLimit.ts`.
   - Supporto Upstash/KV/Redis REST.
   - Applicato a endpoints hot: applications, comments, follows, avatar, registry search.

3. **Support prefixed Upstash env vars**
   - Supporto ai nomi generati dall'integrazione Vercel/Upstash con custom prefix.

4. **Avatar upload validation**
   - MIME allowlist.
   - Max 3MB.
   - Errori `413`/`415`.
   - Cache lunga.

5. **Feed media immutable cache**
   - Cache lunga per media post, poster video, event poster.

6. **Search/listing no exact count**
   - Rimozione `count: exact` da clubs/opportunities.
   - `hasMore` e `totalIsExact: false`.

7. **Minimum fuzzy search length**
   - Minimo 2 caratteri per query fuzzy.
   - SearchInput non scrive `q` sotto soglia.

8. **Feed author profile lookup optimization**
   - Evita doppia query profili quando `author_id` è già risolto da `user_id`.

9. **Feed enrichment parallelization**
   - Query indipendenti in parallelo.

10. **Feed club verification cache**
    - Cache 5 minuti per club verification flags.

11. **Notifications unread count cache**
    - Cache breve per unread count.
    - Campanella passa dall'API server.

12. **Club logo upload hardening**
    - Rate limit.
    - MIME allowlist.
    - Max size.
    - Cache lunga.

13. **Scalability operations runbook**
    - Checklist di deploy, smoke test, monitoraggio e rollback.

## Verifiche già confermate manualmente

- Rate limit avatar: superata soglia → `Too Many Requests`.
- Upstash/Redis env presenti su Vercel.
- Avatar upload normale funzionante dopo hardening.
- Feed media/event poster visualizzati correttamente.
- Search/listing funzionanti dopo modifiche.
- Feed rendering corretto dopo ottimizzazioni.
- Club logo upload verificato senza errori.
- Club logo unsupported file verificato: file non immagine rifiutato correttamente.
- Search con 1 carattere verificata: nessun risultato con 1 carattere, ricerca normale con 2+ caratteri.

## Verifiche consigliate prima di chiudere definitivamente

1. **Notifications bell**
   - Verificare badge campanella con notifiche non lette.
   - Marcare notifiche come lette e verificare aggiornamento entro pochi secondi.

2. **Applications duplicate**
   - Candidarsi una volta a un'opportunità.
   - Riprovare la stessa candidatura.
   - Verificare risposta controllata `Already applied` / stato coerente UI.

3. **Club logo unsupported file**
   - Facoltativo: provare un file non immagine.
   - Atteso: `unsupported_format`.

4. **Search con 1 carattere**
   - Verificare che non parta fuzzy search specifica.
   - Con 2+ caratteri, ricerca normale.

5. **Vercel logs**
   - Verificare assenza di warning:

```text
[rateLimit] distributed store unavailable, falling back to memory
```

## Cosa manca davvero

Non ci sono altri interventi P0/P1 obbligatori emersi finora.

Restano solo attività opzionali o da decidere dopo metriche reali:

| Attività | Priorità | Quando farla |
| --- | --- | --- |
| Load test k6/Artillery | P1 opzionale | Prima di una campagna grossa o lancio pubblico. |
| Queue per notifiche/push/email | P2 | Se application/comment/follow diventano lenti o generano troppe notifiche. |
| RPC/view denormalizzata feed | P2 | Se `/api/feed/posts` resta collo di bottiglia nelle metriche. |
| Cache condivisa search | P2 | Se le search più ripetute generano ancora carico alto. |
| Upgrade temporaneo Supabase compute | Operativo | Durante campagne o spike previsti. |
| SLO/alerting formalizzato | P1/P2 | Prima di crescita stabile del traffico. |

## Criteri per chiudere il blocco scalabilità

Possiamo chiudere il blocco se:

- Le verifiche manuali residue passano.
- Nei log Vercel non compaiono warning Redis fallback.
- Supabase non mostra slow query gravi sulle pagine feed/search/opportunities/clubs.
- Non aumentano 5xx o errori auth/storage.
- Il rate limit genera `429` solo nei casi attesi.

## Prossima decisione consigliata

Le verifiche residue sono passate: fermarsi qui e monitorare.

Non farei altre PR strutturali senza dati reali di traffico, perché abbiamo già coperto i principali rischi iniziali.

## Registro operativo aggiornamenti

| Data | Step | Esito | Note |
| --- | --- | --- | --- |
| 2026-06-14 | Consolidamento PR scalabilità già completate | Completato | Le PR tecniche P0/P1 risultano implementate e verificate manualmente nei flussi principali. |
| 2026-06-14 | Creazione tracker roadmap | Completato | Questo file diventa il registro unico per segnare fatto/mancante prima della chiusura. |
| 2026-06-14 | Residual check list | Completato | Tutte le verifiche funzionali e operative previste sono state completate. |
| 2026-06-14 | Notifications bell | Completato | Verificato manualmente: badge/campanella e aggiornamento dopo lettura funzionano correttamente. |
| 2026-06-14 | Applications duplicate | Completato | Verificato manualmente: la UI impedisce una seconda candidatura e mostra stato coerente `Candidatura inviata`. |
| 2026-06-14 | Pausa operativa | Sospeso | Chiuso il lavoro della sessione; riprendere dalle verifiche residue: logo unsupported, search 1 char, log Vercel e dashboard Supabase. |
| 2026-06-15 | Club logo unsupported file | Completato | Confermato manualmente: file non immagine gestito correttamente. |
| 2026-06-15 | Search con 1 carattere | Completato | Confermato manualmente: con 1 carattere nessun risultato/nessuna fuzzy search utile; con 2+ caratteri ricerca funzionante. |
| 2026-06-15 | Vercel logs Redis fallback | Completato | Screenshot Vercel: ricerca del warning rateLimit senza risultati, Warning/Error/Fatal a 0 nel periodo visualizzato. |
| 2026-06-15 | Supabase query performance | Completato | Screenshot filtrati per posts, profiles, clubs, opportunities, applications e notifications: non emergono query hot-path con mean time alto e volume critico; alcune max time isolate/registry vanno solo monitorate. |

## Checklist finale da spuntare

Prima di chiudere definitivamente il blocco scalabilità, segnare qui l'esito delle ultime prove:

- [x] Notifications bell: badge visibile con notifiche non lette e aggiornamento dopo lettura entro pochi secondi.
- [x] Applications duplicate: seconda candidatura alla stessa opportunità gestita senza errore generico.
- [x] Club logo unsupported file: file non immagine rifiutato con errore controllato `unsupported_format`.
- [x] Search 1 carattere: non parte fuzzy search specifica; con 2+ caratteri la ricerca filtra normalmente.
- [x] Vercel logs: nessun warning Redis fallback durante uso normale.
- [x] Supabase dashboard: nessuna slow query grave su feed/search/opportunities/clubs dopo smoke test; presenti solo max time isolati o query da monitorare.

## Regola di avanzamento

Da ora in poi ogni nuova PR di scalabilità deve aggiornare questo tracker in tre punti:

1. aggiungere una riga in **PR completate**;
2. aggiornare lo **Stato sintetico** dell'area toccata;
3. aggiungere una riga nel **Registro operativo aggiornamenti** con data, step, esito e note.

Se una verifica manuale fallisce, non chiudere il blocco: aprire una PR mirata solo su quel problema, aggiornarla qui e ripetere la verifica.

## Chiusura blocco scalabilità iniziale

Data chiusura: 2026-06-15.

Esito: **chiuso**.

Motivo:

- le protezioni P0/P1 contro picchi iniziali sono state implementate;
- le verifiche funzionali principali sono passate;
- i controlli operativi Vercel/Supabase non mostrano segnali bloccanti;
- non sono emersi nuovi rischi concreti che giustifichino ulteriori PR preventive.

Da questo punto non aggiungere altre modifiche strutturali di scalabilità senza almeno uno di questi segnali:

1. aumento reale di errori `5xx`, timeout o duration p95/p99 su Vercel;
2. comparsa del warning Redis fallback nei log Vercel;
3. slow query Supabase ripetute con mean time alto su feed/search/opportunities/clubs;
4. utenti legittimi bloccati dai rate limit;
5. storage egress/upload errors in crescita;
6. evidenza da load test o campagna reale.

Prossima fase: **monitoraggio post-deploy e raccolta metriche reali**.
