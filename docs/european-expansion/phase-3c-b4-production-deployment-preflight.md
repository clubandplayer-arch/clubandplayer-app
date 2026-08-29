# FASE 3C-B4.4 Step 2 — Production deployment preflight

## Esito

**STATIC PREFLIGHT: BLOCKED — BLOCCHI 1–3 VERIFICATI; BLOCCO 4 HA RILEVATO SIDE EFFECT TRIGGER; DEPLOYMENT NON AUTORIZZATO.**

La migration `20261204120000_transactional_profile_residence_rpc.sql` ha superato revisione statica e runtime PostgreSQL locale già certificato. Non contiene `INSERT`, `UPDATE` o `DELETE` applicati al momento della migration: crea o sostituisce una funzione, ne imposta il commento e revoca `EXECUTE` a tutti i ruoli Data API. La concessione è demandata alla migration separata `20261204122000_enable_profile_residence_rpc.sql`. Nessun profilo o `profile_preferences` viene modificato finché un utente autenticato non invoca esplicitamente la RPC dopo l’abilitazione server-side.

Il Blocco 1 Production ha confermato tutte le tabelle e colonne richieste. Ha inoltre rilevato che `profiles.residence_region_id`, `residence_province_id` e `residence_municipality_id` sono `integer/int4`; la RPC è stata quindi corretta nel repository per accettare soltanto mapping nel range `1..2147483647`, evitando conversioni implicite da `bigint`. Il passaggio a Production resta condizionato ai successivi controlli read-only.

## Effetti DDL della migration

All’interno di una singola transazione la migration esegue esclusivamente:

1. `create or replace function public.update_my_profile_residence(uuid, uuid)`;
2. `comment on function ...`;
3. `revoke ... from public`;
4. `revoke ... from anon`;
5. `revoke all ... from authenticated` (oltre a `PUBLIC` e `anon`).

Non altera tabelle, constraint, policy, trigger o dati. Se una funzione con la stessa firma esistesse già, `create or replace` ne sostituirebbe il corpo: per questo l’assenza o la definizione della funzione preesistente è un gate obbligatorio.

## Revisione di sicurezza

- firma ristretta a due UUID nullable; nessun JSON arbitrario e nessun `profile_id` client-controlled;
- `SECURITY INVOKER` e `search_path = ''`;
- identità derivata esclusivamente da `auth.uid()`;
- profilo selezionato tramite `profiles.user_id = auth.uid()`;
- account type ammessi: `athlete`, `staff`; Club, Institution, Fan e anonimi rifiutati;
- country obbligatoriamente supported/active;
- geo-area attiva, country-consistent, catena ancestors completa, senza cicli e con profondità massima 16;
- mapping IT obbligatori, numerici e univoci per ogni livello incontrato;
- allowlist `profiles`: `region`, `province`, `city`, `residence_region_id`, `residence_province_id`, `residence_municipality_id`, `updated_at`;
- allowlist `profile_preferences`: `residence_country_id`, `residence_geo_area_id`;
- nessun accesso a interests, birth country, nationality o relocation;
- privilegi `EXECUTE` revocati a `PUBLIC`/`anon`/`authenticated` nella migration RPC; la migration di attivazione separata concede soltanto ad `authenticated`.

Con `SECURITY INVOKER`, SELECT/UPDATE/INSERT dipendono dai grant e dalle policy RLS del chiamante. Le migration note definiscono owner policies su `profiles` e owner/admin policies su `profile_preferences`; cataloghi e mapping hanno SELECT per `authenticated`. La migration `20261113110000_data_api_explicit_grants.sql` concede i privilegi tabellari alle tabelle RLS note. Tutto deve essere riconfermato sul database reale prima del deployment.

## Atomicità e trigger

La funzione e le due mutazioni risiedono nella stessa transazione della chiamata PostgreSQL: qualsiasi eccezione annulla sia l’update `profiles` sia l’upsert `profile_preferences`. Non esistono blocchi che assorbano errori.

