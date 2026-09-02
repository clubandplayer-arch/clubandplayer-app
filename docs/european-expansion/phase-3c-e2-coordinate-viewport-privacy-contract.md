# FASE 3C-E2 — Coordinate, viewport e privacy contract

## Stato e perimetro

**COMPLETATA / PASS — contratto TypeScript puro e test automatici, non collegato al runtime.** Nessun endpoint, query, schema, migration, dato remoto, RLS, UI Maps, provider, mobile o file binario è stato modificato.

## Decisioni vincolanti

### Pin pubblici

- Un pin preciso pubblico viene risolto soltanto per `club` e `institution`.
- La precedenza è atomica: coppia `organization_venue` (`club_stadium_lat/lng`) e, solo se assente, coppia `legacy_profile` (`latitude/longitude`). Non è consentito combinare latitude di una sorgente con longitude dell'altra.
- Player/Athlete, Staff e Fan non ottengono un pin preciso implicitamente, anche se una coordinata legacy è presente. Un futuro opt-in richiederà contratto/schema/consenso separati.
- Coordinate mancanti sono valide e producono assenza di pin; coppie parziali, non finite o fuori range falliscono chiuse.

### Viewport

- `MapViewport` è distinto da `PublicMapPoint`: un viewport non prova la posizione di un profilo.
- La richiesta accetta o quattro bounds espliciti completi oppure `countryId`/`geoAreaId` canonici; mescolare le due modalità è rifiutato.
- Gli alias snake_case devono coincidere con quelli camelCase. Area senza country, UUID invalidi, country non supportato, area inattiva/cross-country e bounds catalogo mancanti sono errori fail-closed.
- `north > south`; latitude e longitude devono essere nei range globali. `east < west` è accettato esplicitamente come attraversamento dell'antimeridiano, non scambiato silenziosamente.
- Country e area canonici risolvono esclusivamente bounds di catalogo validati. Il centroid non è accettato come sostituto dei bounds e non diventa mai un pin.

### Opportunity

- Una futura venue puntuale dell'Opportunity ha precedenza sulla venue pubblica dell'organizzazione owner.
- In assenza di entrambe non esiste un pin. `geo_area_id` può determinare filtro/viewport, ma non fabbrica un punto dal centroid amministrativo.

## API pure introdotte

Il modulo `lib/maps/geographyContract.ts` espone:

- `normalizeCoordinatePair` per atomicità, parsing e range;
- `resolvePublicMapPoint` per privacy e precedenza organization venue → legacy;
- `normalizeMapBounds` per bounds completi e antimeridiano;
- `parseMapViewport` per modalità URL mutuamente esclusive e alias;
- `resolveCanonicalMapViewport` tramite adapter catalogo asincrono;
- `resolveOpportunityMapPlacement` per la semantica venue senza centroid fallback;
- `MapGeographyContractError` con codici stabili e mappabili in E3 a `INVALID_PAYLOAD`.

## Copertura automatica

La suite E2 verifica nove scenari: coppie atomiche/range; precedenza Club/Institution; esclusione account personali; bounds ordinati e antimeridiano; parsing alias/conflitti; bounds espliciti; viewport country/area; catalogo unavailable/cross-country/bounds-less; Opportunity venue/organization/no fabricated pin.

## Boundary per E3

E3 potrà collegare il contratto ai server adapter soltanto mantenendo:

1. visibility `active + published`, RLS e admin exclusion;
2. nessuna lettura delle preference tables per produrre pin pubblici;
3. query spatially strict: nessun rerun globale quando il viewport è vuoto;
4. stessa precedenza coordinate per ClubMap, SearchMap e Opportunity owner;
5. selezione database capace di includere righe stadium-only prima del mapping;
6. limiti/cursor e protezione dal fan-out degli ID;
7. sanitizzazione dei dati prima di qualsiasi popup HTML;
8. nessuna riattivazione della route `/search-map` durante il solo data-boundary server.

## Next gate

**Non avviare E3 implicitamente.** È richiesta autorizzazione separata per **FASE 3C-E3 — Maps server data boundary**. E3 potrà modificare resolver ed endpoint, ma non dovrà ancora riattivare SearchMap o ridisegnare ClubMap.
