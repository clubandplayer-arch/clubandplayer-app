# FASE 5C — Schema additivo Sports / Disciplines / Competitions

Data: 2026-09-04  
Dipendenza: contratto 5B completato; 5C autorizzata esplicitamente dall'utente.  
Stato: **IMPLEMENTATA E TESTATA IN POSTGRESQL LOCALE — migration NON APPLICATA a Preview/Production**.

## Perimetro

5C materializza il minimum viable additive schema del contratto 5B. Non collega ancora profili, esperienze, Opportunities, Search o UI: tali integrazioni appartengono a 5E–5I. La migration non contiene seed o DML e non altera i dati o le tabelle runtime protette.

Migration: `supabase/migrations/20261206120000_canonical_sports_competition_schema.sql`.

## Schema creato

### Ruoli e applicabilità

- `player_positions` e `staff_roles` con UUID, code stabile, canonical name, active/order e timestamp;
- `player_position_applicability` e `staff_role_applicability`, con sport obbligatorio e discipline/variant opzionali;
- FK composite verificano che Discipline appartenga allo Sport e Variant alla Discipline;
- unique `NULLS NOT DISTINCT` consente un solo scope globale-per-sport senza rendere obbligatorie discipline/variant;
- `legacy_player_position_mappings` scoped e `legacy_staff_role_mappings` preparano la compatibilità, senza seed.

### Organizzazioni e scope geografico

- `sports_organizations`, provenance provider/source, parent, primary country, validity e metadata;
- `sports_organization_countries` per membership multi-country;
- trigger `prevent_sports_organization_cycle` blocca cicli gerarchici;
- `competition_countries` e `competition_geo_areas` rappresentano scope espliciti senza dedurre un Paese da una label.

### Competition model

- controlled catalog vuoti `gender_categories`, `competition_formats`, `territorial_scopes`;
- `competition_levels` e `age_classes` scoped a organization+sport con validity e constraint numerici;
- `seasons` scoped a organization con date, type, parent same-organization e cycle guard;
- `competitions` con organizer, sport, discipline/variant coerenti, scope, level/age/gender/format e provenance;
- `competition_editions` vincola Competition, Season, organization e sport alla stessa catena;
- `competition_groups` è scoped all'Edition, supporta parent same-edition e blocca cicli.

Non sono stati creati dati catalogo: anche i controlled catalog restano vuoti fino alla 5D.

## Indici, FK e delete behavior

La migration aggiunge candidate key composite non distruttive a `sport_disciplines` e `sport_variants` e indici sui principali percorsi scope, parent, active, season/edition/group e legacy target. Le FK dai nuovi cataloghi verso entità canoniche usano `RESTRICT`; soltanto le tabelle ponte organization-country e competition-country/geo-area usano cascade quando viene eliminata la rispettiva entità parent. Nessuna FK punta a profili, esperienze, Opportunities o Applications.

## RLS, grant e ownership

RLS e grant sono modificati **soltanto sui 19 nuovi oggetti 5C**:

- SELECT a `anon` e `authenticated` per cataloghi di riferimento;
- INSERT/UPDATE/DELETE ad `authenticated`, effettivamente consentiti dalle policy soltanto quando il profilo corrente ha `is_admin=true`;
- accesso completo a `service_role`;
- revoca preventiva dei privilegi da `public`, `anon`, `authenticated` prima dei grant minimi;
- nessuna policy o grant di `profiles`, `athlete_experiences`, `opportunities` o `applications` modificata;
- ownership degli oggetti esistenti non modificata.

Le tre funzioni cycle-guard sono `SECURITY INVOKER` con `search_path=''`; non introducono bypass RLS.

## Compatibilità e assenza di side effect

La migration:

- non aggiunge ancora colonne canonicali ai record utenti/runtime;
- non modifica le stringhe legacy `sport`, `role`, `category`, `gender` o season;
- non traduce valori persistiti;
- non esegue backfill o mapping automatici;
- non contiene default Italia/Calcio;
- non cambia Opportunity ownership (`club_id`, `owner_id`, `created_by`), visibility/status o Applications;
- non modifica API, UI, Search, Discover, WhoToFollow, feed o Maps;
- non modifica Mobile.

## Test PostgreSQL runtime

Harness: `scripts/test-canonical-sports-competition-schema-runtime.sh`.

Il test crea un database PostgreSQL 16.15 temporaneo, installa fixture minime equivalenti alle dipendenze FASE 1, applica la migration **due volte**, esegue gli assertion e infine elimina il database.

Copertura:

- applicazione SQL reale e idempotenza;
- creazione della catena organization → level/age/season → competition → edition → group;
- applicability Player e Staff anche sport-only;
- rifiuto FK di discipline appartenente allo sport errato;
- rifiuto FK di variant appartenente alla discipline errata;
- rifiuto dei cicli organization;
- assenza delle tabelle runtime protette nel perimetro creato;
- SELECT anon;
- write authenticated non-admin negata da RLS;
- write authenticated admin consentita;
- cleanup del database temporaneo.

Risultato: `PHASE_5C_CANONICAL_SPORTS_COMPETITION_SCHEMA_PASS`.

Test statico: `tests/unit/canonical-sports-competition-schema.test.ts`, che verifica inventario, assenza di DML/alter sui domini protetti, FK non distruttive, catene composite, cycle guards, RLS e grant. Suite completa: **296/296 PASS**; lint e typecheck **PASS**; `git diff --check` **PASS**. Build **WARNING/BLOCKED** esclusivamente dal mancato fetch esterno di Inter e Righteous da Google Fonts.

## Stato ambienti

| Voce | Stato |
| --- | --- |
| Migration creata | **SÌ** |
| Migration testata | **SÌ — PostgreSQL 16.15 locale, due apply, PASS** |
| Migration applicata Preview | **NO** |
| Migration applicata Production | **NO** |
| Production interrogata/modificata | **NO / NO** |
| Seed/backfill | **NO / NO** |
| Codice API/Web/UI modificato | **NO** |
| RLS/grant modificati | **SÌ, soltanto nuovi oggetti 5C** |
| Ownership esistente modificata | **NO** |
| Applications modificata | **NO** |
| Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Mobile fino a FASE 4 | **USER-REPORTED REPLICATED; non verificato qui** |

## Rischi residui e gate

- la migration non è stata provata contro lo schema remoto reale: eventuali differenze di ACL, ruoli o migration history restano da verificare prima dell'apply;
- i cataloghi sono intenzionalmente vuoti: nessuna UI può usarli prima della 5D;
- i nomi localizzati/provenance completi saranno definiti nei manifest 5D;
- le tabelle ponte con cascade eliminano soltanto membership quando il parent nuovo viene eliminato; le entità catalogo referenziate restano protette da `RESTRICT`;
- non esiste ancora dual-read/write o telemetry unknown: appartiene a 5E;
- nessuna applicazione remota della migration è autorizzata implicitamente dalla chiusura repository-only.

## Verifiche manuali

Non applicabili: nessuna UI/API è cambiata. Non sono richiesti Preview, Console/Network o screenshot. Un futuro apply remoto richiederà autorizzazione separata, preflight schema/history/ACL e post-apply read-only.

## Prossimo passaggio

La prossima sottofase roadmap è **5D — cataloghi e seed controllati**, ma non deve iniziare senza autorizzazione esplicita. Prima di 5D deve inoltre essere deciso se applicare 5C in un ambiente autorizzato; “migration testata localmente” non equivale a “migration applicata”.
