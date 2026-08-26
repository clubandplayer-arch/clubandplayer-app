# FASE 3C-B4.4 Step 2 — Production deployment preflight

## Esito

**STATIC PREFLIGHT: CONDITIONAL PASS — BLOCCHI 1–2 SUPERATI; DEPLOYMENT NON AUTORIZZATO.**

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
- unicità reale di `profiles.user_id` o assenza di duplicati;
- **SUPERATO:** grant e RLS effettivi; policy owner necessarie presenti;
- **SUPERATO:** funzione omonima non presente;
- trigger effettivi e loro definizioni;
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
