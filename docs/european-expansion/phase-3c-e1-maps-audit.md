# FASE 3C-E1 — Maps audit

## Stato e perimetro

**COMPLETATA / PASS come audit repository-only — 2026-09-01.** Nessun comportamento runtime, schema, dato remoto, RLS, provider cartografico, UI, mobile o file binario è stato modificato. L'audit copre `ClubMap`, il client storico `SearchMap`, i tre endpoint geografici, la scrittura delle coordinate di sede/stadio, il catalogo canonico e i relativi boundary di privacy e performance.

## Superfici e data flow attuali

| Superficie | Entrypoint | Sorgente | Coordinate effettive | Stato |
| --- | --- | --- | --- | --- |
| ClubMap | `/club-map` → `ClubMapClient` | `GET /api/clubs/geolocated` | `club_stadium_lat/lng`, poi `latitude/longitude` | Attiva e collegata nella navigazione |
| SearchMap UI | `/search-map` | redirect server a `/search` | nessuna, perché il client non viene montato | Client storico presente ma route non attiva |
| SearchMap profili | `SearchMapClient` → `GET /api/search/map` | `profiles` | query bounds e output preferiscono `latitude/longitude`; stadio solo fallback output | Non raggiungibile dalla route attuale |
| SearchMap pin Club | `SearchMapClient` → `GET /api/search/clubs-in-bounds` | `profiles` | query soltanto su `latitude/longitude`; output generic-first | Non raggiungibile dalla route attuale |
| SearchMap Opportunity | `GET /api/search/map?type=opportunity` | Opportunity aperte collegate a Club nel viewport | bounds Club su generic **o** stadio, nessuna coordinata nell'Opportunity restituita | Non raggiungibile dalla route attuale |
| Edit Club/Institution | `ProfileEditForm` → `ClubStadiumMapPicker` → `PATCH /api/profiles/me` | Google Places, click o geolocalizzazione device | scrive `club_stadium_lat/lng` | Attiva |
| Catalogo canonico | `geo_areas` | import ufficiali | centroid e bounding box | Disponibile ma non collegato alle mappe |

`/search-map` continua ad apparire in messaggi, onboarding, navbar legale e feed, ma il page entrypoint reindirizza sempre a `/search`. Questi link non espongono oggi la UI cartografica storica e devono essere riconciliati prima di riattivarla.

## Contratto coordinate rilevato

1. Per un Club o Institution la posizione puntuale esplicitamente scelta dall'organizzazione è `club_stadium_lat/lng`; è la sorgente corretta e più specifica per un pin pubblico di sede/stadio.
2. `latitude/longitude` è una coppia legacy generica. Può restare fallback soltanto quando la coppia stadio/sede è assente e dopo validazione della semantica e del consenso.
3. `geo_areas.centroid_lat/lng` e i bounds canonici descrivono un'area amministrativa, non una posizione puntuale della persona o della struttura. Non devono essere trasformati silenziosamente in pin di profilo, Club o Opportunity.
4. La residenza canonica vive nelle preference tables viewer-owned. Non è automaticamente una coordinata pubblica e non deve aggirare il boundary definito nelle fasi B/D.
5. Ogni coppia deve essere atomica, finita e nei range latitude `[-90, 90]`, longitude `[-180, 180]`. I tre endpoint Maps non applicano oggi uniformemente questa validazione.

## Risultati principali

### P0 — boundary da risolvere prima di riattivare SearchMap

- **Privacy dei Player/Staff:** `/api/search/map` seleziona e restituisce coordinate puntuali anche per account personali pubblicati. La pubblicazione del profilo non equivale, da sola, al consenso a mostrare una posizione precisa su mappa. E2 deve definire quali account possono avere pin pubblici e con quale granularità; in assenza di opt-in puntuale, Player/Staff non devono esporre coordinate esatte.
- **Route incoerente:** il client SearchMap esiste ma `/search-map` reindirizza a `/search`, mentre più CTA continuano a puntare alla route. Non è sicuro evolvere in parallelo due esperienze non allineate: E2 deve decidere se integrare la mappa in Search o ripristinare una route dedicata.
- **Popup non sanitizzato:** i pin Club del client SearchMap interpolano il nome nel markup HTML di Leaflet senza escaping. `ClubMapClient` possiede invece un helper di escaping. Prima di rendere raggiungibile SearchMap occorre eliminare questa superficie XSS.

### P1 — correttezza geografica

- **Precedenza divergente:** `/api/clubs/geolocated` usa correttamente stadio/sede prima del generic. `/api/search/map` e `/api/search/clubs-in-bounds` producono invece output generic-first.
- **Club stadium-only persi nei bounds:** `/api/search/clubs-in-bounds` filtra al database esclusivamente `latitude/longitude`; il fallback stadio avviene dopo la query e quindi non può recuperare righe prive di coordinate generiche.
- **Profili SearchMap stadium-only persi:** il ramo profili di `/api/search/map` applica i bounds soltanto a `latitude/longitude`; anche qui il fallback post-query non recupera righe escluse.
- **Fallback fuori viewport:** se una query profili bounded non trova righe, `/api/search/map` rilancia senza bounds e restituisce risultati globali. Una mappa territoriale deve restare spatially strict: empty state è corretto, risultati fuori area no.
- **Bounds permissivi:** valori parziali, ordine nord/sud o est/ovest invertito, range impossibili e attraversamento dell'antimeridiano non hanno un contratto fail-closed condiviso.
- **Opportunity senza pin proprio:** le Opportunity sono localizzate tramite Club owner; il risultato non contiene coordinate e una ricerca testuale ignora intenzionalmente i bounds. La UI deve dichiarare se una Opportunity rappresenta la sede del Club, la sua geografia canonica o una posizione puntuale distinta.

