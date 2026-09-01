# FASE 3C-D4 — Discover / WhoToFollow data boundary

## Stato

**COMPLETATA / PASS — test automatici e smoke Preview autenticato conclusi il 2026-09-01.**

Il primo smoke ha confermato `GET /api/follows/suggestions` e tutti i quattro `geoScope`, ma ha rilevato `UNKNOWN` nell'endpoint alternativo. Il fix ha reso i conteggi diagnostici best-effort e solo-debug e ha normalizzato l'allowlist UUID delle esclusioni. Il recheck ha restituito HTTP 200, cinque suggerimenti, esclusioni self/already-followed coerenti e debug D4 senza dati geografici privati. Anche `/discover` è user-reported PASS.

## Implementazione

- I due endpoint `GET /api/follows/suggestions` e `GET /api/suggestions/who-to-follow` costruiscono ora lo stesso piano geografico del viewer.
- Il boundary legge tramite il client autenticato e le policy owner RLS: `profile_preferences`, `profile_country_interests` e `profile_geo_area_interests`, sempre limitate a `profile.id`.
- La precedenza condivisa è: interessi geo-area canonici, interessi country canonici, interessi legacy, residence canonica e residence legacy.
- Country canonicali producono alias compatibili per il target pubblico (ISO2, nome ufficiale e nome localizzato); le aree vengono proiettate sul campo pubblico `region`, `province` o `city` in base al tipo canonico.
- I filtri vengono applicati esclusivamente alla location pubblica del candidato. Gli `interest_*` del candidato non sono location e non vengono più usati per includerlo.
- Discover conserva `geoScope`, `sportScope`, quote per tipo, esclusione self/already-followed, visibility e fallback preesistenti. WhoToFollow conserva sport e recent fallback.
- `open_to_relocation` attraversa il boundary soltanto come metadato del viewer: D4 non introduce ancora scoring o ranking relocation, riservati a D5.

## Privacy e perimetro

Non vengono usati service role o admin client per leggere preferenze geografiche. Non sono state introdotte migration, write, backfill, modifiche RLS/grant, ranking, UI, Maps, mobile o file binari. I payload debug espongono solo conteggi/booleani del piano, non ID o valori privati degli interessi.

## Verifica manuale Preview richiesta

Usare un account autenticato attivo. Non modificare dati per eseguire lo smoke.

1. Aprire `/api/follows/suggestions?limit=5&debug=1`: risposta HTTP 200, `ok=true`, nessun self o profilo già seguito e nessun errore `UNKNOWN`.
2. Ripetere il punto 1 con `geoScope=city`, `province`, `region` e `country`; ogni risposta deve essere HTTP 200. Una lista vuota è valida se non esistono candidati nello scope.
3. Aprire `/api/suggestions/who-to-follow?limit=5&debug=1`: risposta HTTP 200 e nessun self/profilo già seguito.
4. Nel debug del secondo endpoint verificare `geographyFilterCount`, `hasCanonicalGeographyInterests` e `openToRelocation`; non devono comparire ID o nomi degli interessi privati.
5. Aprire `/discover`, cambiare gli scope disponibili e verificare card, avatar, link e azione Follow senza errori in Network/Console.
6. Aprire la superficie feed che mostra WhoToFollow e verificare caricamento e assenza di duplicati evidenti.
7. Se disponibile, ripetere con un profilo legacy privo di interessi canonici: deve continuare a ricevere suggerimenti tramite residence/interessi legacy e fallback.

## Next gate

**D4 è COMPLETATA / PASS.** D5 è stata autorizzata separatamente dopo lo smoke.
