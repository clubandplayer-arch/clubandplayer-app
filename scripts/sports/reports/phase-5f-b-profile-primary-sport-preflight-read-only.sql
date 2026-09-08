-- FASE 5F-B: preflight for 20261208120000_profile_primary_sport.sql only.
-- One copyable JSON result. READ ONLY: no temporary objects, DDL, DML,
-- advisory/table locks, migration repair, or calls with side effects.
begin transaction read only;

with
required_columns(table_name, column_name, expected_udt) as (values
  ('profiles', 'sport', 'text'),
  ('sports', 'id', 'uuid'),
  ('sport_disciplines', 'id', 'uuid'),
  ('sport_disciplines', 'sport_id', 'uuid'),
  ('sport_variants', 'id', 'uuid'),
  ('sport_variants', 'discipline_id', 'uuid')
),
required_column_rows as (
  select r.*, c.udt_name as actual_udt,
         c.column_name is not null as exists,
         coalesce(c.udt_name = r.expected_udt, false) as type_matches
  from required_columns r
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = r.table_name
   and c.column_name = r.column_name
),
target_columns(column_name) as (values
  ('sport_id'), ('sport_discipline_id'), ('sport_variant_id')
),
target_column_rows as (
  select t.column_name, c.udt_name, c.is_nullable, c.column_default,
         c.column_name is not null as exists,
         coalesce(c.udt_name = 'uuid' and c.is_nullable = 'YES' and c.column_default is null, false) as compatible
  from target_columns t
  left join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = 'profiles' and c.column_name = t.column_name
),
candidate_keys as (
  select
    exists (
      select 1 from pg_index i
      where i.indrelid = to_regclass('public.sport_disciplines')
        and i.indisunique and i.indpred is null and i.indnkeyatts = 2
        and (select array_agg(a.attname order by k.ord)
             from unnest(i.indkey::smallint[]) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
             where k.ord <= i.indnkeyatts) = array['id','sport_id']::name[]
    ) as discipline_id_sport,
    exists (
      select 1 from pg_index i
      where i.indrelid = to_regclass('public.sport_variants')
        and i.indisunique and i.indpred is null and i.indnkeyatts = 2
        and (select array_agg(a.attname order by k.ord)
             from unnest(i.indkey::smallint[]) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
             where k.ord <= i.indnkeyatts) = array['id','discipline_id']::name[]
    ) as variant_id_discipline
),
expected_constraints(constraint_name, expected_type, expected_definition) as (values
  ('profiles_primary_sport_fk', 'f'::text,
   'FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT'),
  ('profiles_primary_sport_discipline_sport_fk', 'f'::text,
   'FOREIGN KEY (sport_discipline_id, sport_id) REFERENCES sport_disciplines(id, sport_id) ON DELETE RESTRICT'),
  ('profiles_primary_sport_variant_discipline_fk', 'f'::text,
   'FOREIGN KEY (sport_variant_id, sport_discipline_id) REFERENCES sport_variants(id, discipline_id) ON DELETE RESTRICT'),
  ('profiles_primary_sport_shape_check', 'c'::text,
   'CHECK ((sport_discipline_id IS NULL OR sport_id IS NOT NULL) AND (sport_variant_id IS NULL OR sport_discipline_id IS NOT NULL))')
),
constraint_rows as (
  select e.constraint_name, e.expected_type, e.expected_definition, c.contype::text as actual_type,
         c.oid is not null as exists, c.convalidated,
         case when c.oid is null then null else pg_get_constraintdef(c.oid, true) end as definition,
         coalesce(pg_get_constraintdef(c.oid, true) = e.expected_definition, false) as definition_matches,
         coalesce(c.contype::text = e.expected_type and c.convalidated
                  and pg_get_constraintdef(c.oid, true) = e.expected_definition, false) as compatible
  from expected_constraints e
  left join pg_constraint c
    on c.conrelid = to_regclass('public.profiles') and c.conname = e.constraint_name
),
trigger_rows as (
  select t.tgname as trigger_name,
         case t.tgenabled when 'O' then 'enabled' when 'A' then 'always'
              when 'R' then 'replica' else 'disabled' end as state,
         p.proname as function_name
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = to_regclass('public.profiles') and not t.tgisinternal
),
history as (
  select
    count(*) filter (where version = '20261206120000')::integer as phase_5c_rows,
    count(*) filter (where version = '20261207120000')::integer as phase_5d_c_rows,
    count(*) filter (where version = '20261208120000')::integer as phase_5f_a_rows,
    count(*)::integer as total_rows
  from supabase_migrations.schema_migrations
),
summary as (
  select
    (select bool_and(exists and type_matches) from required_column_rows) as prerequisites_ready,
    (select discipline_id_sport and variant_id_discipline from candidate_keys) as candidate_keys_ready,
    (select count(*) filter (where exists) from target_column_rows)::integer as target_column_count,
    (select bool_and(not exists or compatible) from target_column_rows) as target_columns_compatible,
    (select count(*) filter (where exists) from constraint_rows)::integer as target_constraint_count,
    (select bool_and(not exists or compatible) from constraint_rows) as target_constraints_compatible,
    h.*
  from history h
),
classification as (
  select case
    when not prerequisites_ready then 'BLOCKED_PREREQUISITE_SCHEMA'
    when not candidate_keys_ready then 'BLOCKED_5C_CANDIDATE_KEYS'
    when phase_5c_rows <> 1 then 'BLOCKED_5C_HISTORY'
    when phase_5f_a_rows > 1 then 'BLOCKED_DUPLICATE_5F_A_HISTORY'
    when not target_columns_compatible or not target_constraints_compatible
      then 'BLOCKED_INCOMPATIBLE_COLLISION'
    when target_column_count = 0 and target_constraint_count = 0 and phase_5f_a_rows = 0
      then 'PASS_READY_TO_APPLY_5F_A'
    when target_column_count = 3 and target_constraint_count = 4 and phase_5f_a_rows = 1
      then 'PASS_5F_A_ALREADY_APPLIED'
    else 'BLOCKED_PARTIAL_OR_HISTORY_DRIFT'
  end as status
  from summary
)
select jsonb_pretty(jsonb_build_object(
  'report', 'phase-5f-b-profile-primary-sport-preflight-v1',
  'database', current_database(),
  'checkedAt', statement_timestamp(),
  'transactionReadOnly', current_setting('transaction_read_only'),
  'classification', (select status from classification),
  'migration', '20261208120000_profile_primary_sport.sql',
  'requiredColumns', (select jsonb_agg(to_jsonb(r) order by table_name, column_name) from required_column_rows r),
  'candidateKeys', (select to_jsonb(k) from candidate_keys k),
  'targetColumns', (select jsonb_agg(to_jsonb(t) order by column_name) from target_column_rows t),
  'targetConstraints', (select jsonb_agg(to_jsonb(c) order by constraint_name) from constraint_rows c),
  'profileTriggers', coalesce((select jsonb_agg(to_jsonb(t) order by trigger_name) from trigger_rows t), '[]'::jsonb),
  'migrationHistory', (select to_jsonb(h) from history h),
  'phase5dCRequiredFor5fA', false,
  'explicitLocksTaken', false
)) as phase_5f_b_preflight;

rollback;