L’update di `profiles` attiva i trigger esistenti. Nel repository sono noti almeno `profiles_set_visibility_status` e `profiles_notify_draft_demotion`; la prima verifica Production deve inventariare tutti i trigger effettivi. La RPC non modifica direttamente status o visibility, ma il comportamento dei trigger reali resta un gate runtime.

## Compatibilità nota e punti da confermare

Confermati dal repository:

- `countries`, `geo_areas`, `legacy_geo_area_mappings` e relativi vincoli/RLS;
- `profile_preferences(profile_id, residence_country_id, residence_geo_area_id)` e FK composita country/area;
- owner RLS per `profiles` e `profile_preferences`;
- supporto account type `athlete`, `staff` e `institution` nello schema più recente;
- migration RPC ordinata dopo `20261203120000_profile_canonical_geography.sql`.

Da confermare esclusivamente con query read-only Production:

- **SUPERATO:** presenza e tipi dei campi legacy residence e di `profiles.user_id/account_type/type/updated_at`;
- **VERIFICATO:** zero `user_id` non-null duplicati; nessun vincolo UNIQUE rilevato, RPC corretta per rifiutare ambiguità futura;
- **SUPERATO:** grant e RLS effettivi; policy owner necessarie presenti;
- **SUPERATO:** funzione omonima non presente;
- **BLOCKER:** trigger verificati; l’update residence attiva side effect fuori dall’allowlist RPC;
- completezza/univocità dei mapping italiani;
- migration history reale, incluso `20261203120000` e assenza di `20261204120000`.

## Sequenza di deployment proposta

1. mantenere entrambi i feature gate assenti/false;
2. eseguire i blocchi read-only del preflight, uno alla volta, e revisionarne l’output senza dati personali;
3. risolvere ogni discrepanza prima di chiedere approvazione migration;
4. acquisire backup/checkpoint operativo secondo la procedura Supabase Production;
5. ottenere approvazione esplicita all’applicazione della sola migration RPC;
6. applicare la migration con feature gate ancora false;
7. verificare firma, proconfig, owner, grants e assenza di mutazioni profilo;
8. abilitare inizialmente soltanto account dedicati/ambiente controllato secondo una decisione successiva;
9. eseguire Player e Staff: reset, country-only, full IT, full foreign e read-after-write;
10. lasciare Club, Institution e Fan esclusi; abilitazione generale soltanto dopo certificazione.

## Query read-only preparate

Le query devono essere eseguite e valutate **una fase alla volta**. Non contengono dati profilo né selezionano valori personali.

### Blocco 1 — oggetti e colonne richiesti — READ-ONLY

```sql
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind,
  c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'profile_preferences', 'countries', 'geo_areas', 'legacy_geo_area_mappings')
order by c.relname;

select
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'profiles' and column_name in (
      'id', 'user_id', 'account_type', 'type', 'region', 'province', 'city',
      'residence_region_id', 'residence_province_id', 'residence_municipality_id', 'updated_at'
    ))
    or (table_name = 'profile_preferences' and column_name in (
      'profile_id', 'residence_country_id', 'residence_geo_area_id'
    ))
    or (table_name = 'countries' and column_name in ('id', 'iso2', 'is_supported', 'is_active'))
    or (table_name = 'geo_areas' and column_name in ('id', 'country_id', 'parent_id', 'official_name', 'area_type', 'is_active'))
    or (table_name = 'legacy_geo_area_mappings' and column_name in (
      'source_system', 'source_entity_type', 'legacy_id', 'geo_area_id'
    ))
  )
order by table_name, ordinal_position;

select
  p.oid::regprocedure::text as function_signature,
  p.prosecdef as security_definer,
  p.proconfig,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'update_my_profile_residence';
```

Il Blocco 1 è stato eseguito: le colonne richieste sono presenti. L’output relativo a RLS degli oggetti e all’eventuale funzione preesistente non è stato incluso nel risultato ricevuto; viene quindi riconfermato insieme a policy e grant nel Blocco 2.

