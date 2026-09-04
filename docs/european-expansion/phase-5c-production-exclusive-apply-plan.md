# FASE 5C — Piano di apply Production esclusivo e migration history

Data: 2026-09-04
Stato: **PREFLIGHT PASS USER-REPORTED / APPLY NON AUTORIZZATO E NON ESEGUITO**
Perimetro: confronto history Production–repository e runbook per la sola migration `20261206120000_canonical_sports_competition_schema.sql`. Nessuna baseline viene creata o riparata e FASE 5D resta **NOT STARTED**.

## 1. Evidenza Production ricevuta

Il report read-only `phase-5c-pb-v2`, eseguito dall'utente nel SQL Editor Production, ha restituito:

- `classification.status = PASS`, zero blocking reason;
- tutte le sei dipendenze, colonne, tipi, candidate key e i ruoli richiesti compatibili;
- zero collisioni sui 19 nomi tabella e zero collisioni su funzioni, trigger e indici 5C;
- `supabase_migrations.schema_migrations` disponibile, con una sola versione registrata: `20250221090000`;
- nessuna riga history per `20261206120000`.

Questa è evidenza **user-reported read-only**. Production è stata interrogata ma non modificata. Il preflight DDL della 5C è **PASS**; non è invece sana la history globale necessaria a un normale replay/push.

## 2. Confronto completo history Production–file locali

L'inventario deterministico di `supabase/migrations/*.sql` rileva:

| Misura | Esito |
| --- | ---: |
| file migration locali | 122 |
| file con versione registrata in Production | 1 |
| file locali non registrati in Production | 121 |
| versioni locali distinte successive alla history Production | 120 |
| prima versione candidata non registrata | `20250224090000` |
| ultima versione candidata non registrata | `20261206120000` (5C) |

L'unica corrispondenza è `20250221090000_add_club_id_to_opportunities.sql`. Tutti i file locali successivi risultano assenti dalla history remota, anche se il report baseline prova che molti dei relativi effetti esistono già nello schema persistente. Questo indica applicazioni storiche manuali/fuori history o metadata incompleti, non 121 migration sicuramente mai eseguite.

Esiste inoltre una collisione locale di versione: sia `20260720103000_normalize_pallavolo_to_volley.sql` sia `20260720103000_seed_players_from_excel.sql` usano `20260720103000`. Prima del futuro repair completo questa ambiguità dovrà essere risolta e testata, ma non viene modificata in questo task.

## 3. Perché `supabase db push` è vietato

`supabase db push` confronta i file locali con `supabase_migrations.schema_migrations`; non seleziona automaticamente soltanto l'ultimo file desiderato. Con l'evidenza attuale considera non registrati i 121 file successivi alla sola versione remota. Un push normale può quindi:

1. arrestarsi già durante la validazione per la versione locale duplicata; oppure
2. tentare la sequenza pending a partire da `20250224090000_job5_messaging.sql`, includendo DDL/DML/backfill storici fino alla 5C.

Entrambi gli esiti sono incompatibili con l'autorizzazione “solo 5C”. Non usare `supabase db push`, `supabase db push --include-all` o un rename/spostamento temporaneo della directory: non garantirebbero né selezione esclusiva né una history affidabile.

## 4. Unica procedura proposta: SQL esatto, verifica, repair ufficiale

La procedura proposta applica il file 5C direttamente tramite PostgreSQL e, soltanto dopo esito positivo, registra **quella sola versione** con il comando ufficiale Supabase `migration repair`. Richiede una successiva autorizzazione mutativa esplicita; i comandi seguenti sono un runbook, **non sono stati eseguiti**.

Prerequisiti operatore: checkout del commit autorizzato, `psql`, Supabase CLI autenticata e progetto Production già collegato/verificato. La connection string deve essere fornita fuori banda e non salvata nella repository.

```bash
set -euo pipefail

export PRODUCTION_DATABASE_URL='postgresql://...'
MIGRATION='supabase/migrations/20261206120000_canonical_sports_competition_schema.sql'
EXPECTED_SHA256='28a396be4616ea6dba57482946af5c15ec8df579ebb4ad4ca6947309e8d60bf7'

# Gate locale: applicare esattamente il file revisionato.
test "$(sha256sum "$MIGRATION" | awk '{print $1}')" = "$EXPECTED_SHA256"

# Gate remoto read-only: identità target e stato history immediatamente prima dell'apply.
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c \
  "select current_database() as database, current_user as db_user, current_setting('server_version') as server_version;"
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c \
  "select version from supabase_migrations.schema_migrations where version in ('20250221090000','20261206120000') order by version;"

# UNICA write allo schema applicativo: il file 5C, già racchiuso in BEGIN/COMMIT.
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$MIGRATION"

# Verifica read-only prima di dichiarare la versione applicata nella history.
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
select
  count(*) filter (where c.relrowsecurity) as rls_enabled,
  count(*) as table_count
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p')
  and c.relname = any (array[
    'player_positions','staff_roles','player_position_applicability','staff_role_applicability',
    'sports_organizations','sports_organization_countries','gender_categories',
    'competition_formats','territorial_scopes','competition_levels','age_classes','seasons',
    'competitions','competition_countries','competition_geo_areas','competition_editions',
    'competition_groups','legacy_player_position_mappings','legacy_staff_role_mappings'
  ]);
SQL

# UNICA write ai metadata history: registra esclusivamente 20261206120000.
supabase migration repair 20261206120000 --status applied --linked

# Gate finale read-only: devono risultare esattamente le due versioni note.
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c \
  "select version from supabase_migrations.schema_migrations where version in ('20250221090000','20261206120000') order by version;"
```

