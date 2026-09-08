# FASE 5F-C — Runbook esclusivo apply 5F-A Production

Data: 2026-09-08  
Stato: **APPLY AUTORIZZATO — PREFLIGHT PRODUCTION RICONFERMATO PASS ALLE 10:43:01 UTC; APPLY NON ANCORA ESEGUITO**

## 0. Registro autorizzazione ed esecuzione

- Autorizzazione utente ricevuta il 2026-09-08 per applicare esclusivamente 5F-A in Production e, solo dopo un post-check PASS, registrare la sola versione `20261208120000` nella migration history.
- Verifica workspace: `PRODUCTION_DATABASE_URL`, `SUPABASE_DB_URL` e `DATABASE_URL` non sono configurate; non sono presenti file `.env*` o credential file utilizzabili e non è disponibile un client Supabase autenticato.
- Esito operativo: **BLOCKED_NOT_EXECUTED**. Non è stata aperta alcuna connessione Production, non è stato rieseguito il preflight remoto, non è stato acquisito alcun lock, non è stato applicato DDL e la migration history non è stata modificata.
- L'autorizzazione resta registrata, ma l'esecuzione deve avvenire in un Codespace autorizzato che esponga `PRODUCTION_DATABASE_URL`. Non condividere la credenziale in chat. Prima di eseguire, ripartire dal punto 3 e rispettare tutti gli stop gate.
- Checkpoint utente successivo: nel Codespace autorizzato il preflight Production è stato rieseguito alle `10:43:01 UTC` con `PASS_READY_TO_APPLY_5F_A`, `transactionReadOnly=on` e chiusura `ROLLBACK`. La connessione in quel Codespace funziona. Questo supera lo stop gate preflight per quello snapshot, ma non prova né registra l'apply: 5F-A e la relativa history restano assenti in attesa degli esiti successivi.

## 1. Evidenza e decisione

Preflight Production 5F-B eseguito dall'utente nel SQL Editor il 2026-09-08 alle `10:06:54.813523+00:00`: **`PASS_READY_TO_APPLY_5F_A`**, `transactionReadOnly=on`. History: 5C una riga, 5D-C zero, 5F-A zero. Candidate key 5C presenti; tre colonne e quattro constraint 5F-A assenti. Preview resta **NON VERIFICATO**.

La migration è applicabile alla Production descritta dallo snapshot più recente e l'autorizzazione è stata ricevuta. L'esecuzione resta separata: non dichiarare l'apply finché non sono disponibili output del comando, post-check PASS e registrazione history conclusa.

Migration esclusiva: `supabase/migrations/20261208120000_profile_primary_sport.sql`.  
SHA-256 approvabile: `313a56e370e700c2906987b944bbbefb2edd15ad7c7d51d435e1fa2d3022e9f3`.  
Dimensione: `2351` byte.

## 2. Nove trigger Production contro quattro locali

Production ha riportato nove trigger `profiles`, tutti enabled. Il runtime 5F-A aveva installato soltanto quattro trigger complessi versionati e direttamente pertinenti a location, names, visibility e demotion notification; non costituisce quindi un inventario completo di Production. L'inventario Production da preservare integralmente è:

- `enforce_single_platform_admin_profile`;
- `profiles_notify_draft_demotion`;
- `profiles_set_visibility_status`;
- `profiles_sync_names`;
- `set_updated_at`;
- `trg_profile_location_coerce`;
- `trg_profiles_fill_default_role`;
- `trg_profiles_fill_role_for_fan`;
- `trg_profiles_updated_at`.

La differenza non blocca l'ALTER: 5F-A non disabilita/ricrea trigger e non esegue INSERT/UPDATE su `profiles`, quindi i trigger row-level non vengono invocati. PostgreSQL adatta il row type della tabella alle colonne aggiunte. La validazione FK/check legge le righe ma non esegue i trigger. Resta obbligatorio confrontare nel post-check count, stato, funzione e definizione di tutti e nove; qualunque trigger mancante/disabilitato o definizione cambiata blocca la registrazione history e richiede analisi, non correzione automatica.

Il futuro collegamento runtime dovrà testare anche i cinque trigger aggiuntivi; questo non è parte dell'apply schema-only.

## 3. Preparazione Codespace — nessuna write

Sostituire `YOUR_PRODUCTION_PROJECT_REF` con il project ref visibile nel dashboard. Usare soltanto il secret Codespace già autorizzato.

```bash
cd /workspace/clubandplayer-app
git status --short
git rev-parse --short HEAD

MIGRATION='supabase/migrations/20261208120000_profile_primary_sport.sql'
EXPECTED_SHA256='313a56e370e700c2906987b944bbbefb2edd15ad7c7d51d435e1fa2d3022e9f3'
printf '%s  %s\n' "$EXPECTED_SHA256" "$MIGRATION" | sha256sum --check --strict

set +x
: "${PRODUCTION_DATABASE_URL:?Configura PRODUCTION_DATABASE_URL come Codespace secret}"
export EXPECTED_PRODUCTION_PROJECT_REF='YOUR_PRODUCTION_PROJECT_REF'
python - <<'PY'
import os
from urllib.parse import urlparse
url = urlparse(os.environ['PRODUCTION_DATABASE_URL'])
ref = os.environ['EXPECTED_PRODUCTION_PROJECT_REF']
identity = f'{url.hostname or ""} {url.username or ""}'
if not ref or ref == 'YOUR_PRODUCTION_PROJECT_REF' or ref not in identity:
    raise SystemExit('STOP: connection does not match the expected Production project ref')
print(f'Production target verified: host={url.hostname}, database={url.path.lstrip("/")}')
PY
```

