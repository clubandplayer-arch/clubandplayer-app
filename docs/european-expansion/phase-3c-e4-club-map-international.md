# FASE 3C-E4 — ClubMap internazionale

## Stato

**IMPLEMENTATA — test automatici PASS; smoke visivo Preview richiesto.** E4 modifica soltanto la superficie `/club-map` e il relativo copy IT/EN/FR/ES. SearchMap resta disattivata e gli endpoint conservano il boundary E3.

## Chiusura E3

Lo smoke user-reported ha confermato:

- `/api/clubs/geolocated` HTTP 200, `viewport=null`, coppie complete e `coordinate_source=organization_venue`;
- bounds Italia HTTP 200 con `source=explicit_bounds` e punti tutti compresi nel viewport;
- bounds invertiti HTTP 400 `INVALID_PAYLOAD/BOUNDS_INVALID`, nessun `UNKNOWN`;
- `/api/search/map?type=club` HTTP 200 con sole organizzazioni e viewport corretto;
- `/api/search/map?type=player` HTTP 200, lista vuota e privacy boundary esplicito;
- `/search-map` continua a reindirizzare a `/search`.

E3 è pertanto **COMPLETATA / PASS**.

## Implementazione E4

- Rimossi centro, bounds e zoom minimo Italy-only. La mappa parte da un viewport europeo e consente zoom continentale.
- Aggiunto `CanonicalGeographySelector` controllato per country e area, senza default Italia.
- `countryId`/`geoAreaId` vengono inizializzati dall'URL, aggiornati con `router.replace` e inviati a `/api/clubs/geolocated`.
- La risposta server guida il `fitBounds` canonicale. In assenza di selezione la mappa usa i pin pubblici disponibili e ne calcola i bounds.
- Country/area senza bounds ufficiali mostrano l'errore fail-closed E3; E4 non fabbrica viewport da centroid.
- Aggiunto clustering client-side senza dipendenze/provider aggiuntivi: le celle si restringono con lo zoom e il click su cluster ingrandisce la zona.
- Pin, popup e link continuano a usare escaping HTML; nessuna coordinata personale viene richiesta.
- Titolo, sottotitolo, filtro, empty/loading/error state, aria-label e label cluster sono localizzati in IT/EN/FR/ES.
- La CTA per impostare la sede Club resta disponibile.

## Correzione smoke Preview

Lo smoke iniziale ha rilevato che una selezione canonicale priva di bounds ufficiali svuotava i pin e che il relativo errore poteva riapparire brevemente usando lo zoom. La prima correzione mostrava tutti i Club pubblici, ma risultava semanticamente errata per una ricerca comunale. La soluzione definitiva ora:

- valida country e gerarchia canonicale sul server quando i bounds non esistono;
- traduce l'ascendenza canonicale nei campi pubblici legacy `country`/`region`/`province`/`city`, così Italia → Lazio → Roma → Roma restituisce soltanto i Club di Roma;
- non fabbrica bounds o coordinate e non esegue più alcun fallback globale;
- non rilancia il fetch quando cambia soltanto lo zoom della mappa.

## Perimetro e limiti

- Nessuna migration, indice, RPC, write remoto, modifica RLS, service role, SearchMap, Opportunity map, provider, mobile o file binario.
- Leaflet e tile OpenStreetMap restano invariati; il consolidamento provider è E7.
- Il caricamento globale senza filtro conserva il cap server legacy. E4 riduce il rumore visivo tramite clustering, ma pagination/viewport-on-pan resta materia E7.
- Non vengono mostrati Player/Staff/Fan sulla mappa.

## Smoke visivo Preview richiesto

1. Aprire `/club-map` desktop e mobile: titolo europeo, selettore e mappa devono essere visibili senza errori Console.
2. Senza filtro: URL pulito, pin italiani esistenti visibili, cluster numerici a zoom basso; click cluster aumenta lo zoom.
3. Selezionare un Paese: URL contiene solo `countryId`; reload preserva la selezione e mostra soltanto i Club del Paese anche senza bounds.
4. Selezionare Italia → Lazio → Roma → Roma: URL contiene `countryId` e `geoAreaId`, tutti i pin devono appartenere a Roma; reload e reset devono funzionare.
5. Aprire un pin singolo: nome/location/link Club corretti; logo fallback quando avatar assente.
6. Cambiare lingua IT/EN/FR/ES: titolo, helper, selector, stati e cluster non devono mostrare copy Italy-only o stringhe mancanti.
7. Verificare Network: `/api/clubs/geolocated` senza filtro oppure con soli ID canonicali; nessuna richiesta a SearchMap e nessun errore 500.

## Next gate

**Non avviare E5.** Dopo lo smoke E4 si potrà chiudere la sottofase e richiedere autorizzazione separata per **FASE 3C-E5 — SearchMap decision e integrazione**.
