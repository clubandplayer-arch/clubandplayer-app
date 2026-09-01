# FASE 3C-E7 — Maps regressione, performance, provider e backward compatibility

## Stato

**COMPLETATA / PASS — test automatici e smoke finale Preview conclusi.** Lo smoke E6 è PASS compatibile con l'ambiente: HTTP 200, contratto E6 presente, `boundsApplied=true`, 38 Club nel viewport e zero Opportunity `open` visibili (`totalOpenOpp=0`). La lista vuota è quindi corretta e non rappresenta più un errore di associazione.

## Regressione e compatibilità

- `/club-map` resta l'unica UI Maps pubblica; `/search-map` conserva il redirect compatibile.
- Pin precisi pubblici restano organization-only con precedenza venue → legacy atomica.
- Player/Staff/Fan continuano a restituire lista vuota e privacy boundary esplicito.
- Opportunity conservano il placement contract E6 e non trasformano geography/centroid in pin.
- Country/area canonicali, gerarchie senza bounds, bounds espliciti e antimeridiano mantengono i contratti E2–E6.
- Visibility `active + published`, esclusione admin e RLS caller-bound restano applicate.

## Performance e osservabilità

- Centralizzati i cap pubblici: 1.000 Club globali, 500 bounded/canonicali, 300 owner nel pool SearchMap server e 100 Opportunity candidate.
- `/api/clubs/geolocated` richiede al massimo `limit + 1`, restituisce soltanto `limit` righe ed espone `meta.limit`, `meta.returned` e `meta.truncated` senza una count query aggiuntiva.
- Clustering client-side E4 continua a ridurre il rumore a zoom continentale.
- Non vengono introdotti indici senza `EXPLAIN` Production autorizzato; E7 non contiene migration.

## Provider

- Leaflet resta fissato alla versione `1.9.4` e OpenStreetMap resta l'unico tile provider della UI pubblica.
- URL CSS, script, tile e attribution sono centralizzati in `PUBLIC_MAP_PROVIDER`.
- Nessun secondo loader SearchMap, nuovo provider, token, quota o modifica CSP.

## Matrice smoke finale Preview eseguita

1. `/club-map` desktop/mobile: caricamento, attribution, cluster, popup, selector e reset senza errori Console.
2. Selezione Italia → Lazio → Roma → Roma: soltanto Club di Roma e URL canonicale stabile.
3. `/api/clubs/geolocated`: `meta.returned === data.length`, `meta.returned <= meta.limit`; verificare `meta.truncated` booleano.
4. `/search-map`: redirect finale a `/club-map`; nessun bundle/client storico.
5. `/api/search/map?type=player&north=47.3&south=35.2&east=19.2&west=6`: lista vuota e `precise_personal_map_points_disabled`.
6. `/api/search/map?type=opportunity...`: contratto E6; lista vuota accettata soltanto quando debug conferma `totalOpenOpp=0`.
7. Bounds invertiti: HTTP 400 `BOUNDS_INVALID`; bounds senza Club: empty spatially strict, mai fallback globale.
8. Verificare Network: nessun 500/`UNKNOWN`, nessuna richiesta al cambio zoom, Leaflet 1.9.4 e tile OSM con attribution.

## Chiusura fase

Lo smoke finale user-reported ha confermato:

- `/api/clubs/geolocated` HTTP 200 con 38 righe, `viewport=null`, `meta.limit=1000`, `meta.returned=38` e `meta.truncated=false`;
- coppie coordinate complete e `coordinate_source=organization_venue` per tutti i pin restituiti;
- `/api/search/map?type=player` HTTP 200 con lista vuota, `total=0`, privacy boundary esplicito e viewport corretto;
- comportamento visivo ClubMap, filtro Roma, redirect SearchMap, cluster e Network già verificati negli smoke E4–E6.

**FASE 3C-E — Maps è COMPLETATA / PASS lato WEB.** Nessuna fase successiva è autorizzata implicitamente.

## Mobile parity

Tutte le sottofasi 3C-A–E eseguite in questo repository riguardano esclusivamente il prodotto Web. La parità Mobile è deliberatamente rinviata a una fase successiva nella repository Mobile, dove i contratti e i comportamenti Web approvati dovranno essere replicati e verificati separatamente. La chiusura Web non certifica né modifica il client Mobile.