Il primo controllo post-DDL deve restituire `table_count = 19` e `rls_enabled = 19`; in caso contrario **non eseguire** `migration repair` e aprire un incidente. Se il DDL e i controlli passano ma `migration repair` fallisce, non rieseguire `db push`: lo schema 5C è additivo/idempotente, ma lo stato intermedio “oggetti presenti/history assente” va conservato e il solo repair può essere ritentato dopo diagnosi.

Il repair aggiungerà la 5C alla history, ma **non** sanerà le 120 versioni intermedie mancanti: anche dopo un apply riuscito `db push` resterà vietato finché la baseline/history non sarà riconciliata in una sottofase separata.

## 5. Verifiche post-apply obbligatorie

Dopo una futura autorizzazione e l'esecuzione del runbook, l'operatore deve conservare e comunicare:

1. hash SHA-256 coincidente e identità del target Production;
2. exit code zero di `psql -f` e `migration repair`;
3. history contenente `20250221090000` e `20261206120000` una sola volta ciascuna;
4. 19/19 tabelle presenti e 19/19 con RLS abilitata;
5. 76 policy attese, tre trigger di cycle guard e relativi trigger abilitati;
6. zero righe in ciascuno dei 19 cataloghi (5C non contiene seed/backfill);
7. grant attesi: read catalogo ad `anon`/`authenticated`, write admin-scoped e accesso `service_role`;
8. smoke umano Web/API sui flussi esistenti Profile, Search e Opportunity: nessun cambiamento visibile atteso, nessun HTTP 4xx/5xx nuovo, nessun errore Console/Network;
9. conferma che `profiles`, `athlete_experiences`, `opportunities` e `applications` non sono stati modificati dalla 5C.

Lo smoke umano è **richiesto dopo l'apply**, non applicabile ora perché non è avvenuta alcuna modifica remota o UI.

## 6. Checkpoint obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | FASE 5C — Production preflight e piano apply esclusivo |
| Stato | **APPLICATA IN PRODUCTION / DATABASE PASS / SMOKE WEB/API PENDING** |
| Codice/API/UI modificati | no |
| Documento modificato | sì |
| Migration creata | già creata: `20261206120000` |
| Migration testata | sì, locale; Production preflight PASS user-reported |
| Migration applicata | **sì, Production; esecuzione user-reported conclusa con COMMIT** |
| Production interrogata | **sì, read-only dall'utente** |
| Production modificata | **sì, esclusivamente oggetti 5C e singola riga history autorizzata** |
| RLS/grant/ownership modificati | RLS/grant applicati ai soli oggetti 5C; ownership esistente invariata |
| Applications/backfill modificati | no / no |
| Impatto Web/API | nessuno in questo task |
| Mobile FASE 5 | NOT STARTED / NON MODIFICATO |
| Verifiche umane ora | smoke Web/API rinviabile; database già verificato PASS |
| Rischio residuo | history incompleta, 120 versioni intermedie mancanti e una versione locale duplicata |
| Baseline repair | non iniziato e non autorizzato |
| FASE 5D | **NOT STARTED / NON AUTORIZZATA** |
| Prossimo passaggio autorizzabile | smoke umano Web/API 5C; nessuna 5D senza nuova autorizzazione |

## 7. Esito Production confermato

L'utente ha eseguito il runbook autorizzato sul database Production:

- hash del file coincidente;
- apply diretto via `psql`, terminato con `COMMIT`;
- verifica post-apply: 19 tabelle, RLS 19/19, 76 policy, tre funzioni, tre trigger abilitati, grant attesi e zero righe;
- repair limitato alla sola versione `20261206120000`, terminato con successo;
- verifica finale read-only `PASS_PHASE_5C_HISTORY_REGISTERED` con due versioni totali, ciascuna presente una sola volta: `20250221090000` e `20261206120000`;
- transazione di verifica conclusa con `ROLLBACK` e variabili di connessione rimosse.

Non sono stati usati `db push` o `--include-all`; le versioni storiche intermedie non sono state riparate. Lo stato database della 5C è **PASS**. Resta soltanto lo smoke umano Web/API, che può essere svolto in una sessione successiva; fino ad allora la certificazione complessiva rimane **PENDING SMOKE**. FASE 5D non è avviata né autorizzata.
