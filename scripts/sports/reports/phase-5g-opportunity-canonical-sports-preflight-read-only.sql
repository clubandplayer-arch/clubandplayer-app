\set ON_ERROR_STOP on
begin transaction read only;

with
history as (
  select
    count(*) filter (where version='20261206120000') as phase5c,
    count(*) filter (where version='20261207120000') as phase5dc,
    count(*) filter (where version='20261210120000') as phase5g
  from supabase_migrations.schema_migrations
),
required_tables(name) as (values
  ('opportunities'),('sports'),('sport_disciplines'),('sport_variants'),
  ('player_positions'),('staff_roles'),('gender_categories')
),
tables_state as (
  select count(*) filter (where to_regclass('public.'||name) is not null) as present
  from required_tables
),
required_keys(name) as (values
  ('sports_pkey'),('sport_disciplines_id_sport_key'),('sport_variants_id_discipline_key'),
  ('player_positions_pkey'),('staff_roles_pkey'),('gender_categories_pkey')
),
keys_state as (
  select count(*) filter (where exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=required_keys.name and c.relkind in ('i','I')
  )) as present from required_keys
),
required_columns(name,type_name) as (values
  ('sport_id','uuid'),('sport_discipline_id','uuid'),('sport_variant_id','uuid'),
  ('player_position_id','uuid'),('staff_role_id','uuid'),('gender_code','text')
),
columns_state as (
  select
    count(c.column_name) as present,
    count(*) filter (where c.column_name is not null and
      (c.udt_name <> r.type_name or c.is_nullable <> 'YES' or c.column_default is not null)) as collisions
  from required_columns r left join information_schema.columns c
    on c.table_schema='public' and c.table_name='opportunities' and c.column_name=r.name
),
required_constraints(name,kind,target,fragment) as (values
  ('opportunities_canonical_sport_fk','f','sports',null),
  ('opportunities_canonical_discipline_sport_fk','f','sport_disciplines',null),
  ('opportunities_canonical_variant_discipline_fk','f','sport_variants',null),
  ('opportunities_player_position_fk','f','player_positions',null),
  ('opportunities_staff_role_fk','f','staff_roles',null),
  ('opportunities_gender_code_fk','f','gender_categories',null),
  ('opportunities_canonical_sport_shape_check','c',null,'sport_variant_id'),
  ('opportunities_canonical_role_shape_check','c',null,'player_position_id')
),
constraints_state as (
  select count(c.oid) as present,
    count(*) filter (where c.oid is not null and (
      not c.convalidated
      or c.contype <> r.kind::"char"
      or (r.kind='f' and (c.confdeltype <> 'r' or c.confrelid <> ('public.'||r.target)::regclass))
      or (r.kind='c' and position(r.fragment in pg_get_constraintdef(c.oid))=0)
    )) as collisions
  from required_constraints r left join pg_constraint c
    on c.conname=r.name and c.conrelid='public.opportunities'::regclass
),
required_indexes(name) as (values
  ('opportunities_canonical_sport_idx'),
  ('opportunities_player_position_idx'),
  ('opportunities_staff_role_idx')
),
indexes_state as (
  select count(c.oid) as present
  from required_indexes r left join pg_class c
    on c.relname=r.name and c.relnamespace='public'::regnamespace and c.relkind in ('i','I')
),
data_state as (
  select count(*) filter (where
    to_jsonb(o)->>'sport_id' is not null
    or to_jsonb(o)->>'sport_discipline_id' is not null
    or to_jsonb(o)->>'sport_variant_id' is not null
    or to_jsonb(o)->>'player_position_id' is not null
    or to_jsonb(o)->>'staff_role_id' is not null
    or to_jsonb(o)->>'gender_code' is not null
  ) as canonical_rows from public.opportunities o
),
state as (
  select h.*, t.present as tables_present, k.present as keys_present,
    col.present as columns_present, col.collisions as column_collisions,
    con.present as constraints_present, con.collisions as constraint_collisions,
    idx.present as indexes_present, d.canonical_rows
  from history h cross join tables_state t cross join keys_state k
    cross join columns_state col cross join constraints_state con
    cross join indexes_state idx cross join data_state d
)
select jsonb_build_object(
  'classification', case
    when current_setting('transaction_read_only') <> 'on' then 'BLOCKED_NOT_READ_ONLY'
    when phase5c <> 1 or phase5dc <> 1 then 'BLOCKED_HISTORY_PREREQUISITES'
    when tables_present <> 7 or keys_present <> 6 then 'BLOCKED_SCHEMA_PREREQUISITES'
    when column_collisions <> 0 or constraint_collisions <> 0 then 'BLOCKED_SCHEMA_COLLISION'
    when phase5g=0 and columns_present=0 and constraints_present=0 and indexes_present=0 then 'PASS_READY_FOR_EXCLUSIVE_APPLY'
    when phase5g=0 and columns_present=6 and constraints_present=8 and indexes_present=3 and canonical_rows=0 then 'PASS_SCHEMA_READY_FOR_HISTORY'
    when phase5g=1 and columns_present=6 and constraints_present=8 and indexes_present=3 then 'PASS_ALREADY_APPLIED'
    else 'BLOCKED_PARTIAL_OR_HISTORY_DRIFT'
  end,
  'transactionReadOnly', current_setting('transaction_read_only'),
  'writesPerformed', false,
  'history', jsonb_build_object('phase5c',phase5c,'phase5dC',phase5dc,'phase5g',phase5g),
  'schema', jsonb_build_object(
    'requiredTablesPresent',tables_present,'requiredKeysPresent',keys_present,
    'columnsPresent',columns_present,'columnCollisions',column_collisions,
    'constraintsPresent',constraints_present,'constraintCollisions',constraint_collisions,
    'indexesPresent',indexes_present,'canonicalRows',canonical_rows
  )
) from state;

rollback;
