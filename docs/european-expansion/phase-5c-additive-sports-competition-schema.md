# FASE 5C — Schema additivo Sports / Disciplines / Competitions

## Checkpoint

| Voce | Stato |
| --- | --- |
| Fase / sottofase | **FASE 5C** |
| Stato | **IMPLEMENTATA E TESTATA LOCALMENTE — attende autorizzazione 5D** |
| Migration creata | `20261206120000_sports_competition_canonical_schema.sql` |
| Migration testata | **Sì — PostgreSQL 16.15 locale, doppia applicazione PASS** |
| Migration applicata | **Solo database locale temporaneo; NON Preview/Production** |
| Production interrogata / modificata | **No / No** |
| RLS / grant | **Modificati soltanto per le nuove tabelle 5C** |
| Ownership / Applications | **Non modificati** |
| Web / API | Nuove strutture non collegate; comportamento invariato |
| Mobile | **NOT STARTED / NON MODIFICATO** |
| Smoke manuale | Non applicabile; nessuna UI/API mutata |

## Schema creato

La migration transazionale e idempotente crea cataloghi **vuoti** per:

- `sports_organizations` e relazione multi-sport `sports_organization_sports`;
- `player_roles` sport-specific e `staff_roles` cross-sport;
- `age_classes`, `gender_classes`, `competition_formats`;
- `competitions`, `competition_levels`, `competition_seasons`, `competition_groups`;
- `profile_sports`, relazione multi-sport ordinata con un solo primary opzionale.

La migration riusa `sports`, `sport_disciplines` e `sport_variants` della foundation. Aggiunge indici unici compositi necessari a FK che impediscono discipline/variant/Player role associate allo sport sbagliato.

## Relazioni e constraint

- organization/sport deve esistere prima della competition;
- discipline deve appartenere allo sport e variant alla discipline;
- Player role deve appartenere allo sport; Staff role resta separato;
- una season appartiene a una competition e richiede `starts_on <= ends_on`;
- un group appartiene alla stessa competition della season e dell'eventuale level;
- competition code è unico nell'organization; source identity è unica quando presente;
- `profile_sports` ammette un solo `is_primary=true` per profilo;
- scope territoriali non assumono la gerarchia italiana.

## Integrazione additiva legacy

`athlete_experiences` riceve reference nullable a sport, discipline, variant, Player role, competition, level, age class e season. `opportunities` riceve reference nullable equivalenti, oltre a Staff role, organization, gender class e format.

I campi legacy restano invariati. Non esistono default canonicali, seed o backfill; tutte le righe preesistenti conservano reference nulle. La migration non cambia `club_id`, `owner_id`, `created_by`, `status`, policy Opportunity o Applications.

## RLS, grant e privacy

- nuovi cataloghi: `SELECT` anon/authenticated; mutate authenticated soltanto se la policy admin esistente è soddisfatta; service role per workflow controllati;
- `profile_sports`: nessun grant anon; owner/admin può select/insert/update/delete; service role conserva accesso;
- nessuna esposizione pubblica automatica degli sport profilo: sarà una decisione della 5F insieme alla visibilità profilo;
- nessuna policy, grant o ownership di tabelle preesistenti viene cambiata.

## Runtime PostgreSQL

Harness: `scripts/test-sports-competition-schema-runtime.sh`, con setup e assertion sotto `tests/integration/sql/`.

La migration viene applicata due volte a un database PostgreSQL 16.15 temporaneo. Il test verifica:

1. preservazione esatta delle righe legacy e assenza di backfill;
2. insert valido organization → competition → season → group;
3. rifiuto disciplina cross-sport;
4. rifiuto date season inverse;
5. unicità del primary sport;
6. catalog read anon e write anon negato;
7. visibilità `profile_sports` owner e negazione al non-owner;
8. grant effettivi e assenza di `applications` dal perimetro.

Il database temporaneo viene eliminato automaticamente. Nessuna connessione remota è usata.

Esiti automatici finali: test mirati schema/contract/taxonomy **27/27 PASS**; suite unit completa **298/298 PASS**; runtime PostgreSQL **PASS**; lint, typecheck e `git diff --check` **PASS**. La build è stata eseguita ma non ha potuto scaricare `Inter` e `Righteous` da Google Fonts per il limite di rete ambientale; non è emerso un errore del codice 5C.

## Test e acceptance

- static migration tests;
- contract/taxonomy regressions;
- suite unit completa;
- lint, typecheck, build e `git diff --check`;
- runtime PostgreSQL locale con doppia applicazione;
- smoke API/UI/Preview: non applicabile perché lo schema non è collegato.

## Rischi residui

- La migration **non è applicata** ad alcun ambiente remoto; la history/schema Production non sono verificati.
- I cataloghi sono vuoti: la 5D dovrà definire seed, alias, provenance e licensing senza dati utente.
- La visibilità pubblica di `profile_sports` è volutamente fail-closed fino alla 5F.
- Le reference canonicali non sono ancora lette o scritte da API/UI; dual-read/write appartiene alla 5E.
- Nessun backfill è autorizzato.

## Prossimo passaggio autorizzabile

**FASE 5D — cataloghi e seed controllati**, solo dopo autorizzazione esplicita. Non applicare questa migration a Preview o Production e non interrogare Production automaticamente.