**Esito Blocco 2: PASS per il deployment della RPC.** RLS è abilitata su tutte le cinque tabelle, la funzione non è presente e i grant/policy richiesti per `SECURITY INVOKER` sono disponibili. `profiles` conserva numerose policy legacy sovrapposte, incluse policy assegnate a `public`: costituiscono debito di hardening separato, ma nessuna concede update indiscriminato a un utente non admin. La RPC aggiunge inoltre i propri controlli `auth.uid()`, ruolo e doppia condizione `id/user_id`, quindi il debito non amplia il target della funzione. Non modificare le policy in B4.

### Blocco 2 — funzione, RLS, policy e grant — READ-ONLY

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in ('profiles', 'profile_preferences', 'countries', 'geo_areas', 'legacy_geo_area_mappings')
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'profile_preferences', 'countries', 'geo_areas', 'legacy_geo_area_mappings')
order by tablename, policyname;

select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in ('profiles', 'profile_preferences', 'countries', 'geo_areas', 'legacy_geo_area_mappings')
order by table_name, privilege_type;

select
  p.oid::regprocedure::text as function_signature,
  p.prosecdef as security_definer,
  p.proconfig,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  p.proacl,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'update_my_profile_residence';
```

### Blocco 3 — unicità owner, constraint e trigger — READ-ONLY

```sql
with checks as (
  select
    'PROFILE_USER_DUPLICATES'::text as check_type,
    'profiles.user_id'::text as object_name,
    jsonb_build_object(
      'duplicate_non_null_user_ids', count(*)
    ) as details
  from (
    select user_id
    from public.profiles
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) duplicates

  union all

  select
    'CONSTRAINT'::text,
    (n.nspname || '.' || c.relname || '.' || con.conname)::text,
    jsonb_build_object(
      'type', con.contype,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true)
    )
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class c on c.oid = con.conrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('profiles', 'profile_preferences')
    and (
      con.contype in ('p', 'u')
      or con.conname in (
        'profile_preferences_residence_geo_area_fk',
        'profile_preferences_residence_geo_country_required_check',
        'profile_preferences_residence_geo_country_fk'
      )
    )

  union all

  select
    'TRIGGER'::text,
    (event_object_schema || '.' || event_object_table || '.' || trigger_name)::text,
    jsonb_build_object(
      'timing', action_timing,
      'event', event_manipulation,
      'statement', action_statement
    )
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table in ('profiles', 'profile_preferences')
)
select *
from checks
order by check_type, object_name;
```

Il risultato non espone UUID o dati personali: per i duplicati restituisce soltanto un conteggio aggregato.

**Esito Blocco 3: PASS per constraint e stato corrente; trigger gate ancora aperto.** Le FK canonicali e il check country-required sono presenti; non esistono duplicati non-null di `profiles.user_id`, ma non è presente un vincolo UNIQUE su tale colonna. La RPC è stata corretta per contare i profili owner e fallire con cardinality violation invece di scegliere una riga tramite `LIMIT 1`. Production espone inoltre `trg_profile_location_coerce`, la cui funzione non è definita nella migration history nota: deve essere verificata prima del deployment perché potrebbe trasformare gli stessi campi legacy della allowlist RPC. I molteplici trigger timestamp sono debito preesistente e non vengono modificati in B4.

### Blocco 4 — definizioni dei trigger pertinenti — READ-ONLY

```sql
select
  p.oid::regprocedure::text as function_signature,
  p.prosecdef as security_definer,
  p.proconfig,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  pg_catalog.pg_get_functiondef(p.oid) as function_definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'profile_location_coerce',
    'set_profile_visibility_status',
    'notify_profile_demoted_to_draft',
    'enforce_single_platform_admin_profile',
    'sync_profile_names',
    'profiles_fill_default_role',
    'profiles_fill_role_for_fan'
  )