### P1 — internazionalizzazione

- ClubMap nasce con centro, bounds, zoom minimo e nomi costanti Italy-only. Il successivo `fitBounds` sui pin consente incidentalmente di vedere pin esteri, ma initial/empty/loading state e navigazione non sono internazionali.
- SearchMap parte da Roma e contiene molto testo italiano hardcoded. Non usa `countryId`/`geoAreaId`, residence canonicale, country canonicale o label localizzate.
- I centroid/bounds di `geo_areas` possono supportare viewport e selezione di area, ma non sostituiscono coordinate puntuali. E2 deve separare chiaramente **filtro/viewport canonico** da **pin pubblico**.

### P1 — performance e affidabilità

- `/api/clubs/geolocated` carica fino a 1.000 Club globali in una singola risposta, senza viewport, paginazione o clustering. Il risultato diventa incompleto oltre il cap e trasferisce dati non necessari.
- `/api/search/map` usa limit massimo 500; filtra completezza dopo il limite e sovrascrive il total con la lunghezza residua, quindi conteggio e pagina non rappresentano necessariamente il pool.
- Il ramo Opportunity materializza gli ID di tutti i Club nel viewport in filtri `.in(...)` senza un limite esplicito. Il pattern può riprodurre il fan-out già corretto in D3.
- I bounds numerici su colonne separate non hanno indici Maps dichiarati nelle migration repository. Prima di nuovi indici servono `EXPLAIN` e conteggi read-only sull'ambiente autorizzato; nessuna migration va dedotta dal solo audit.
- Leaflet CSS/JS è caricato a runtime da `unpkg.com` con due loader distinti; tile OpenStreetMap e Google Maps/Places sono provider separati. CSP, disponibilità CDN, attribution, quote, licenze, cache e gestione errori devono diventare un contratto esplicito.
- Il picker Google ricrea map/listener al variare di molte dipendenze e non conserva il cleanup restituito dentro la Promise; va verificato il rischio di listener o autocomplete duplicati prima di intervenire.

## Aspetti già corretti da preservare

- Tutti gli endpoint pubblici Maps applicano `active + published`, escludono admin e usano il client server soggetto a RLS.
- ClubMap escapa nome, location e ID prima di inserirli nel popup HTML.
- `/api/clubs/geolocated` tratta le coppie coordinate atomicamente e preferisce la sede/stadio scelta dal Club.
- ClubMap rimuove mappa e marker al cleanup; SearchMap applica debounce ai pin nel viewport e un limite alle query.
- `geo_areas` dispone di constraint per coppie, range e bounds completi, quindi il catalogo canonico è una base valida per viewport e filtri.

## Contratto proposto per E2

E2 deve restare una sottofase di contratto/test puro, senza collegamento runtime:

1. definire `PublicMapPoint` con `source = organization_venue | legacy_profile`, coppia validata e account type ammessi;
2. stabilire precedenza unica `club_stadium_*` → generic legacy, senza mixare coordinate di coppie diverse;
3. escludere per default coordinate precise di Player/Staff/Fan e vietare centroid canonico come loro pin;
4. definire `MapViewport` separato, ottenibile da bounds espliciti o `countryId`/`geoAreaId` validati;
5. rendere bounds fail-closed, spatially strict, same-country e antimeridian-aware;
6. definire Opportunity location come contratto esplicito, distinguendo venue del Club, area canonica dell'Opportunity e assenza di pin;
7. fissare pagination/cursor, max pin per viewport, clustering, minimum zoom e total semantico;
8. unificare escaping, visibility, RLS, error responses, provider loading, i18n e accessibility;
9. decidere formalmente il destino della route `/search-map` prima di qualsiasi riattivazione.

## Piano progressivo FASE 3C-E

1. **E1 — Maps audit:** COMPLETATA / PASS repository-only.
2. **E2 — coordinate, viewport e privacy contract:** prossima sottofase autorizzabile; modulo/test puro, nessun runtime.
3. **E3 — server data boundary:** resolver coordinate unico e query bounded, dopo approvazione E2.
4. **E4 — ClubMap internazionale:** viewport canonico, clustering e stati localizzati.
5. **E5 — SearchMap decision e integrazione:** rimozione link obsoleti oppure UI riattivata sul boundary E3.
6. **E6 — Opportunity map semantics:** soltanto dopo aver definito venue rispetto ad area canonica.
7. **E7 — regressione, performance, provider e backward compatibility:** sei Paesi, legacy, privacy, RLS, accessibility e rollout.

## Next gate

**Non avviare E2 implicitamente.** È richiesta autorizzazione separata per **FASE 3C-E2 — coordinate, viewport e privacy contract**. Nessuna query remota, migration o modifica Maps runtime è giustificata dall'audit E1.
