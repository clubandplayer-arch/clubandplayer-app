# FASE 3C-E3 — Maps server data boundary

## Stato

**IMPLEMENTATA — test automatici PASS; smoke Preview manuale richiesto.** E3 collega il contratto E2 esclusivamente ai server adapter e ai tre endpoint Maps. SearchMap resta disattivata tramite redirect e ClubMap non è stata ridisegnata.

## Implementazione

- `SupabaseMapViewportCatalog` legge country attivo/supportato e bounds delle aree. I bounds country sono aggregati soltanto dalle root area attive dotate di bounds; i centroid non vengono letti.
- `resolveMapViewportFromParams` supporta bounds espliciti oppure `countryId`/`geoAreaId`, applicando integralmente errori fail-closed E2.
- `applyOrganizationMapBounds` genera query database venue-first: `club_stadium_lat/lng` nel viewport, oppure `latitude/longitude` soltanto se l'intera coppia venue è assente. L'antimeridiano viene diviso in due intervalli longitude.
- `/api/clubs/geolocated` mantiene la chiamata legacy senza viewport, accetta ora viewport opzionale, usa il resolver organization-only e restituisce `coordinate_source` e metadati viewport.
- `/api/search/clubs-in-bounds` richiede un viewport valido, include Club stadium-only prima del mapping, usa precedenza venue → legacy e restituisce HTTP 400 `INVALID_PAYLOAD` per input incompleti o invalidi.
- `/api/search/map` con profili restituisce soltanto organizzazioni con pin pubblico valido. Le richieste `player`/`athlete` restituiscono lista vuota con `privacyBoundary=precise_personal_map_points_disabled`.
- Il fallback globale fuori viewport è stato rimosso: zero risultati bounded resta un empty state spatially strict.
- Il ramo Opportunity usa un pool Club bounded e limitato a 300, filtra le Opportunity owner-side anche in presenza di query testuale e restituisce la coordinata pubblica dell'organizzazione senza centroid fallback.

## Privacy e compatibilità

- Visibility `active + published`, RLS, admin exclusion e self exclusion preesistenti restano applicati.
- Nessuna preference table viene letta per generare pin pubblici.
- ClubMap mantiene il comportamento legacy senza parametri; il resolver già preferiva venue e ora espone anche la source.
- Profili con coordinate parziali/corrotte falliscono chiusi per singola riga senza bloccare l'intera risposta.
- Nessuna migration, nuovo indice, RPC, service role, write remoto, modifica RLS, provider, UI client, mobile o file binario.

## Limiti deliberati rimasti per E4–E7

- La risposta globale ClubMap conserva il cap legacy 1.000 finché E4 non introduce viewport/clustering.
- Country/area canonicali senza bounds ufficiali restituiscono `VIEWPORT_BOUNDS_UNAVAILABLE`; E3 non inventa bounds da centroid o descendants.
- Il ramo Opportunity conserva un `.in(...)` bounded a massimo 300 owner come compatibilità transitoria; E7 dovrà verificare `EXPLAIN` e scegliere RPC/indice soltanto con evidenza.
- SearchMap resta irraggiungibile e il popup storico non sanitizzato non viene montato. La decisione route/UI resta E5.

## Copertura automatica

Quattordici test E2+E3 verificano contratto coordinate/privacy, viewport canonico, antimeridiano, query venue-first, inclusione stadium-only, assenza fallback globale, limite owner Opportunity, uso uniforme del resolver e mancata riattivazione di SearchMap.

## Smoke Preview richiesto

Usare un viewer autenticato e DevTools Network/Console:

1. Aprire `/club-map`: la pagina deve caricare, mostrare solo Club pubblicati e mantenere card/logo/link funzionanti, senza errori Console.
2. Chiamare `/api/clubs/geolocated`: atteso HTTP 200, `ok=true`, `viewport=null`; i punti devono avere coppie complete e `coordinate_source` uguale a `organization_venue` o `legacy_profile`.
3. Chiamare `/api/search/clubs-in-bounds?north=47.3&south=35.2&east=19.2&west=6`: atteso HTTP 200 e viewport `explicit_bounds`; nessun punto fuori bounds.
4. Ripetere con bounds parziali o invertiti: atteso HTTP 400 `INVALID_PAYLOAD`, mai `UNKNOWN`.
5. Chiamare `/api/search/map?type=club&north=47.3&south=35.2&east=19.2&west=6&limit=20`: atteso HTTP 200, sole organizzazioni e nessun fallback globale.
6. Chiamare `/api/search/map?type=player&north=47.3&south=35.2&east=19.2&west=6`: atteso HTTP 200, `data=[]` e `privacyBoundary=precise_personal_map_points_disabled`.
7. Se si dispone di country/area con bounds ufficiali, ripetere con `countryId`/`geoAreaId`: atteso viewport canonicale same-country. Se il catalogo non possiede bounds, HTTP 400 `VIEWPORT_BOUNDS_UNAVAILABLE` è il comportamento fail-closed corretto.
8. Verificare che `/search-map` continui a reindirizzare a `/search`.

## Next gate

**Non avviare E4.** Dopo lo smoke Preview E3 potrà essere marcata COMPLETATA / PASS e si potrà richiedere autorizzazione separata per **FASE 3C-E4 — ClubMap internazionale**.
