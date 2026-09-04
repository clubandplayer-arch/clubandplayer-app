-- FASE 5C Production preflight + missing-baseline evidence collection.
-- One copyable JSON result set for Supabase SQL Editor.
-- READ ONLY: no temporary objects, DDL, DML, side-effect calls, or explicit locks.
begin transaction read only;

with
required_tables(table_name) as (
  values ('profiles'), ('countries'), ('geo_areas'), ('sports'), ('sport_disciplines'), ('sport_variants')
),
required_columns(table_name, column_name, expected_udt) as (
  values
    ('profiles','user_id','uuid'), ('profiles','is_admin','bool'),
    ('countries','id','uuid'), ('geo_areas','id','uuid'),
    ('sports','id','uuid'), ('sport_disciplines','id','uuid'),
    ('sport_disciplines','sport_id','uuid'), ('sport_variants','id','uuid'),
    ('sport_variants','discipline_id','uuid')
),
required_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
),
expected_tables(table_name) as (values
  ('player_positions'), ('staff_roles'), ('player_position_applicability'), ('staff_role_applicability'),
  ('sports_organizations'), ('sports_organization_countries'), ('gender_categories'),
  ('competition_formats'), ('territorial_scopes'), ('competition_levels'), ('age_classes'),
  ('seasons'), ('competitions'), ('competition_countries'), ('competition_geo_areas'),
  ('competition_editions'), ('competition_groups'), ('legacy_player_position_mappings'),
  ('legacy_staff_role_mappings')
),
expected_functions(function_name) as (values
  ('prevent_sports_organization_cycle'), ('prevent_season_cycle'), ('prevent_competition_group_cycle')
),
expected_triggers(trigger_name) as (values
  ('trg_sports_organizations_prevent_cycle'), ('trg_seasons_prevent_cycle'),
  ('trg_competition_groups_prevent_cycle')
),
expected_indexes(index_name) as (values
  ('sport_disciplines_id_sport_key'), ('sport_variants_id_discipline_key'),
  ('player_position_applicability_scope_idx'), ('staff_role_applicability_scope_idx'),
  ('sports_organizations_parent_idx'), ('sports_organizations_country_idx'),
  ('competition_levels_scope_idx'), ('age_classes_scope_idx'), ('seasons_scope_dates_idx'),
  ('competitions_scope_idx'), ('competitions_discipline_variant_idx'),
  ('competition_editions_competition_season_idx'), ('competition_groups_edition_idx'),
  ('legacy_player_position_target_idx'), ('legacy_staff_role_target_idx')
),
baseline_tables(table_name) as (values
  ('profiles'), ('opportunities'), ('clubs'), ('saved_views'), ('notifications'), ('follows'),
  ('posts'), ('applications'), ('regions'), ('provinces'), ('municipalities')
),
history_summary as (
  select count(*)::integer as migration_count,
         min(version) as earliest_version,
         max(version) as latest_version,
         count(*) filter (where version = '20261206120000')::integer as phase_5c_history_rows
  from supabase_migrations.schema_migrations
),
history_versions as (
  select coalesce(jsonb_agg(version order by version), '[]'::jsonb) as value
  from supabase_migrations.schema_migrations
),
dependency_rows as (
  select r.table_name,
         to_regclass(format('public.%I', r.table_name)) is not null as exists
  from required_tables r
),
dependencies_json as (
  select coalesce(jsonb_agg(to_jsonb(d) order by d.table_name), '[]'::jsonb) as value from dependency_rows d
),
required_column_rows as (
  select r.table_name, r.column_name, r.expected_udt,
         c.udt_name as actual_udt, c.is_nullable,
         c.column_name is not null as exists,
         coalesce(c.udt_name = r.expected_udt, false) as type_matches
  from required_columns r
  left join information_schema.columns c
    on c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name
),
required_columns_json as (
  select coalesce(jsonb_agg(to_jsonb(c) order by c.table_name, c.column_name), '[]'::jsonb) as value
  from required_column_rows c
),
candidate_key_rows as (
  select tc.table_name, tc.constraint_name, tc.constraint_type,
         string_agg(kcu.column_name, ',' order by kcu.ordinal_position) as columns
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name
  where tc.table_schema='public'
    and tc.table_name in ('countries','geo_areas','sports','sport_disciplines','sport_variants')
    and tc.constraint_type in ('PRIMARY KEY','UNIQUE')
  group by tc.table_name, tc.constraint_name, tc.constraint_type
),
candidate_keys_json as (
  select coalesce(jsonb_agg(to_jsonb(k) order by k.table_name, k.constraint_name), '[]'::jsonb) as value
  from candidate_key_rows k
),
required_unique_id_rows as (
  select r.table_name,
         exists (
           select 1
           from pg_index i
           join pg_class c on c.oid=i.indrelid
           join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relname=r.table_name and i.indisunique
             and i.indnatts=1
             and (select a.attname from pg_attribute a
                  where a.attrelid=c.oid and a.attnum=i.indkey[0])='id'
         ) as unique_id_ready
  from (values ('countries'),('geo_areas'),('sports'),('sport_disciplines'),('sport_variants')) r(table_name)
),
role_rows as (
  select r.role_name, p.rolname is not null as exists,
         p.rolcanlogin, p.rolbypassrls
  from required_roles r left join pg_roles p on p.rolname=r.role_name
),
roles_json as (
  select coalesce(jsonb_agg(to_jsonb(r) order by r.role_name), '[]'::jsonb) as value from role_rows r
),
table_collision_rows as (
  select e.table_name, to_regclass(format('public.%I', e.table_name)) is not null as collision
  from expected_tables e
),
table_collisions_json as (
  select coalesce(jsonb_agg(to_jsonb(c) order by c.table_name), '[]'::jsonb) as value
  from table_collision_rows c
),
function_collision_rows as (
  select e.function_name,
         exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname=e.function_name) as collision,
         coalesce((select jsonb_agg(pg_get_function_identity_arguments(p.oid) order by p.oid)
                   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                   where n.nspname='public' and p.proname=e.function_name), '[]'::jsonb) as signatures
  from expected_functions e
),
function_collisions_json as (
  select coalesce(jsonb_agg(to_jsonb(c) order by c.function_name), '[]'::jsonb) as value
  from function_collision_rows c
),
trigger_collision_rows as (
  select e.trigger_name,
         exists(select 1 from information_schema.triggers t
                where t.trigger_schema='public' and t.trigger_name=e.trigger_name) as collision,
         (select min(t.event_object_table) from information_schema.triggers t
          where t.trigger_schema='public' and t.trigger_name=e.trigger_name) as existing_table
  from expected_triggers e
),
trigger_collisions_json as (
  select coalesce(jsonb_agg(to_jsonb(c) order by c.trigger_name), '[]'::jsonb) as value
  from trigger_collision_rows c
),
index_collision_rows as (
  select e.index_name,
         exists(select 1 from pg_indexes i where i.schemaname='public' and i.indexname=e.index_name) as collision,
         (select min(i.tablename) from pg_indexes i where i.schemaname='public' and i.indexname=e.index_name) as existing_table
  from expected_indexes e
),
index_collisions_json as (
  select coalesce(jsonb_agg(to_jsonb(c) order by c.index_name), '[]'::jsonb) as value
  from index_collision_rows c
),
baseline_table_rows as (
  select b.table_name,
         to_regclass(format('public.%I', b.table_name)) is not null as exists,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
         pg_get_userbyid(c.relowner) as owner
  from baseline_tables b
  left join pg_namespace n on n.nspname='public'
  left join pg_class c on c.relnamespace=n.oid and c.relname=b.table_name and c.relkind in ('r','p')
),
baseline_tables_json as (
  select coalesce(jsonb_agg(to_jsonb(b) order by b.table_name), '[]'::jsonb) as value
  from baseline_table_rows b
),
baseline_columns_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'tableName', table_name, 'ordinalPosition', ordinal_position, 'columnName', column_name,
    'dataType', data_type, 'udtName', udt_name, 'isNullable', is_nullable, 'columnDefault', column_default
  ) order by table_name, ordinal_position), '[]'::jsonb) as value
  from information_schema.columns
  where table_schema='public' and table_name in (
    'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
    'regions','provinces','municipalities'
  )
),
baseline_constraints_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.table_name, x.constraint_type, x.constraint_name), '[]'::jsonb) as value
  from (
    select tc.table_name, tc.constraint_name, tc.constraint_type,
           string_agg(distinct kcu.column_name, ',' order by kcu.column_name) as columns,
           string_agg(distinct concat_ws('.', ccu.table_schema, ccu.table_name, ccu.column_name), ','
                      order by concat_ws('.', ccu.table_schema, ccu.table_name, ccu.column_name)) as references
    from information_schema.table_constraints tc
    left join information_schema.key_column_usage kcu
      on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name
    left join information_schema.constraint_column_usage ccu
      on ccu.constraint_schema=tc.constraint_schema and ccu.constraint_name=tc.constraint_name
    where tc.table_schema='public' and tc.table_name in (
      'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
      'regions','provinces','municipalities'
    )
    group by tc.table_name, tc.constraint_name, tc.constraint_type
  ) x
),
baseline_indexes_json as (
  select coalesce(jsonb_agg(jsonb_build_object('tableName',tablename,'indexName',indexname,'definition',indexdef)
                            order by tablename,indexname), '[]'::jsonb) as value
  from pg_indexes
  where schemaname='public' and tablename in (
    'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
    'regions','provinces','municipalities'
  )
),
baseline_policies_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'tableName',tablename,'policyName',policyname,'permissive',permissive,'roles',roles,
    'command',cmd,'using',qual,'withCheck',with_check
  ) order by tablename,policyname), '[]'::jsonb) as value
  from pg_policies
  where schemaname='public' and tablename in (
    'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
    'regions','provinces','municipalities'
  )
),
baseline_grants_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'tableName',table_name,'grantee',grantee,'privilege',privilege_type,'isGrantable',is_grantable
  ) order by table_name,grantee,privilege_type), '[]'::jsonb) as value
  from information_schema.role_table_grants
  where table_schema='public' and table_name in (
    'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
    'regions','provinces','municipalities'
  )
),
baseline_triggers_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'tableName',event_object_table,'triggerName',trigger_name,'timing',action_timing,
    'event',event_manipulation,'statement',action_statement
  ) order by event_object_table,trigger_name,event_manipulation), '[]'::jsonb) as value
  from information_schema.triggers
  where trigger_schema='public' and event_object_table in (
    'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
    'regions','provinces','municipalities'
  )
),
baseline_trigger_functions_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.schema_name,x.function_name,x.arguments), '[]'::jsonb) as value
  from (
    select distinct n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments, l.lanname as language,
           p.prosecdef as security_definer, p.proconfig as function_config
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace cn on cn.oid=c.relnamespace
    join pg_proc p on p.oid=t.tgfoid
    join pg_namespace n on n.oid=p.pronamespace
    join pg_language l on l.oid=p.prolang
    where not t.tgisinternal and cn.nspname='public' and c.relname in (
      'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
      'regions','provinces','municipalities'
    )
  ) x
),
baseline_views_json as (
  select coalesce(jsonb_agg(jsonb_build_object('viewName',table_name,'definition',view_definition)
                            order by table_name), '[]'::jsonb) as value
  from information_schema.views
  where table_schema='public'
    and view_definition ~* '(profiles|opportunities|clubs|notifications|follows|posts|applications|regions|provinces|municipalities)'
),
blocking_reasons as (
  select reason from (
    select 'phase_5c_already_recorded' as reason where (select phase_5c_history_rows from history_summary) > 0
    union all select 'missing_dependency:' || table_name from dependency_rows where not exists
    union all select 'missing_or_wrong_column:' || table_name || '.' || column_name
      from required_column_rows where not exists or not type_matches
    union all select 'missing_unique_id_key:' || table_name
      from required_unique_id_rows where not unique_id_ready
    union all select 'missing_role:' || role_name from role_rows where not exists
    union all select 'table_collision:' || table_name from table_collision_rows where collision
    union all select 'function_collision:' || function_name from function_collision_rows where collision
    union all select 'trigger_collision:' || trigger_name from trigger_collision_rows where collision
    union all select 'index_collision:' || index_name from index_collision_rows where collision
  ) reasons
),
blocking_reasons_json as (
  select coalesce(jsonb_agg(reason order by reason), '[]'::jsonb) as value,
         count(*)::integer as count
  from blocking_reasons
)
select jsonb_build_object(
  'reportVersion', 'phase-5c-pb-v2',
  'generatedAt', statement_timestamp(),
  'target', jsonb_build_object(
    'databaseName', current_database(), 'databaseUser', current_user,
    'postgresVersion', current_setting('server_version'),
    'migrationHistoryAvailable', to_regclass('supabase_migrations.schema_migrations') is not null
  ),
  'classification', jsonb_build_object(
    'status', case
      when (select phase_5c_history_rows from history_summary) > 0 then 'ALREADY_APPLIED_OR_HISTORY_COLLISION'
      when (select count from blocking_reasons_json) = 0 then 'PASS'
      else 'FAIL'
    end,
    'blockingReasonCount', (select count from blocking_reasons_json),
    'blockingReasons', (select value from blocking_reasons_json)
  ),
  'migrationHistory', jsonb_build_object(
    'migrationCount', (select migration_count from history_summary),
    'earliestVersion', (select earliest_version from history_summary),
    'latestVersion', (select latest_version from history_summary),
    'phase5cHistoryRows', (select phase_5c_history_rows from history_summary),
    'versions', (select value from history_versions)
  ),
  'phase5cPreflight', jsonb_build_object(
    'dependencies', (select value from dependencies_json),
    'requiredColumns', (select value from required_columns_json),
    'candidateKeys', (select value from candidate_keys_json),
    'requiredUniqueIds', (select coalesce(jsonb_agg(to_jsonb(k) order by k.table_name), '[]'::jsonb)
                          from required_unique_id_rows k),
    'roles', (select value from roles_json),
    'collisions', jsonb_build_object(
      'tables', (select value from table_collisions_json),
      'functions', (select value from function_collisions_json),
      'triggers', (select value from trigger_collisions_json),
      'indexes', (select value from index_collisions_json)
    )
  ),
  'baselineEvidence', jsonb_build_object(
    'tables', (select value from baseline_tables_json),
    'columns', (select value from baseline_columns_json),
    'constraints', (select value from baseline_constraints_json),
    'indexes', (select value from baseline_indexes_json),
    'policies', (select value from baseline_policies_json),
    'grants', (select value from baseline_grants_json),
    'triggers', (select value from baseline_triggers_json),
    'triggerFunctions', (select value from baseline_trigger_functions_json),
    'dependentViews', (select value from baseline_views_json)
  )
) as phase_5c_production_preflight_and_baseline_audit;

rollback;