order by p.proname, p.oid::regprocedure::text;
```

Il blocco legge esclusivamente metadati/definizioni SQL e non accede a righe profilo.

**Esito Blocco 4: BLOCKED — side effect runtime fuori scope.** Le definizioni Production confermano che:

- `profile_location_coerce()` può riscrivere `province_id` e `region_id` in base a `municipality_id`/`province_id` esistenti;
- `sync_profile_names()` può normalizzare `full_name`/`display_name` e aggiornare `auth.users.raw_user_meta_data` e `auth.users.updated_at` per Athlete/Staff;
- `set_profile_visibility_status()` ricalcola `profile_visibility_status` e campi di moderazione;
- `notify_profile_demoted_to_draft()` può inserire una notifica quando la visibilità cambia;
- gli altri trigger role/admin sono condizionali e non pertinenti per un normale Athlete/Staff, ma vengono comunque eseguiti.

La statement RPC mantiene una allowlist esplicita, ma PostgreSQL esegue questi trigger su ogni `UPDATE profiles`: l’effetto transazionale complessivo non è quindi limitato alle sole colonne residence. Qualsiasi errore nei trigger produce rollback atomico, ma non elimina i side effect quando la transazione riesce. Non applicare la migration finché non viene approvata una strategia trigger-aware. Non usare `session_replication_role`, disabilitazione trigger o bypass equivalenti.

### Decisione architetturale richiesta

Raccomandazione: introdurre una correzione additiva e circoscritta ai trigger esistenti affinché saltino il lavoro quando nessuna delle colonne di loro competenza è cambiata (`IS NOT DISTINCT FROM`), preservando il comportamento per i normali Profile Edit. Questa soluzione richiede audit/test dedicati e amplia il deployment oltre la sola RPC; deve essere approvata esplicitamente.

Alternative:

1. accettare e certificare esplicitamente i side effect trigger durante il dual-write;
2. rinunciare temporaneamente al legacy dual-write su `profiles` e scrivere soltanto `profile_preferences` (incompatibile con la decisione B4 corrente);
3. modificare/disabilitare trigger durante la RPC — **non raccomandato** per sicurezza e concorrenza.

## Rollback minimale preparato — MUTATIVO, NON AUTORIZZATO

```sql
begin;
drop function if exists public.update_my_profile_residence(uuid, uuid);
commit;
```

Il rollback elimina esclusivamente la funzione con la firma B4. Non ripristina una funzione omonima preesistente: per questo il controllo preventivo è obbligatorio. Non eseguire questo blocco senza autorizzazione esplicita.

## Matrice post-deployment prevista

Solo account dedicati non reali, dopo autorizzazione:

- Player owner: reset, country-only, full IT, FR/ES/CH/SI/PL;
- Staff owner: reset, country-only, full IT e full foreign rappresentativo;
- CH con e senza District;
- mapping IT e legacy projection;
- owner diverso, anonimo, Club, Fan, Institution: negati;
- errore profiles/preferences con rollback;
- preferences inizialmente assenti;
- interessi, birth country, nationality e relocation invariati;
- read-after-write canonical-first;
- feature gate false prima/dopo migration e attivazione separata soltanto dopo i gate.

## Checkpoint

B4.4 e la FASE 3C-B4 sono **COMPLETATE** con canary applicativo, read-after-write, cleanup, ripristino fail-closed e closure review repository-only. Il percorso Production manuale successivamente autorizzato ha installato e verificato RPC, trigger guards e canary database mantenendo `EXECUTE` revocato; il test transazionale dedicato Player/Staff ha restituito `POST_ROLLBACK_PASS` e ha ripristinato le ACL negate. Il checkpoint Vercel fail-closed del 2026-08-28 è descritto in fondo al documento. Le approvazioni distinte per canary applicativo e read-after-write sono state concesse ed eseguite con esito PASS come registrato nel checkpoint finale. B5 non è iniziata.

## Trigger-aware correction repository audit

La decisione approvata non autorizza guardie indiscriminate. La migration additiva repository-only `20261204121000_profile_residence_trigger_guards.sql` sostituisce esclusivamente tre funzioni preservandone il comportamento ordinario; non disabilita né ricrea trigger e non modifica dati.

| Trigger/funzione | Colonne osservate | Colonne/oggetti modificati | Relazione residence | Decisione |
| --- | --- | --- | --- | --- |
| `profile_location_coerce()` | `municipality_id`, `province_id`, `region_id` | `province_id`, `region_id` | Indipendente dai nuovi `residence_*`; opera sugli ID location legacy generali | Guard su tutti e tre gli input ID; se uno cambia, coercion invariata |
| `sync_profile_names()` | `full_name`, `display_name`, `account_type`, `type`, `user_id` | nomi profilo; `auth.users.raw_user_meta_data/updated_at` | Indipendente dalla residence | Guard soltanto quando tutti gli input nome/identità sono invariati |
| `set_profile_visibility_status()` | status, account type, nome, sport, country, ruolo, nascita, moderazione; per Club anche testi geografici/interessi | visibility e moderazione | I testi residence partecipano alla completezza Club, ma B4 è esclusivamente Athlete/Staff e per questi non partecipano | Guard solo per UPDATE Athlete/Staff e solo se tutti gli input di completezza/moderazione sono invariati; nessun bypass Club |
| `notify_profile_demoted_to_draft()` | transizione `profile_visibility_status`, `user_id` | eventuale riga `notifications` | Indiretta | Nessuna modifica: la condizione reale `published → draft` è già corretta |
| `enforce_single_platform_admin_profile()` | account type/type/role/is_admin/user_id | campi admin | Indipendente; B4 rifiuta Admin | Nessuna modifica |
| `profiles_fill_default_role()` / `profiles_fill_role_for_fan()` | account type/role | role per Club/Fan | Indipendente; ruoli esclusi da B4 | Nessuna modifica |
| trigger timestamp | UPDATE | `updated_at` | Aggiornamento atteso della riga legacy | Nessuna modifica |

### Test e runtime harness esteso

- test statici positivi/negativi verificano guardie, assenza di disable/bypass e preservazione dei corpi funzionali;
- il setup PostgreSQL sintetico ora include `auth.users`, notifiche, colonne visibility/moderation e gerarchia legacy ID;
- il runtime installa le tre funzioni corrette e i trigger pertinenti prima della RPC;
- residence-only deve lasciare invariati nomi, Auth metadata, visibility, moderation, notifiche e ID location generali;
- modifiche normali a nome, completezza e location devono continuare rispettivamente a sincronizzare Auth, produrre una vera transizione/notifica e applicare coercion.

Il runtime harness esteso è stato eseguito il 2026-08-26 su PostgreSQL 16.15 locale temporaneo: **B4_RPC_RUNTIME_PASS**. Ha applicato nell’ordine RPC, trigger guards, trigger Production pertinenti e test; ha verificato RPC, side effect, rollback e normali Profile Edit. Due lacune iniziali delle fixture (colonne interest ID e grant SELECT su provinces/municipalities) sono state corrette nel solo harness. Il database `b4_rpc_runtime` è stato eliminato dal trap e la verifica finale ha restituito zero database residui. Nessuna connessione remota è stata usata.


## Separazione del grant RPC — checkpoint repository-only

La migration di installazione `20261204120000_transactional_profile_residence_rpc.sql` crea la funzione ma revoca esplicitamente `EXECUTE` anche ad `authenticated`. Questo impedisce di aggirare i feature gate applicativi invocando direttamente la Data API dopo la sola installazione.

La migration `20261204122000_enable_profile_residence_rpc.sql` contiene esclusivamente le ACL della funzione e concede `EXECUTE` ad `authenticated`. È un gate operativo distinto: non deve essere applicata finché UI, write gate e test Production dedicati non siano stati autorizzati. Il runtime locale verifica prima il rifiuto della RPC disabilitata, poi applica localmente l'attivazione e riesegue l'intera matrice funzionale. Nessuna migration o history Production è stata modificata da questa correzione repository-only. **In questo checkpoint storico** B4.4 restava `IN PROGRESS`; il canary successivo è documentato nel checkpoint finale.

## Canary server-side repository-only

Il PATCH richiede ora tre condizioni cumulative: kill switch globale attivo, `user.id` presente nella variabile server-only `CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS` e ruolo profilo `athlete`/`staff`. L'allowlist accetta soltanto UUID validi, non è esposta al client e fallisce chiusa quando assente o malformata. Anche il campo GET `writable` combina kill switch e allowlist. Nessun UUID Production è hardcoded nel repository; la configurazione dei due account dedicati resta un passo operativo separato. La migration di attivazione, i feature gate e le scritture Production non sono stati eseguiti da questa modifica.


## Canary database-level repository-only

La migration `20261204121500_profile_residence_database_canary.sql`, ordinata prima dell'attivazione `20261204122000`, crea una tabella di membership vuota per default, abilita RLS e concede ad `authenticated` soltanto `SELECT`. La policy rende visibile esclusivamente la riga con `user_id = auth.uid()`; `INSERT`, `UPDATE` e `DELETE` restano revocati. La RPC `SECURITY INVOKER` viene sostituita senza alterarne la firma e verifica la membership immediatamente dopo l'autenticazione, prima di leggere il profilo o scrivere dati.

Nessun UUID Production è incluso nella migration. Le membership sintetiche esistono soltanto nel runtime harness locale; il popolamento Production richiede un blocco operativo separato e autorizzato. La migration revoca nuovamente `EXECUTE` a `PUBLIC`, `anon` e `authenticated`, quindi non abilita la RPC. Nessuna migration è stata applicata e nessun feature gate è stato modificato da questo passaggio repository-only. **In questo checkpoint storico** B4.4 restava `IN PROGRESS`; popolamento canary, test e cleanup successivi sono documentati nel checkpoint finale.

Il rollback dedicato repository-only è `supabase/rollbacks/20261204121500_profile_residence_database_canary.sql`: revoca per prima cosa ogni `EXECUTE`, quindi elimina RPC e tabella canary. Non ripristina deliberatamente una RPC priva del controllo database, evitando un rollback che riapra l'accesso. Non modifica profili o preferenze e richiede comunque autorizzazione separata prima dell'uso.

## Vercel environment preflight guard

`docs/env.sample` e `scripts/check-vercel-env.mjs` includono ora i tre valori B4.4. Durante questo checkpoint il checker accetta esclusivamente UI e write gate esplicitamente disabilitati e una allowlist composta da esattamente due UUID validi e distinti; non stampa i valori. Configurazioni mancanti, gate attivi, UUID malformati o duplicati producono exit code non-zero. Questa è una guardia temporanea di pre-attivazione e dovrà essere modificata con una decisione esplicita prima del rollout.

## Checkpoint operativo verificato — 2026-08-28

Il percorso controllato successivo al preflight statico ha prodotto questi risultati:

- funzioni trigger-aware e relativi trigger Production: verifica `PASS`;
- RPC `public.update_my_profile_residence(uuid,uuid)`: presente, `SECURITY INVOKER`, `EXECUTE` negato a `PUBLIC`, `anon` e `authenticated`;
- tabella `profile_residence_write_canary_users`: presente, RLS attiva, policy SELECT-own valida e nessun permesso mutativo per `authenticated`;
- membership canary: esattamente due account dedicati qualificati, senza UUID hardcoded nel repository;
- test Production transazionale Player/Italia e Staff/Francia: `POST_ROLLBACK_PASS`, profili ripristinati e ACL negate dopo il rollback;
- commit B4.4 `4825ede71a0cfe49ff84c1aecc85ae12f299ad23`: push fast-forward sul branch `codex/completa-fase-3b-e2-per-spagna`;
- Vercel Preview del commit: deployment completato con stato `success`;
- variabili Vercel Preview e Production: UI `false`, write `false`, allowlist server-only Secret con due UUID;
- redeploy manuale, merge, promozione e deployment Production: non eseguiti.

Questa evidenza chiude il preflight fail-closed, non l'attivazione B4.4. La RPC resta non invocabile dagli utenti autenticati e i gate applicativi restano spenti. Prima di qualsiasi grant, attivazione UI/write o read-after-write applicativo è necessaria una nuova autorizzazione esplicita.


## Checkpoint finale canary applicativo — 2026-08-28/29

Il canary applicativo B4.4 autorizzato si è concluso con **PASS** e ritorno allo stato fail-closed:

- scope limitato ai due account dedicati già presenti sia nella allowlist Vercel sia nella database allowlist;
- Production mantenuta con UI e write gate `false`, senza deployment, promozione o merge;
- grant `EXECUTE` temporaneo soltanto ad `authenticated`; `PUBLIC` e `anon` sempre negati;
- Player owner: salvataggio e refresh `Italia / Abruzzo / Chieti / Altino`; read-after-write con canonical IDs attesi, testi legacy e ID `81 / 323 / 165`;
- Staff owner: salvataggio e refresh `Francia / Auvergne-Rhône-Alpes / Ain / Ambérieu-en-Bugey`; read-after-write con canonical IDs attesi, proiezione testuale estera e legacy ID italiani null;
- nessun errore applicativo visibile nei due percorsi;
- revoca immediata di `EXECUTE` a `PUBLIC`, `anon` e `authenticated`; verifica ACL finale tutta `false`;
- UI e write gate Preview ripristinati a `false` e Preview finale senza selector;
- cleanup transazionale: campi residence Player e Staff riportati al baseline null; `profile_preferences` Player preesistente preservata con canonical residence null; eliminata esclusivamente la riga Staff creata dal test;
- verifica post-cleanup: Player `preferences_count=1`, Staff `preferences_count=0`, profili attivi, due membership database canary invariate e `authenticated_execute=false`.

B4.4 è quindi **COMPLETATA**. RPC, gate e UI restano fail-closed; questo esito non autorizza rollout generale, merge, Production deployment o avvio comportamentale B5. Il passo repository-only successivo è la revisione di chiusura complessiva B4; solo dopo potrà essere proposto il preflight/audit B5.

## Closure review B4 — 2026-08-29

**Esito: PASS — FASE 3C-B4 COMPLETATA.** La revisione finale ha confrontato gli acceptance criteria del preflight con codice, test automatici, runtime PostgreSQL, verifiche Production autorizzate e canary applicativo. Risultano verificati:

- scope limitato a Player/Athlete e Staff, con Club, Institution e Fan invariati;
- contratti `absent`, reset, country-only e full, senza default implicito a Italia;
- validazione canonical country/area e gerarchie a profondità variabile;
- dual-write atomico, mapping Italia 1:1 e proiezione testuale estera;
- test automatici per IT, FR, ES, CH con e senza District, SI e PL;
- owner/RLS/privacy, rollback e assenza di modifiche a interests, birth country, nationality e relocation;
- test applicativo reale Player Italia e Staff Francia con read-after-write canonical-first;
- cleanup dei soli dati canary e ripristino dei baseline;
- `EXECUTE` revocato, gate Preview/Production `false` e selector nuovamente non esposto.

Non restano blocker critici per B4. La database allowlist resta una barriera fail-closed e non autorizza alcun rollout generale. La FASE 3C-B complessiva resta non completata: B5–B7 sono ancora `NOT STARTED`. Il prossimo passo ammesso è il preflight/audit read-only B5; Signup/onboarding non sono stati modificati da questa closure review.