Stop immediato se working tree non è pulita, commit/file/checksum non corrispondono o il project ref non è presente nell'identità della connessione. Non stampare la URL.

## 4. Query SQL Editor prima dell'apply

### 4.1 Rerun 5F-B

Eseguire integralmente `scripts/sports/reports/phase-5f-b-profile-primary-sport-preflight-read-only.sql`. Procedere soltanto con `PASS_READY_TO_APPLY_5F_A`, `transactionReadOnly=on`, 5C=1, 5F-A=0, colonne=0, constraint=0 e nove trigger enabled invariati.

### 4.2 Verifica forma history

```sql
begin transaction read only;
select column_name, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'supabase_migrations'
  and table_name = 'schema_migrations'
order by ordinal_position;

select to_jsonb(sm) as reference_history_row
from supabase_migrations.schema_migrations sm
where version = '20261206120000';
rollback;
```

Stop se `version` non è `text`, se esistono altre colonne obbligatorie senza default o se la riga 5C non è unica. Il runbook usa un insert diretto della sola `version`; non usa `migration repair`.

## 5. Apply esclusivo da Codespace — **eseguire solo dopo autorizzazione**

La migration contiene già `BEGIN/COMMIT`. Non usare `--single-transaction`, `db push` o altre migration. Gli `ALTER TABLE profiles` acquisiscono un `ACCESS EXCLUSIVE` lock: eseguire in finestra a basso traffico. `lock_timeout=5s` impedisce attese prolungate; `statement_timeout=60s` limita l'intera validazione. Un timeout fa fallire e rollbackare la migration, senza retry automatico.

```bash
cd /workspace/clubandplayer-app
MIGRATION='supabase/migrations/20261208120000_profile_primary_sport.sql'
EXPECTED_SHA256='313a56e370e700c2906987b944bbbefb2edd15ad7c7d51d435e1fa2d3022e9f3'
printf '%s  %s\n' "$EXPECTED_SHA256" "$MIGRATION" | sha256sum --check --strict

PGOPTIONS='-c application_name=phase_5f_a_exclusive_apply -c lock_timeout=5s -c statement_timeout=60s' \
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -P pager=off -f "$MIGRATION" \
  | tee /tmp/phase-5f-a-production-apply.txt
```

Successo DDL richiede exit code `0` e `COMMIT`. Su timeout, errore FK/check o perdita connessione: **STOP**, non registrare history e non modificare manualmente colonne/constraint.

## 6. Post-check SQL Editor prima della history

Eseguire `scripts/sports/reports/phase-5f-c-profile-primary-sport-post-apply-read-only.sql` e salvare il JSON. Requisiti:

- `schemaReady=true`;
- tre colonne UUID nullable senza default;
- quattro constraint compatible e validated;
- `profileTriggerCount=9`, `disabledProfileTriggerCount=0`;
- stesso elenco/function/definition del preflight;
- `canonicalNonNullRows=0` (nessun backfill/runtime write);
- `phase_5f_a_rows=0` prima della registrazione.

Se un requisito fallisce: **STOP**. Lo schema può essere applicato ma history resta intenzionalmente assente finché non viene analizzato il mismatch.

## 7. Registrazione history nel SQL Editor — **solo dopo post-check PASS**

Eseguire soltanto se la query 4.2 ha confermato che `version` è l'unica colonna obbligatoria senza default:

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '15s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;

insert into supabase_migrations.schema_migrations(version)
values ('20261208120000');

select count(*) as phase_5f_a_history_rows
from supabase_migrations.schema_migrations
where version = '20261208120000';
commit;
```

Il conteggio deve essere `1`. Unique violation, timeout o conteggio diverso da uno → STOP. Non usare `migration repair`.

## 8. Verifica finale SQL Editor e chiusura Codespace

1. Rieseguire il post-check: `schemaReady=true`, trigger 9/0, canonical non-null 0, history 1.
2. Rieseguire 5F-B: deve restituire `PASS_5F_A_ALREADY_APPLIED`.
3. Conservare entrambi i JSON sanitizzati e l'exit code del comando Codespace.
4. Chiudere la sessione senza lasciare credenziali:

```bash
unset PRODUCTION_DATABASE_URL EXPECTED_PRODUCTION_PROJECT_REF PGOPTIONS
rm -f /tmp/phase-5f-a-production-apply.txt
```

## 9. Stop gate

L'autorizzazione al punto 5 e alla registrazione condizionata della history è stata ricevuta il 2026-09-08. **L'esecuzione non è avvenuta perché questo workspace non dispone della connessione Production.** Nel Codespace autorizzato, interrompere comunque il flusso a ogni stop gate e non registrare la history se il post-check non è PASS.

Preview, 5D-C, 5D-E-I, route/planner, UI, selector, seed, backfill e ogni altra migration restano esclusi.
