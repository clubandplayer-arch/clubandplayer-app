-- FASE 5F experiences: preflight for
-- 20261209120000_athlete_experience_sport_context.sql only.
-- One JSON result; no DDL, DML, explicit locks, repair, seed or backfill.
begin transaction read only;

with
required_columns(table_name, column_name, expected_udt) as (values
  ('athlete_experiences', 'profile_id', 'uuid'),
  ('athlete_experiences', 'sport', 'text'),
  ('profiles', 'id', 'uuid'),
  ('profiles', 'user_id', 'uuid'),
  ('sports', 'id', 'uuid'),
  ('sport_disciplines', 'id', 'uuid'),
  ('sport_disciplines', 'sport_id', 'uuid'),
  ('sport_variants', 'id', 'uuid'),
  ('sport_variants', 'discipline_id', 'uuid')
),
required_column_rows as (
  select r.*, c.udt_name actual_udt, c.column_name is not null as exists,
         coalesce(c.udt_name=r.expected_udt, false) type_matches
  from required_columns r left join information_schema.columns c
    on c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name
),
candidate_keys as (
  select
    exists(select 1 from pg_index i where i.indrelid=to_regclass('public.sport_disciplines')
      and i.indisunique and i.indpred is null and i.indnkeyatts=2
      and (select array_agg(a.attname order by k.ord) from unnest(i.indkey::smallint[]) with ordinality k(attnum,ord)
           join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where k.ord<=i.indnkeyatts)
          =array['id','sport_id']::name[]) discipline_id_sport,
    exists(select 1 from pg_index i where i.indrelid=to_regclass('public.sport_variants')
      and i.indisunique and i.indpred is null and i.indnkeyatts=2
      and (select array_agg(a.attname order by k.ord) from unnest(i.indkey::smallint[]) with ordinality k(attnum,ord)
           join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where k.ord<=i.indnkeyatts)
          =array['id','discipline_id']::name[]) variant_id_discipline
),
target_columns(column_name) as (values ('sport_id'),('sport_discipline_id'),('sport_variant_id')),
target_column_rows as (
  select t.column_name, c.udt_name, c.is_nullable, c.column_default,
    c.column_name is not null exists,
    coalesce(c.udt_name='uuid' and c.is_nullable='YES' and c.column_default is null,false) compatible
  from target_columns t left join information_schema.columns c
    on c.table_schema='public' and c.table_name='athlete_experiences' and c.column_name=t.column_name
),
expected_constraints(constraint_name,expected_type,expected_definition) as (values
 ('athlete_experiences_sport_fk','f','FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT'),
 ('athlete_experiences_sport_discipline_fk','f','FOREIGN KEY (sport_discipline_id, sport_id) REFERENCES sport_disciplines(id, sport_id) ON DELETE RESTRICT'),
 ('athlete_experiences_sport_variant_fk','f','FOREIGN KEY (sport_variant_id, sport_discipline_id) REFERENCES sport_variants(id, discipline_id) ON DELETE RESTRICT'),
 ('athlete_experiences_sport_shape_check','c','CHECK ((sport_discipline_id IS NULL OR sport_id IS NOT NULL) AND (sport_variant_id IS NULL OR sport_discipline_id IS NOT NULL))')
),
constraint_rows as (
 select e.*, c.contype::text actual_type, c.oid is not null exists, c.convalidated,
   case when c.oid is null then null else pg_get_constraintdef(c.oid,true) end definition,
   coalesce(c.contype::text=e.expected_type and c.convalidated and pg_get_constraintdef(c.oid,true)=e.expected_definition,false) compatible
 from expected_constraints e left join pg_constraint c
   on c.conrelid=to_regclass('public.athlete_experiences') and c.conname=e.constraint_name
),
rls as (
 select coalesce(c.relrowsecurity,false) enabled, coalesce(c.relforcerowsecurity,false) forced
 from (values(1)) seed(n) left join pg_class c on c.oid=to_regclass('public.athlete_experiences')
),
policy_rows as (
 select policyname, permissive, roles, cmd, qual, with_check
 from pg_policies where schemaname='public' and tablename='athlete_experiences'
),
rpc as (
 select p.oid is not null exists,
   coalesce(not p.prosecdef,false) security_invoker,
   coalesce(p.prorettype='integer'::regtype,false) returns_integer,
   coalesce(p.proconfig @> array['search_path=""']::text[],false) empty_search_path,
   case when p.oid is null then false else has_function_privilege('authenticated',p.oid,'EXECUTE') end authenticated_execute,
   case when p.oid is null then false else has_function_privilege('public',p.oid,'EXECUTE') end public_execute,
   case when p.oid is null then null else pg_get_function_identity_arguments(p.oid) end identity_arguments
 from (values(1)) seed(n)
 left join pg_proc p on p.oid=to_regprocedure('public.replace_my_athlete_experiences(jsonb)')
),
history as (
 select count(*) filter(where version='20261206120000')::integer phase_5c_rows,
   count(*) filter(where version='20261207120000')::integer phase_5d_c_rows,
   count(*) filter(where version='20261208120000')::integer phase_5f_a_rows,
   count(*) filter(where version='20261209120000')::integer experience_rows
 from supabase_migrations.schema_migrations
),
summary as (
 select
   (select bool_and(exists and type_matches) from required_column_rows) prerequisites_ready,
   (select discipline_id_sport and variant_id_discipline from candidate_keys) candidate_keys_ready,
   (select count(*) filter(where exists) from target_column_rows)::integer target_column_count,
   (select bool_and(not exists or compatible) from target_column_rows) target_columns_compatible,
   (select count(*) filter(where exists) from constraint_rows)::integer target_constraint_count,
   (select bool_and(not exists or compatible) from constraint_rows) target_constraints_compatible,
   (select exists from rpc) rpc_exists,
   (select not exists or (security_invoker and returns_integer and empty_search_path and authenticated_execute and not public_execute) from rpc) rpc_compatible,
   (select enabled and forced from rls) rls_ready,
   (select count(*) from policy_rows)::integer policy_count,
   h.* from history h
),
classification as (
 select case
   when not prerequisites_ready then 'BLOCKED_PREREQUISITE_SCHEMA'
   when not candidate_keys_ready then 'BLOCKED_5C_CANDIDATE_KEYS'
   when phase_5c_rows<>1 then 'BLOCKED_5C_HISTORY'
   when phase_5f_a_rows<>1 then 'BLOCKED_5F_A_HISTORY'
   when phase_5d_c_rows>1 or experience_rows>1 then 'BLOCKED_DUPLICATE_HISTORY'
   when not rls_ready or policy_count=0 then 'BLOCKED_RLS_OR_POLICY'
   when not target_columns_compatible or not target_constraints_compatible or not rpc_compatible then 'BLOCKED_INCOMPATIBLE_COLLISION'
   when target_column_count=0 and target_constraint_count=0 and not rpc_exists and experience_rows=0 and phase_5d_c_rows=0
     then 'PASS_READY_EXCLUSIVE_APPLY_WITH_5D_C_PENDING'
   when target_column_count=0 and target_constraint_count=0 and not rpc_exists and experience_rows=0 and phase_5d_c_rows=1
     then 'PASS_READY_TO_APPLY'
   when target_column_count=3 and target_constraint_count=4 and rpc_exists and experience_rows=1
     then 'PASS_ALREADY_APPLIED'
   else 'BLOCKED_PARTIAL_OR_HISTORY_DRIFT' end status
 from summary
)
select jsonb_pretty(jsonb_build_object(
 'report','phase-5f-athlete-experience-sport-preflight-v1',
 'database',current_database(), 'checkedAt',statement_timestamp(),
 'transactionReadOnly',current_setting('transaction_read_only'),
 'migration','20261209120000_athlete_experience_sport_context.sql',
 'classification',(select status from classification),
 'requiredColumns',(select jsonb_agg(to_jsonb(r) order by table_name,column_name) from required_column_rows r),
 'candidateKeys',(select to_jsonb(k) from candidate_keys k),
 'targetColumns',(select jsonb_agg(to_jsonb(t) order by column_name) from target_column_rows t),
 'targetConstraints',(select jsonb_agg(to_jsonb(c) order by constraint_name) from constraint_rows c),
 'rls',(select to_jsonb(r) from rls r),
 'policies',coalesce((select jsonb_agg(to_jsonb(p) order by policyname) from policy_rows p),'[]'::jsonb),
 'rpc',(select to_jsonb(r) from rpc r),
 'migrationHistory',(select to_jsonb(h) from history h),
 'phase5dCDataRequired',false,
 'automaticApplySafeWhen5dCPending',false,
 'explicitLocksTaken',false
)) phase_5f_experience_preflight;

rollback;
