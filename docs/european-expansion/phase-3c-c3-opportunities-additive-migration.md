# FASE 3C-C3 — Opportunities canonical geography additive migration

## Esito

**PASS — migration additiva creata e testata localmente il 2026-08-31.** La migration è presente esclusivamente nel repository e non è stata applicata a Supabase Preview, Production o altri database remoti. Non sono state eseguite query remote, scritture Production, backfill, modifiche RLS, grant, trigger, funzioni, API, UI, feature gate o modifiche mobile.

Migration: `supabase/migrations/20261205120000_opportunity_canonical_geography.sql`.

## Implementazione

La migration traduce senza estensioni comportamentali il contratto C2:

- aggiunge `opportunities.country_id uuid null`;
- aggiunge `opportunities.geo_area_id uuid null`;
- FK `country_id → countries(id) ON DELETE RESTRICT`;
- FK `geo_area_id → geo_areas(id) ON DELETE RESTRICT`;
- check `geo_area_id is null or country_id is not null`;
- FK composita `(geo_area_id, country_id) → geo_areas(id, country_id) ON DELETE RESTRICT`;
- indice su `country_id`;
- indice su `geo_area_id`.

Le colonne non hanno default e non sono `NOT NULL`. Tutte le Opportunities esistenti restano compatibili con `(country_id, geo_area_id) = (null, null)`. Country-only è valido; area senza country, country/area mismatch e riferimenti inesistenti sono rifiutati.

## Garanzie di non interferenza

La migration è racchiusa in `begin`/`commit` e non contiene data mutation. In particolare non contiene:

- `INSERT`, `UPDATE`, `DELETE` o `TRUNCATE`;
- default Italia o inferenza dai campi testuali;
- backfill da `country`, `region`, `province`, `city`;
- backfill da profilo, residence, interessi o sede Club;
- modifiche a `owner_id`, `created_by`, `club_id` o `club_name`;
- modifiche a `applications` o alle semantics applicant/Club;
- RLS, policy, grant, revoke, trigger o function;
- modifiche a `regions`, `provinces`, `municipalities` o mapping legacy.

## Test statici

`tests/unit/opportunity-canonical-geography-migration.test.ts` certifica:

1. colonne nullable e senza default;
2. quattro vincoli con nomi e delete behavior previsti;
3. indici canonici;
4. transazione e guardie idempotenti;
5. assenza di DML, RLS, ownership, applications e mutation legacy.

Il test entra nella suite generale, ora composta da **184 test PASS, 0 FAIL**.

## Runtime harness PostgreSQL locale

Creati:

- `scripts/test-opportunity-canonical-geography-runtime.sh`;
- `tests/integration/sql/opportunity-canonical-geography-runtime-setup.sql`;
- `tests/integration/sql/opportunity-canonical-geography-runtime-tests.sql`.

Il harness usa PostgreSQL **16.15** locale e un database temporaneo `c3_opportunity_geography_runtime`. Installa fixture sintetiche per `countries`, `geo_areas`, una Opportunity legacy e la relativa Application, quindi:

1. applica la migration;
2. la applica una seconda volta per certificare idempotenza;
3. verifica nullability e assenza default;
4. verifica che Opportunity legacy, ownership, geography testuale e Application siano invariati;
5. accetta country-only e country+area coerenti;
6. rifiuta area senza country;
7. rifiuta country/area mismatch;
8. rifiuta country e area inesistenti;
9. verifica rollback di una modifica canonica valida;
10. verifica entrambi gli indici;
11. elimina sempre il database temporaneo tramite trap.

Risultato: `C3_OPPORTUNITY_GEOGRAPHY_RUNTIME_PASS`. Il database temporaneo non è rimasto presente dopo il test.

## Test repository

- `git diff --check`: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- unit suite: 184 PASS, 0 FAIL;
- runtime PostgreSQL locale: PASS;
- Next build: bloccata esclusivamente dal mancato download dei font Google Inter e Righteous nell'ambiente; nessun errore applicativo precedente al fetch.

La build non è una verifica manuale C3 e il fallimento esterno non invalida il runtime test della migration.

## Stato deploy e ambienti

| Voce | Stato |
| --- | --- |
| Codice migration | IMPLEMENTATO NEL REPOSITORY |
| Migration testata localmente | SÌ — PostgreSQL 16.15, PASS |
| Migration applicata Preview | NO |
| Migration applicata Production | NO |
| Production | NON INTERROGATA / NON MODIFICATA |
| GitHub Actions | Da verificare dopo pubblicazione piattaforma |
| Vercel Preview | Non applicabile a una migration non applicata e senza UI/runtime integration |
| Web | Schema repository-only; nessun read/write collegato |
| Mobile | NOT STARTED / NON MODIFICATO |
| Verifica manuale/visiva | NESSUNA VERIFICA MANUALE APPLICABILE |

## Blocker e decisioni residue

Non restano blocker C3. La migration non deve essere applicata a un database remoto senza autorizzazione separata.

C4 dovrà definire e implementare dual-read/dual-write, validazione server, atomicità e proiezione legacy. La sola presenza della migration non autorizza API, UI, grant, feature gate, backfill o rollout.

**Prossimo passaggio autorizzabile: C4 — dual-read/dual-write, esclusivamente previa autorizzazione esplicita. Fermarsi al termine di C3.**
