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

Questi insiemi venivano uniti senza conservare nel risultato il motivo del match.
Di conseguenza un Club con sede in Spagna e interesse per l'Italia apparteneva sia
al risultato Spagna sia al risultato Italia. Il problema era una regressione
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

## Chiarimento di dominio e impatto per tipo profilo

| Tipo | Criterio corretto | Può apparire in più Paesi per gli interessi | Altri filtri |
| --- | --- | --- | --- |
| Club | sede | no | sport, follow/self, visibilità, completezza |
| Ente | sede | no | sport, follow/self, visibilità, completezza |
| Player | zona di interesse | sì, intenzionalmente | sport, follow/self, visibilità, completezza |
| Staff | zona di interesse | sì, intenzionalmente | sport, follow/self, visibilità, completezza |

Le 4.299 righe del report non rappresentano 4.299 anomalie: gran parte dei Player
compare contemporaneamente come `legacy_interest` e `legacy_residence` perché i
vecchi dati duplicavano lo stesso valore nei due campi. Gli esempi forniti sono
sufficienti a confermare la causa, senza dover esaminare manualmente tutte le
righe.

La regola di prodotto è ora esplicita:

- **Club/Ente** sono indicizzati per sede;
- **Player/Staff** sono indicizzati esclusivamente per zona di interesse;
- per Player/Staff la nazionalità serve alla bandiera e non è un criterio di
  ricerca geografica. Non esiste più un concetto di residenza da usare in questo
  filtro.

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

## Correzione applicata

L'endpoint usa ora due insiemi distinti:

- `loadOrganizationIdsForCanonicalScope`: sede canonica e fallback sede legacy,
  senza interessi;
- `loadPeopleIdsForInterestScope`: Paesi/aree di interesse canonici e fallback
  `interest_*` legacy, senza residenza o nazionalità.

Il filtro sport resta indipendente e può ancora restringere i risultati rispetto
alla mappa; non è una contaminazione geografica.

## Seconda anomalia: catalogo globale incompleto

La verifica successiva ha identificato due cause indipendenti per i Club mancanti
con “Tutti i Paesi” e “Tutti gli sport”:

1. l'assenza del Paese non significava realmente “tutti”: l'endpoint eseguiva
   prima i bucket geografici personalizzati e un bucket locale poteva esaurire il
   limite prima di interrogare i Club esteri;
2. i profili già seguiti venivano esclusi correttamente dai suggerimenti. Per
   esempio Leontina FC, visibile nel riquadro “Profili che segui”, non deve
   contemporaneamente apparire in “Chi seguire”. La sua assenza non era un bug.

Discover ora richiede fino a 200 suggerimenti. Senza Paese, la query considera
direttamente tutti i Paesi (applicando eventualmente solo lo sport) e usa le
preferenze geografiche per ordinare, non per escludere. “Chi seguire” continua a
escludere sempre il profilo corrente e tutte le utenze già seguite.
