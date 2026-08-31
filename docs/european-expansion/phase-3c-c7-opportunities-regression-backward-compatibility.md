# FASE 3C-C7 — Opportunities regression e backward compatibility

## Esito

**CONDITIONAL PASS — repository e PostgreSQL locale PASS; audit Production read-only USER-REPORTED PASS; apply e smoke post-backfill NON AUTORIZZATI/PENDING.** C7 non è COMPLETATA.

**Aggiornamento gate:** il progetto non dispone di un Preview Branch Supabase funzionante collegato alla PR; `b4-rpc-validation` è UNHEALTHY e non è autorizzato. Il check Supabase resta QUEUED e il ticket Support è irrisolto. L'utente ha eseguito esclusivamente l'alternativa Production read-only; non sono stati autorizzati nuovi Preview Branch, apply/backfill, uso del branch unhealthy o altre query Production da parte dell'agente.

## Obiettivo e confine

C7 chiude la regressione web/API di C1–C6 e affronta il gap emerso nello smoke C6: le Opportunity storiche testuali restano leggibili, ma non soddisfano un filtro canonico ID-based. Non vengono modificate semantiche di ownership, applications, RLS, grants, trigger o mobile.

Il backfill è deliberatamente un **runbook manuale**, non una migration automatica: il merge non deve causare scritture dati non revisionate. Nessuna query remota o scrittura Production è stata eseguita dall'agente.

## Artefatti

- `supabase/runbooks/manual/audit_opportunity_legacy_geography_backfill.sql`: genera conteggi e lista degli scarti, poi esegue rollback;
- `supabase/runbooks/manual/audit_opportunity_legacy_geography_production_read_only.sql`: alternativa Production a singolo statement CTE/SELECT, solo conteggi aggregati;
- `supabase/runbooks/manual/opportunity_legacy_geography_backfill_plan.sql`: piano condiviso in temporary table;
- `supabase/runbooks/manual/apply_opportunity_legacy_geography_backfill.sql`: apply transazionale, serializzato con advisory lock;
- `supabase/runbooks/manual/apply_opportunity_legacy_geography_production_fail_closed_31.sql`: candidato Production vincolato allo snapshot approvato 31/0/0/0/0, preparato ma non autorizzato;
- `supabase/rollbacks/20261205_opportunity_legacy_geography_backfill.sql`: rollback fail-closed per soli UUID approvati;
- `scripts/test-opportunity-legacy-geography-backfill-runtime.sh`: harness PostgreSQL locale;
- fixture/assertion SQL e unit test statici dedicati.

## Regole deterministiche

Sono eleggibili soltanto righe con entrambi gli ID canonici null e country normalizzato esattamente a `IT`, `Italia` o `Italy`. Nessun `ILIKE`, fuzzy matching, similarity, Levenshtein o inferenza dalla sede Club.

La risoluzione usa il livello più profondo compilato:

1. Municipality: nome esatto case-insensitive, più eventuale provincia (nome o sigla) e regione coerenti;
2. Province: soltanto se city è vuota, nome/sigla esatti e regione coerente se presente;
3. Region: soltanto se city e province sono vuote, nome esatto.

Un solo candidato scrive country+area. Più candidati o nessun candidato scrivono esclusivamente il country IT certo e lasciano l'area null. Le label legacy restano immutate. Le righe già canoniche e quelle estere non vengono toccate.

## Sicurezza e idempotenza

L'apply aggiorna esclusivamente `country_id` e `geo_area_id`, solo quando entrambi sono ancora null. Usa un advisory transaction lock e verifica la coerenza country/area prima dell'UPDATE. Una seconda esecuzione produce un piano vuoto. Il rollback non contiene un UPDATE globale: richiede la lista esplicita degli UUID derivata dall'evidenza approvata.

## Test eseguiti

Il runtime PostgreSQL 16.15 ha verificato:

- audit non mutativo con un match Municipality, un ambiguo e un unresolved;
- risoluzione di `Subiaco` con provincia legacy `RM` e regione `Lazio`;
- ambiguous/unresolved trasformati in country-only, senza area inventata;
- riga francese legacy e riga già canonica non modificate;
- testi legacy, owner/created_by/club_id e Application preservati;
- seconda apply senza ulteriori update;
- risultato `C7_OPPORTUNITY_BACKFILL_RUNTIME_PASS`;
- typecheck, lint e **207 unit test PASS, 0 FAIL**.

