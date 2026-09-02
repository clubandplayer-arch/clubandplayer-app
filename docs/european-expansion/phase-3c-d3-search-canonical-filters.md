# FASE 3C-D3 — Search canonical filters

## Stato

**COMPLETATA / PASS — test automatici e verifica manuale Preview conclusi il 2026-09-01.** D4 non è avviata implicitamente e richiede autorizzazione separata.

## Implementazione

- `GET /api/search` accetta `countryId`/`country_id` e `geoAreaId`/`geo_area_id` secondo il contratto D2.
- Parsing e validazione avvengono prima delle query: alias conflittuali, UUID errati, area senza country, country non supportato, area inattiva o cross-country restituiscono payload non valido.
- Il catalog adapter è read-only e valida country e area. Il contratto può espandere descendants con limite di profondità, ma Search non materializza migliaia di UUID nella query HTTP.
- Opportunities applica direttamente `country_id`; per lo scope area usa la proiezione legacy atomica (`region`, `province` o `city`) del nodo canonico selezionato. La label dell'ancestor è presente anche nelle righe figlie, ottenendo semantica descendants con una query bounded e identica per risultati e conteggi.
- Profili Club/Institution/Player/Staff usano la proiezione pubblica legacy della residence canonica: country ISO2/nome canonico/label supportata e area mappata a `region`, `province` o `city` in base al tipo europeo.
- Post ed Event riusano lo stesso filtro sugli author pubblici; non viene attribuita al contenuto una geografia propria inesistente.
- Se gli ID canonici sono presenti, region/province/city/country testuali non restringono ulteriormente la query. Se gli ID sono assenti, il comportamento legacy resta invariato.
- La risposta restituisce soltanto `countryId` e `geoAreaId` selezionati, non l'allowlist interna dei descendants.

## Boundary e compatibilità

La ricerca profili non legge preference tables altrui e non usa service role. Usa la proiezione pubblica legacy prodotta dai write canonicali, preservando profili legacy e RLS esistenti. Questo evita di esporre `profile_preferences`, ma implica che un profilo con canonical residence non ancora proiettata nei campi pubblici resta dipendente dal fallback legacy: la futura D4 non deve aggirare questo limite senza un boundary revisionato.

**Correzione dopo il primo smoke Preview:** il primo tentativo materializzava tutti i descendants francesi in parametri PostgREST `.in(...)`. Una regione con migliaia di comuni superava la dimensione pratica della richiesta e produceva `UNKNOWN`. Search ora valida lo stesso nodo canonico ma usa la proiezione gerarchica bounded; nessun dato è stato scritto o modificato. Il successivo recheck Preview è PASS.

Nessuna migration, write, backfill, modifica RLS, UI selector, ranking attivo, Maps, mobile o file binario è inclusa in D3.

## Verifica manuale Preview — esito user-reported

Dopo il deploy Preview, usare un account autenticato e recuperare ID validi dalle API catalogo già esistenti. Non usare Production SQL e non modificare dati.

1. Aprire `/api/geo/countries` e annotare gli ID di IT e FR.
2. Aprire `/api/geo/areas?country=FR`, scegliere un'area restituita e annotarne l'ID.
3. Eseguire Search legacy: `/api/search?q=calcio&type=all&country=IT`; deve rispondere `ok` e mantenere il filtro legacy.
4. Eseguire country canonico: `/api/search?q=calcio&type=all&countryId=<ID_IT>`; deve rispondere `ok`, restituire `filters.countryId=<ID_IT>` e non esporre `areaIds`.
5. Eseguire area canonica: `/api/search?q=club&type=all&countryId=<ID_FR>&geoAreaId=<ID_AREA_FR>`; deve rispondere `ok` senza risultati fuori dalla Francia/area quando sono presenti fixture compatibili.
6. Ripetere il punto 5 con `type=opportunities` e verificare che il conteggio corrisponda ai risultati canonici noti.
7. Verificare fail-closed: `/api/search?q=club&type=all&countryId=IT` deve restituire errore 400, non 500.
8. Verificare area senza country: `/api/search?q=club&type=all&geoAreaId=<ID_AREA_FR>` deve restituire errore 400.
9. Ripetere una ricerca senza filtri geografici e una legacy già nota; risultati, conteggi e console devono restare senza errori.

Esito finale osservato e comunicato dall'utente:

- cataloghi country e aree FR: PASS;
- Search legacy IT: PASS;
- canonical country IT: PASS, con conteggi coerenti rispetto al legacy e nessuna esposizione di `areaIds`;
- canonical area Auvergne-Rhône-Alpes: PASS dopo la correzione bounded;
- `type=opportunities`: PASS, `counts.opportunities=1` e unico risultato `Opportunité Ain`;
- country UUID non valido: PASS, HTTP 400 `INVALID_PAYLOAD`;
- area senza country: PASS, HTTP 400 `INVALID_PAYLOAD`;
- ricerca senza filtri: PASS, inclusi risultati IT/FR e nessun default geografico implicito;
- Network/console: PASS; le sole righe rosse visibili sono i due HTTP 400 intenzionali dei test fail-closed, mentre la richiesta canonica valida è HTTP 200.

## Next gate

**D3 è COMPLETATA / PASS. D4 — Discover / WhoToFollow data boundary è il prossimo passo pianificato, ma non è avviato senza autorizzazione esplicita.**
