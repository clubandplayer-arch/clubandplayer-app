# FASE 3C-D2 — Search canonical filtering/ranking contract

## Esito e perimetro

**Esito: PASS — contratto repository completato il 2026-09-01.** D2 introduce un modulo TypeScript puro e testato, ma non lo collega ancora a Search, Discover o WhoToFollow. Non cambia query Supabase, risultati, ranking attivo, UI, URL prodotti dal client, schema, migration, RLS, Production, Maps o mobile. Non crea né usa file binari.

## Contratto dei filtri

- Parametri canonicali additivi: `countryId`/`country_id` e `geoAreaId`/`geo_area_id`.
- Alias contemporanei sono accettati soltanto se identici; un conflitto fallisce esplicitamente.
- `geoAreaId` richiede sempre `countryId`; entrambi devono essere UUID.
- La presenza di `countryId` seleziona la modalità canonical-first; i testi legacy restano preservati come evidenza/fallback ma non restringono ulteriormente la query canonica.
- Senza ID, i filtri `country`, `region`, `province`, `city` restano in modalità legacy; input interamente vuoto è distinto.
- La validazione catalogo è separata dal parsing: country deve essere attivo e supportato; area attiva e dello stesso country.
- Un filtro area comprende l'area selezionata e i suoi descendants attivi, deduplicati. Country-only produce scope country senza inventare un'area.

## Contratto del ranking

Il modulo produce reason codes interni e uno score spiegabile. Una sola ragione geografica può contribuire, dalla più forte alla più debole:

| Reason | Peso |
| --- | ---: |
| `canonical_area` | 600 |
| `canonical_country` | 400 |
| `legacy_area` | 200 |
| `legacy_country` | 100 |
| `sport` | 40 |
| `relocation_compatible` | 20 |

L'assenza di dati canonici non genera penalità: un profilo legacy può ancora ricevere reason geografiche legacy, sport e relocation. `relocation_compatible` deve essere fornito soltanto da un boundary server revisionato; non viene inferito da country, interessi o campi mancanti e non è un filtro universale di eligibility.

I pareggi seguono l'ordine stabile: score decrescente → priority interesse crescente → `updated_at` decrescente → ID crescente. Lo score non viene ancora applicato agli endpoint: D5 resta responsabile dell'attivazione e della validazione prodotto.

## Privacy e responsabilità dei dati

Il contratto non legge dati. D3/D4 dovranno fornire adapter server che rispettino queste responsabilità:

1. gli interessi country/area sono quelli del viewer autenticato;
2. la location candidata è residence canonical-first con fallback legacy pubblicabile;
3. relocation è un segnale esplicitamente autorizzato, mai ottenuto aggirando RLS;
4. il catalog adapter può leggere solo country/area attive e supportate;
5. i descendants devono restare nello stesso country;
6. query risultati e query conteggi devono ricevere lo stesso scope risolto.

## Compatibilità e limiti

- Il modulo non sostituisce `lib/opportunities/geography.ts`: D3 riuserà il contratto Opportunity già attivo.
- Non viene scelto né dismesso uno dei due endpoint WhoToFollow in D2.
- Nessuna preference table viene resa pubblica e non viene introdotto service role.
- Nessun profilo viene escluso per assenza di geografia canonica o per relocation false.
- SearchMap/ClubMap restano nella FASE 3C-E.
- I pesi sono un contratto versionabile: cambiarli dopo l'attivazione richiederà test di regressione ranking.

## Verifica manuale/visiva

**Non richiesta / non applicabile per D2.** Il modulo non è collegato a una superficie runtime o visiva; lint, typecheck e unit test sono il gate completo di questa sottofase. Non occorre attendere uno smoke utente prima di autorizzare D3.

## Stato al termine di D2

**D2 è COMPLETATA / PASS. D3 — Search canonical filters è il prossimo passo sicuro, ma non è avviato da questo task.**
