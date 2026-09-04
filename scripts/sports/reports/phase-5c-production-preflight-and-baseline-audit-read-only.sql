-- FASE 5C Production preflight + missing-baseline evidence collection.
-- READ ONLY: no temporary objects, DDL, DML, function calls with side effects, or locks beyond catalog reads.
begin transaction read only;

-- A. Target identity and migration-history availability.
select current_database() as database_name,
       current_user as database_user,
       current_setting('server_version') as postgres_version,
       to_regclass('supabase_migrations.schema_migrations') is not null as migration_history_available;

select count(*) as migration_count,
       min(version) as earliest_version,
       max(version) as latest_version,
       count(*) filter (where version = '20261206120000') as phase_5c_history_rows
from supabase_migrations.schema_migrations;

select version
from supabase_migrations.schema_migrations
order by version;

-- B. Exact prerequisites used by the 5C migration.
with required(table_name) as (
  values ('profiles'), ('countries'), ('geo_areas'), ('sports'), ('sport_disciplines'), ('sport_variants')
)
select r.table_name,
       to_regclass(format('public.%I', r.table_name)) is not null as exists
from required r
order by r.table_name;

with required(table_name, column_name, expected_udt) as (
  values
    ('profiles','user_id','uuid'), ('profiles','is_admin','bool'),
    ('countries','id','uuid'), ('geo_areas','id','uuid'),
    ('sports','id','uuid'), ('sport_disciplines','id','uuid'),
    ('sport_disciplines','sport_id','uuid'), ('sport_variants','id','uuid'),
    ('sport_variants','discipline_id','uuid')
)
select r.table_name, r.column_name, r.expected_udt,
       c.udt_name as actual_udt,
       c.is_nullable,
       c.column_name is not null as exists,
       c.udt_name = r.expected_udt as type_matches
from required r
left join information_schema.columns c
  on c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name
order by r.table_name, r.column_name;

-- Candidate-key prerequisites: PK(id) is sufficient before the additive composite unique indexes.
select tc.table_name, tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ',' order by kcu.ordinal_position) as columns
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name
where tc.table_schema='public'
  and tc.table_name in ('countries','geo_areas','sports','sport_disciplines','sport_variants')
  and tc.constraint_type in ('PRIMARY KEY','UNIQUE')
group by tc.table_name, tc.constraint_name, tc.constraint_type
order by tc.table_name, tc.constraint_name;

-- C. Roles and all names introduced by 5C: any existing row is a collision requiring comparison.
select rolname, rolcanlogin, rolbypassrls
from pg_roles
where rolname in ('anon','authenticated','service_role')
order by rolname;

with expected(table_name) as (values
 ('player_positions'), ('staff_roles'), ('player_position_applicability'), ('staff_role_applicability'),
 ('sports_organizations'), ('sports_organization_countries'), ('gender_categories'),
 ('competition_formats'), ('territorial_scopes'), ('competition_levels'), ('age_classes'),
 ('seasons'), ('competitions'), ('competition_countries'), ('competition_geo_areas'),
 ('competition_editions'), ('competition_groups'), ('legacy_player_position_mappings'),
 ('legacy_staff_role_mappings')
)
select e.table_name,
       to_regclass(format('public.%I', e.table_name)) is not null as collision
from expected e
order by e.table_name;

select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'prevent_sports_organization_cycle','prevent_season_cycle','prevent_competition_group_cycle'
)
order by p.proname;

select event_object_table, trigger_name
from information_schema.triggers
where trigger_schema='public' and trigger_name in (
 'trg_sports_organizations_prevent_cycle','trg_seasons_prevent_cycle','trg_competition_groups_prevent_cycle'
)
order by trigger_name;

select schemaname, indexname, tablename
from pg_indexes
where schemaname='public' and indexname in (
 'sport_disciplines_id_sport_key','sport_variants_id_discipline_key',
 'player_position_applicability_scope_idx','staff_role_applicability_scope_idx',
 'sports_organizations_parent_idx','sports_organizations_country_idx',
 'competition_levels_scope_idx','age_classes_scope_idx','seasons_scope_dates_idx',
 'competitions_scope_idx','competitions_discipline_variant_idx',
 'competition_editions_competition_season_idx','competition_groups_edition_idx',
 'legacy_player_position_target_idx','legacy_staff_role_target_idx'
)
order by indexname;

-- D. Baseline evidence for entities missing/out-of-order in repository history.
with baseline_tables(table_name) as (values
 ('profiles'), ('opportunities'), ('clubs'), ('saved_views'), ('notifications'), ('follows'),
 ('posts'), ('applications'), ('regions'), ('provinces'), ('municipalities')
)
select b.table_name,
       to_regclass(format('public.%I', b.table_name)) is not null as exists,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       pg_get_userbyid(c.relowner) as owner
from baseline_tables b
left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=b.table_name and c.relkind in ('r','p')
order by b.table_name;

select table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name in (
 'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
 'regions','provinces','municipalities'
)
order by table_name, ordinal_position;

select tc.table_name, tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ',' order by kcu.ordinal_position) as columns,
       ccu.table_schema as referenced_schema, ccu.table_name as referenced_table,
       ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema=tc.constraint_schema and ccu.constraint_name=tc.constraint_name
where tc.table_schema='public' and tc.table_name in (
 'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
 'regions','provinces','municipalities'
)
group by tc.table_name, tc.constraint_name, tc.constraint_type,
         ccu.table_schema, ccu.table_name, ccu.column_name
order by tc.table_name, tc.constraint_type, tc.constraint_name;

select tablename, indexname, indexdef
from pg_indexes
where schemaname='public' and tablename in (
 'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
 'regions','provinces','municipalities'
)
order by tablename, indexname;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename in (
 'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
 'regions','provinces','municipalities'
)
order by tablename, policyname;

select table_name, grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema='public' and table_name in (
 'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
 'regions','provinces','municipalities'
)
order by table_name, grantee, privilege_type;

select event_object_table, trigger_name, action_timing, event_manipulation,
       action_statement
from information_schema.triggers
where trigger_schema='public' and event_object_table in (
 'profiles','opportunities','clubs','saved_views','notifications','follows','posts','applications',
 'regions','provinces','municipalities'
)
order by event_object_table, trigger_name, event_manipulation;

-- Function signatures referenced by triggers, without executing or dumping bodies.
select distinct n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       l.lanname as language, p.prosecdef as security_definer,
       p.proconfig as function_config
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
order by schema_name, function_name, arguments;

select table_name, view_definition
from information_schema.views
where table_schema='public'
  and view_definition ~* '(profiles|opportunities|clubs|notifications|follows|posts|applications|regions|provinces|municipalities)'
order by table_name;

rollback;
