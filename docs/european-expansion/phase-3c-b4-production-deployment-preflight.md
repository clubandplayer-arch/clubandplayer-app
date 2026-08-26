# FASE 3C-B4.4 Step 2 — Production deployment preflight

## Esito

**STATIC PREFLIGHT: BLOCKED — BLOCCHI 1–3 VERIFICATI; BLOCCO 4 HA RILEVATO SIDE EFFECT TRIGGER; DEPLOYMENT NON AUTORIZZATO.**

La migration `20261204120000_transactional_profile_residence_rpc.sql` ha superato revisione statica e runtime PostgreSQL locale già certificato. Non contiene `INSERT`, `UPDATE` o `DELETE` applicati al momento della migration: crea o sostituisce una funzione, ne imposta il commento e ne restringe/concede `EXECUTE`. Nessun profilo o `profile_preferences` viene modificato finché un utente autenticato non invoca esplicitamente la RPC dopo l’abilitazione server-side.

Il Blocco 1 Production ha confermato tutte le tabelle e colonne richieste. Ha inoltre rilevato che `profiles.residence_region_id`, `residence_province_id` e `residence_municipality_id` sono `integer/int4`; la RPC è stata quindi corretta nel repository per accettare soltanto mapping nel range `1..2147483647`, evitando conversioni implicite da `bigint`. Il passaggio a Production resta condizionato ai successivi controlli read-only.

## Effetti DDL della migration

All’interno di una singola transazione la migration esegue esclusivamente:

1. `create or replace function public.update_my_profile_residence(uuid, uuid)`;
2. `comment on function ...`;
3. `revoke ... from public`;
4. `revoke ... from anon`;
5. `grant execute ... to authenticated`.

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
- privilegi `EXECUTE` revocati a `PUBLIC`/`anon` e concessi ad `authenticated` soltanto.

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

B4.4 resta **IN PROGRESS** e B4 resta **NOT COMPLETED**. Il ticket Supabase non è più un blocker operativo, ma la certificazione Production, l’applicazione migration e i test mutativi richiedono approvazioni distinte. B5 non è iniziata. Nessuna query remota, migration o write è stata eseguita in questo preflight.

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

Il runtime harness è stato esteso ma non rieseguito nel container corrente perché manca `pg_ctlcluster`. Questo è un limite ambientale, non un PASS: la nuova migration trigger-aware resta **NON APPLICABILE** finché il runtime PostgreSQL 16 esteso non passa. Nessuna decisione di prodotto residua è stata assunta; qualsiasi modifica ulteriore ai trigger richiede un nuovo audit.