## Verifica Preview richiesta prima del completamento

1. Eseguire **solo** `audit_opportunity_legacy_geography_backfill.sql` sul target Preview e conservare i conteggi per resolution.
2. Revisionare almeno tutti gli `ambiguous_country_only` e `unresolved_country_only`; non applicare se i conteggi sono inattesi.
3. Dopo approvazione esplicita, eseguire l'apply su Preview e conservarne output/UUID per rollback.
4. Ripetere lo smoke `/opportunities` su “Juniores Regionale”: Italia → Lazio → Roma → Subiaco più gli altri filtri deve restituire la riga.
5. Verificare nuova Opportunity francese, lista senza filtri, detail, edit non geografico e una Application esistente.
6. Rieseguire l'audit: il piano deve essere vuoto per le righe già trattate; gli eventuali casi non italiani restano legacy.

Non applicare a Production finché audit, conteggi, rollback e smoke Preview non sono approvati. Non includere credenziali o UUID sensibili nel report.

## Audit Production read-only — esito comunicato

Poiché il gate Preview è esternamente bloccato, l'utente ha eseguito l'audit alternativo che:

- contiene un unico statement `WITH ... SELECT`;
- non crea nemmeno oggetti temporanei e non contiene DML, DDL o advisory lock;
- restituisce sempre e soltanto le cinque righe aggregate `municipality`, `province`, `region`, `ambiguous_country_only`, `unresolved_country_only` con il relativo conteggio;
- non restituisce UUID, testi geografici, owner, applicant o altri dati personali;
- verifica internamente che ogni mapping candidato appartenga al country canonico IT.

Esito user-reported del solo statement read-only:

| Resolution | Conteggio |
| --- | ---: |
| `municipality` | 31 |
| `province` | 0 |
| `region` | 0 |
| `ambiguous_country_only` | 0 |
| `unresolved_country_only` | 0 |

Il totale è 31 e coincide con i 31 match Municipality: copertura deterministica **100%**, nessun ambiguo e nessun unresolved. L'esito è favorevole e non richiede una coda di correzione manuale prima dell'eventuale apply. Rimane una fotografia del momento dell'audit: non autorizza né garantisce automaticamente un apply successivo se nel frattempo cambiano i dati.

## Prossimo passaggio controllato raccomandato

Preparato e testato localmente `apply_opportunity_legacy_geography_production_fail_closed_31.sql`. Il candidato acquisisce l'advisory transaction lock, ricalcola il piano nella stessa transazione e abortisce salvo esattamente 31 Municipality e zero nelle altre quattro categorie. Verifica inoltre che ogni target sia una Municipality attiva e coerente con IT, restituisce l'allowlist per rollback, aggiorna soltanto gli ID canonici e verifica il risultato prima del commit.

Il runtime PostgreSQL 16.15 ha applicato il candidato a 31 fixture Municipality, preservando testi legacy, ownership e Application; una seconda esecuzione con piano ormai diverso è stata rifiutata prima dell'UPDATE e i dati sono rimasti invariati. Risultato: `C7_PRODUCTION_FAIL_CLOSED_GATE_PASS`.

Il prossimo passaggio controllato è ora **una nuova autorizzazione esplicita all'esecuzione Production** del solo candidato fail-closed. L'apply non è stato eseguito dall'agente. Dopo l'eventuale apply saranno obbligatori: audit count-only atteso a zero, smoke di “Juniores Regionale”, nuova Opportunity francese, detail/edit non geografico e Application esistente. Nessuna fase successiva è avviata.

## Stato operativo

| Voce | Stato |
| --- | --- |
| Codice/runbook C7 | IMPLEMENTATO |
| Migration automatica nuova | NESSUNA |
| Audit/apply locale | PASS |
| Audit Preview | BLOCKED — nessun Preview Branch healthy |
| Apply Preview | BLOCKED — nessun Preview Branch healthy |
| Audit Production alternativo | USER-REPORTED PASS — 31/31 Municipality, zero scarti |
| Apply Production fail-closed | PREPARATO E TESTATO LOCALMENTE / NON ESEGUITO |
| Apply/backfill Production | NON ESEGUITO / NON AUTORIZZATO |
| Production | SOLO AUDIT READ-ONLY USER-REPORTED; DATI NON MODIFICATI |
| Web | C1–C6 preservati; regressione automatica PASS |
| Mobile | NOT STARTED / NON MODIFICATO |
| Stato C7 | CONDITIONAL PASS |
