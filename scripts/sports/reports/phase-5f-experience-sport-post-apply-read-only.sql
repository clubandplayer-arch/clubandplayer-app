-- Post-apply check for 20261209120000_athlete_experience_sport_context.sql.
-- Safe before and after history registration. One JSON result, READ ONLY.
begin transaction read only;

with
target_columns(column_name) as (values ('sport_id'),('sport_discipline_id'),('sport_variant_id')),
column_rows as (
 select t.column_name,c.udt_name,c.is_nullable,c.column_default,
  coalesce(c.udt_name='uuid' and c.is_nullable='YES' and c.column_default is null,false) compatible
 from target_columns t left join information_schema.columns c
  on c.table_schema='public' and c.table_name='athlete_experiences' and c.column_name=t.column_name
),
expected_constraints(constraint_name,expected_definition) as (values
 ('athlete_experiences_sport_fk','FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT'),
 ('athlete_experiences_sport_discipline_fk','FOREIGN KEY (sport_discipline_id, sport_id) REFERENCES sport_disciplines(id, sport_id) ON DELETE RESTRICT'),
 ('athlete_experiences_sport_variant_fk','FOREIGN KEY (sport_variant_id, sport_discipline_id) REFERENCES sport_variants(id, discipline_id) ON DELETE RESTRICT'),
 ('athlete_experiences_sport_shape_check','CHECK ((sport_discipline_id IS NULL OR sport_id IS NOT NULL) AND (sport_variant_id IS NULL OR sport_discipline_id IS NOT NULL))')
),
constraint_rows as (
 select e.constraint_name,c.convalidated,
  case when c.oid is null then null else pg_get_constraintdef(c.oid,true) end definition,
  coalesce(c.convalidated and pg_get_constraintdef(c.oid,true)=e.expected_definition,false) compatible
 from expected_constraints e left join pg_constraint c
  on c.conrelid=to_regclass('public.athlete_experiences') and c.conname=e.constraint_name
),
policy_rows as (
 select policyname,permissive,roles,cmd,qual,with_check
 from pg_policies where schemaname='public' and tablename='athlete_experiences'
),
policy_summary as (
 select
  exists(select 1 from policy_rows where policyname='athlete_experiences_select_public' and cmd='SELECT') public_read_present,
  exists(select 1 from policy_rows where policyname='athlete_experiences_manage_own' and cmd='ALL'
    and 'authenticated'=any(roles) and qual like '%auth.uid()%' and with_check like '%auth.uid()%') owner_write_present
),
rls as (
 select coalesce(c.relrowsecurity,false) enabled,coalesce(c.relforcerowsecurity,false) forced
 from (values(1)) seed(n) left join pg_class c on c.oid=to_regclass('public.athlete_experiences')
),
rpc as (
 select p.oid is not null exists,coalesce(not p.prosecdef,false) security_invoker,
  coalesce(p.prorettype='integer'::regtype,false) returns_integer,
  coalesce(p.proconfig @> array['search_path=""']::text[],false) empty_search_path,
  case when p.oid is null then false else has_function_privilege('authenticated',p.oid,'EXECUTE') end authenticated_execute,
  case when p.oid is null then false else has_function_privilege('public',p.oid,'EXECUTE') end public_execute,
  case when p.oid is null then null else pg_get_function_identity_arguments(p.oid) end identity_arguments
 from (values(1)) seed(n) left join pg_proc p
  on p.oid=to_regprocedure('public.replace_my_athlete_experiences(jsonb)')
),
trigger_rows as (
 select t.tgname trigger_name,t.tgenabled,p.proname function_name,pg_get_triggerdef(t.oid,true) definition
 from pg_trigger t join pg_proc p on p.oid=t.tgfoid
 where t.tgrelid=to_regclass('public.athlete_experiences') and not t.tgisinternal
),
history as (
 select count(*) filter(where version='20261209120000')::integer experience_rows
 from supabase_migrations.schema_migrations
),
summary as (
 select
  (select bool_and(compatible) from column_rows)
  and (select bool_and(compatible) from constraint_rows)
  and (select enabled and forced from rls)
  and (select public_read_present and owner_write_present from policy_summary)
  and (select exists and security_invoker and returns_integer and empty_search_path
       and authenticated_execute and not public_execute from rpc) schema_ready
)
select jsonb_pretty(jsonb_build_object(
 'report','phase-5f-athlete-experience-sport-post-apply-v1',
 'database',current_database(),'checkedAt',statement_timestamp(),
 'transactionReadOnly',current_setting('transaction_read_only'),
 'schemaReady',(select schema_ready from summary),
 'columns',(select jsonb_agg(to_jsonb(c) order by column_name) from column_rows c),
 'constraints',(select jsonb_agg(to_jsonb(c) order by constraint_name) from constraint_rows c),
 'rls',(select to_jsonb(r) from rls r),
 'policyCompatibility',(select to_jsonb(p) from policy_summary p),
 'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from policy_rows p),
 'rpc',(select to_jsonb(r) from rpc r),
 'experienceTriggers',coalesce((select jsonb_agg(to_jsonb(t) order by trigger_name) from trigger_rows t),'[]'::jsonb),
 'canonicalNonNullRows',(select count(*) from public.athlete_experiences where sport_id is not null or sport_discipline_id is not null or sport_variant_id is not null),
 'migrationHistory',(select to_jsonb(h) from history h),
 'explicitLocksTaken',false
)) phase_5f_experience_post_apply;

rollback;
