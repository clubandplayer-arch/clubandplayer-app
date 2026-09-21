# Audit del filtro geografico di Discover (2026-09-21)

## Segnalazione analizzata

- selezionando **Italia** in `/discover` compaiono anche Club la cui sede mostrata e
  geolocalizzazione sono in Spagna;
- selezionando **Spagna** compaiono correttamente quei Club;
- selezionando **Francia** non compaiono Club, anche se la mappa mostra marker in
  Francia;
- va verificato se lo stesso comportamento coinvolge Player e Staff.

## Esito sintetico

Il comportamento non nasce dal selettore o dall'ID del Paese. È la query di
`/api/follows/suggestions` che interpreta il Paese esplicito come un insieme di:

1. residenza/sede canonica;
2. Paese di interesse canonico;
3. area di interesse canonica appartenente al Paese;
4. residenza legacy;
5. Paese/area di interesse legacy.

Questi insiemi vengono uniti senza conservare nel risultato il motivo del match.
Di conseguenza un Club con sede in Spagna e interesse per l'Italia appartiene sia
al risultato Spagna sia al risultato Italia. Il problema è una regressione
introdotta dal commit `65a407d` del 20 settembre 2026: prima il filtro dei Club
usava soltanto la sede/residenza, mentre il refactor ha esteso la stessa unione di
residenza e interessi a tutti i tipi di profilo.

## Tracciamento end-to-end

### Client

`app/(dashboard)/discover/page.tsx` legge `countryId` e `geoAreaId` dalla URL e li
invia invariati alle quattro richieste parallele (`institution`, `club`, `player`,
`staff`). Inoltre invia sempre `sportScope`; il valore iniziale è `mine`.

### API Discover

`app/api/follows/suggestions/route.ts`:

- valida l'ID canonico e risolve Paese, area ed eventuali discendenti;
- carica una sola lista `explicitProfileIds`, condivisa da tutti i tipi di
  profilo;
- include in quella lista sia `profile_preferences.residence_*` sia
  `profile_country_interests`, `profile_geo_area_interests` e i campi legacy
  `interest_*`;
- applica poi `id IN (explicitProfileIds)` insieme al filtro sport;
- esclude il profilo corrente e quelli già seguiti;
- scarta inoltre i profili non pubblici o non idonei alla discovery.

### Perché la mappa non è un controllo equivalente

`/api/clubs/geolocated` e Discover non interrogano lo stesso insieme logico:

- la mappa mostra solo Club pubblici dotati di coordinate e filtra il viewport
  geografico (o la sede canonica quando i bounds non sono disponibili);
- Discover non richiede coordinate, applica completezza, esclusioni follow/self e,
  per impostazione predefinita, lo sport del visitatore;
- la mappa non applica il filtro sport di Discover.

Perciò i due marker in Francia dimostrano che esistono due Club pubblici con
coordinate francesi, ma non garantiscono che superino anche sport, completezza ed
esclusioni della richiesta Discover. La combinazione più probabile per il risultato
vuoto è `countryId=Francia` **AND** `sportScope=mine`; l'audit dati allegato separa
questa ipotesi dalle esclusioni e dai problemi di completezza.

## Impatto per tipo profilo

| Tipo | Stessa lista geografica condivisa | Può apparire in più Paesi per gli interessi | Altri filtri |
| --- | --- | --- | --- |
| Club | sì | **sì, ed è il comportamento segnalato** | sport, follow/self, visibilità, completezza |
| Ente | sì | sì | sport, follow/self, visibilità, completezza |
| Player | sì | **sì** | sport, follow/self, visibilità, completezza |
| Staff | sì | **sì** | sport, follow/self, visibilità, completezza |

Quindi la stessa causa coinvolge anche Player e Staff. Per le persone, tuttavia,
serve una decisione di prodotto: in altre superfici di ricerca il territorio di
Player e Staff rappresenta volutamente la zona di interesse/scouting, non la
nazionalità o la residenza. Il bug certo è avere applicato implicitamente questa
semantica anche ai Club, mentre UI e aspettativa utente fanno leggere il filtro
come sede del Club.

## Audit dati riproducibile

Eseguire in sola lettura
`supabase/runbooks/manual/audit_discover_geography_filter.sql` nel SQL editor di
produzione. Il report:

1. classifica ogni profilo per `canonical_residence`, `canonical_country_interest`,
   `canonical_area_interest`, `legacy_residence` o `legacy_interest`;
2. evidenzia i match di interesse la cui sede è in un Paese diverso;
3. riassume i risultati per Paese e tipo profilo;
4. elenca i Club francesi con coordinate e segnala sport, stato e completezza di
   base, così da spiegare la divergenza rispetto alla mappa.

Il runbook non effettua scritture e non contiene ID di produzione hardcoded.

## Decisione consigliata prima della correzione

Separare esplicitamente le semantiche:

- **Club/Ente:** il filtro Paese/area deve usare soltanto sede canonica, con
  fallback legacy esclusivamente per profili non ancora migrati;
- **Player/Staff:** decidere se il filtro significa “residenza” oppure “zona in cui
  cerca opportunità”. Se significa scouting, mantenere gli interessi ma rinominare
  copy e motivazione del match; se significa residenza, usare la stessa regola dei
  Club;
- aggiungere al contratto API un `matchReason` non sensibile (per esempio
  `residence` o `scouting_interest`) oppure endpoint separati, evitando un'unione
  invisibile di concetti diversi;
- rendere evidente o disattivabile `Solo il mio sport`, perché può far apparire
  vuoto un Paese che contiene Club visibili sulla mappa.

Nessuna correzione dati o modifica del comportamento è inclusa in questo audit:
prima va confermata la semantica desiderata per Player e Staff.
