-- Post-apply verification for 20261208120000_profile_primary_sport.sql.
-- Safe both before and after migration-history registration.
begin transaction read only;

with
target_columns(column_name) as (values
  ('sport_id'), ('sport_discipline_id'), ('sport_variant_id')
),
column_rows as (
  select t.column_name, c.udt_name, c.is_nullable, c.column_default,
         coalesce(c.udt_name = 'uuid' and c.is_nullable = 'YES' and c.column_default is null, false) as compatible
  from target_columns t
  left join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = 'profiles' and c.column_name = t.column_name
),
expected_constraints(constraint_name, expected_definition) as (values
  ('profiles_primary_sport_fk',
   'FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT'),
  ('profiles_primary_sport_discipline_sport_fk',
   'FOREIGN KEY (sport_discipline_id, sport_id) REFERENCES sport_disciplines(id, sport_id) ON DELETE RESTRICT'),
  ('profiles_primary_sport_variant_discipline_fk',
   'FOREIGN KEY (sport_variant_id, sport_discipline_id) REFERENCES sport_variants(id, discipline_id) ON DELETE RESTRICT'),
  ('profiles_primary_sport_shape_check',
   'CHECK ((sport_discipline_id IS NULL OR sport_id IS NOT NULL) AND (sport_variant_id IS NULL OR sport_discipline_id IS NOT NULL))')
),
constraint_rows as (
  select e.constraint_name, c.convalidated,
         case when c.oid is null then null else pg_get_constraintdef(c.oid, true) end as definition,
         coalesce(c.convalidated and pg_get_constraintdef(c.oid, true) = e.expected_definition, false) as compatible
  from expected_constraints e
  left join pg_constraint c
    on c.conrelid = to_regclass('public.profiles') and c.conname = e.constraint_name
),
trigger_rows as (
  select t.tgname as trigger_name, p.proname as function_name,
         t.tgenabled, pg_get_triggerdef(t.oid, true) as definition
  from pg_trigger t join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = to_regclass('public.profiles') and not t.tgisinternal
),
history as (
  select count(*) filter (where version = '20261208120000')::integer as phase_5f_a_rows
  from supabase_migrations.schema_migrations
)
select jsonb_pretty(jsonb_build_object(
  'report', 'phase-5f-c-profile-primary-sport-post-apply-v1',
  'database', current_database(),
  'checkedAt', statement_timestamp(),
  'transactionReadOnly', current_setting('transaction_read_only'),
  'schemaReady',
    (select bool_and(compatible) from column_rows)
    and (select bool_and(compatible) from constraint_rows),
  'columns', (select jsonb_agg(to_jsonb(c) order by column_name) from column_rows c),
  'constraints', (select jsonb_agg(to_jsonb(c) order by constraint_name) from constraint_rows c),
  'profileTriggers', coalesce((select jsonb_agg(to_jsonb(t) order by trigger_name) from trigger_rows t), '[]'::jsonb),
  'profileTriggerCount', (select count(*) from trigger_rows),
  'disabledProfileTriggerCount', (select count(*) from trigger_rows where tgenabled = 'D'),
  'profileRows', (select count(*) from public.profiles),
  'canonicalNonNullRows', (select count(*) from public.profiles
    where sport_id is not null or sport_discipline_id is not null or sport_variant_id is not null),
  'migrationHistory', (select to_jsonb(h) from history h)
)) as phase_5f_c_post_apply;

rollback;
