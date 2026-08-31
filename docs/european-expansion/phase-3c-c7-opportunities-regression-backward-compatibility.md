# FASE 3C-C7 — Opportunities regression e backward compatibility

## Esito

**PASS / COMPLETATA — repository e PostgreSQL locale PASS; audit, apply fail-closed, post-audit e smoke Production USER-REPORTED PASS.**

**Aggiornamento gate:** il progetto non disponeva di un Preview Branch Supabase funzionante collegato alla PR; `b4-rpc-validation` era UNHEALTHY e non autorizzato, il check Supabase QUEUED e il ticket Support irrisolto. Il percorso sostitutivo Production è stato autorizzato ed eseguito manualmente dall'utente per il solo runbook fail-closed documentato; nessun altro apply, migration o write è stato autorizzato.

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

## Verifica originariamente prevista su Preview

1. Eseguire **solo** `audit_opportunity_legacy_geography_backfill.sql` sul target Preview e conservare i conteggi per resolution.
2. Revisionare almeno tutti gli `ambiguous_country_only` e `unresolved_country_only`; non applicare se i conteggi sono inattesi.
3. Dopo approvazione esplicita, eseguire l'apply su Preview e conservarne output/UUID per rollback.
4. Ripetere lo smoke `/opportunities` su “Juniores Regionale”: Italia → Lazio → Roma → Subiaco più gli altri filtri deve restituire la riga.
5. Verificare nuova Opportunity francese, lista senza filtri, detail, edit non geografico e una Application esistente.
6. Rieseguire l'audit: il piano deve essere vuoto per le righe già trattate; gli eventuali casi non italiani restano legacy.

La Preview Supabase è rimasta indisponibile. Il percorso sostitutivo Production è stato separato in audit count-only, apply fail-closed esplicitamente autorizzato, post-audit e smoke; credenziali e UUID non sono registrati in questo documento.

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

## Esecuzione Production e chiusura

L'utente ha eseguito manualmente una sola volta, tramite `psql` dal commit remoto autorizzato `e8b4a6f2d23254ff8f1066007b9c575813b4b94e`, esclusivamente `apply_opportunity_legacy_geography_production_fail_closed_31.sql`. Preflight: connessione PostgreSQL 17.4 PASS, backup fisico del 31 Aug 2026 04:15:06 UTC con restore disponibile, audit immediato ancora 31/0/0/0/0. La password database esposta incidentalmente durante il setup è stata ruotata prima della connessione riuscita.

Esito apply user-reported: **exit code 0**, `municipality=31`; allowlist conservata privatamente. Post-audit count-only: `municipality=0`, `province=0`, `region=0`, `ambiguous_country_only=0`, `unresolved_country_only=0`. Il runbook non deve essere rieseguito.

Smoke read-only user-reported: “Juniores Regionale” PASS, “Opportunité Ain” PASS, lista senza filtri PASS, detail PASS, edit aperto senza salvataggio PASS, Applications esistenti PASS, console browser PASS. Ownership, applications, testi legacy e comportamento delle nuove Opportunity canoniche risultano preservati nelle verifiche applicabili.

C7 è quindi **COMPLETATA / PASS**. Nessuna fase successiva, merge o ulteriore operazione Production è avviata o autorizzata da questa chiusura.

## Stato operativo

| Voce | Stato |
| --- | --- |
| Codice/runbook C7 | IMPLEMENTATO |
| Migration automatica nuova | NESSUNA |
| Audit/apply locale | PASS |
| Audit Preview | BLOCKED — nessun Preview Branch healthy |
| Apply Preview | BLOCKED — nessun Preview Branch healthy |
| Audit Production alternativo | USER-REPORTED PASS — 31/31 Municipality, zero scarti |
| Apply Production fail-closed | USER-REPORTED PASS — exit 0, 31 Municipality |
| Post-audit Production | PASS — tutti i conteggi a zero |
| Production | BACKFILL LIMITATO COMPLETATO; NESSUN ALTRO WRITE |
| Web | C1–C7 regressione automatica e smoke PASS |
| Mobile | NOT STARTED / NON MODIFICATO |
| Stato C7 | PASS / COMPLETATA |
