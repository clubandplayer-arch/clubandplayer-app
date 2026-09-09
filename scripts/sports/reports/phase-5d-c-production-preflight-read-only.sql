-- Phase 5D-C Production preflight. One JSON row; no DDL/DML/locks/functions.
-- Required psql variable: manifest_json (compact phase-5d-c manifest JSON).
begin transaction read only;

with
manifest as (
  select :'manifest_json'::jsonb as body
),
records as (
  select value as record
  from manifest, jsonb_array_elements(body -> 'records')
),
history as (
  select
    count(*) filter (where version = '20261206120000')::integer as phase_5c,
    count(*) filter (where version = '20261207120000')::integer as phase_5d_c,
    count(*) filter (where version = '20261208120000')::integer as phase_5f_profile,
    count(*) filter (where version = '20261209120000')::integer as phase_5f_experiences
  from supabase_migrations.schema_migrations
),
required_tables(name) as (values
  ('gender_categories'), ('competition_formats'), ('territorial_scopes'),
  ('player_positions'), ('staff_roles'), ('player_position_applicability'),
  ('legacy_player_position_mappings'), ('legacy_staff_role_mappings')
),
table_state as (
  select count(*) filter (where to_regclass('public.' || name) is not null)::integer as present
  from required_tables
),
required_keys(name) as (values
  ('gender_categories_pkey'), ('competition_formats_pkey'), ('territorial_scopes_pkey'),
  ('player_positions_code_key'), ('staff_roles_code_key'),
  ('player_position_applicability_scope_key'), ('legacy_player_position_scope_key'),
  ('legacy_staff_role_mappings_normalized_source_value_key')
),
key_state as (
  select count(*) filter (where to_regclass('public.' || name) is not null)::integer as present
  from required_keys
),
manifest_state as (
  select
    jsonb_array_length((select body -> 'records' from manifest))::integer as total,
    ((select body ->> 'payloadChecksum' from manifest) = 'sha256:cff8258b19c1ec73ee075227c402535e2648328cf699baf22e492ec8a4c6d5a0') as checksum_ok,
    ((select body -> 'expectedCounts' from manifest) = '{"competition_format":4,"gender_category":3,"legacy_player_position_mapping":97,"legacy_staff_role_mapping":26,"player_position":97,"player_position_applicability":97,"staff_role":26,"territorial_scope":6}'::jsonb) as counts_ok
),
required_refs as (
  select distinct
    split_part(record -> 'references' ->> 'sport', ':', 2) as sport_code,
    nullif(split_part(record -> 'references' ->> 'discipline', ':', 2), '') as discipline_code,
    nullif(split_part(record -> 'references' ->> 'variant', ':', 2), '') as variant_code
  from records
  where record ->> 'kind' in ('player_position_applicability', 'legacy_player_position_mapping')
),
reference_state as (
  select count(*) filter (
    where s.id is null
       or (r.discipline_code is not null and d.id is null)
       or (r.variant_code is not null and v.id is null)
  )::integer as missing
  from required_refs r
  left join public.sports s on s.code = r.sport_code
  left join public.sport_disciplines d on d.sport_id = s.id and d.code = r.discipline_code
  left join public.sport_variants v on v.discipline_id = d.id and v.code = r.variant_code
),
catalog_evaluation as (
  select r.record,
    case r.record ->> 'kind'
      when 'gender_category' then case
        when g.code is null then 'missing'
        when g.canonical_name = r.record ->> 'canonicalName'
         and g.display_order = (r.record -> 'attributes' ->> 'displayOrder')::integer
         and g.is_active then 'exact' else 'collision' end
      when 'competition_format' then case
        when f.code is null then 'missing'
        when f.canonical_name = r.record ->> 'canonicalName'
         and f.display_order = (r.record -> 'attributes' ->> 'displayOrder')::integer
         and f.is_active then 'exact' else 'collision' end
      when 'territorial_scope' then case
        when t.code is null then 'missing'
        when t.canonical_name = r.record ->> 'canonicalName'
         and t.display_order = (r.record -> 'attributes' ->> 'displayOrder')::integer
         and t.requires_country = (r.record -> 'attributes' ->> 'requiresCountry')::boolean
         and t.allows_multiple_countries = (r.record -> 'attributes' ->> 'allowsMultipleCountries')::boolean
         and t.allows_geo_area = (r.record -> 'attributes' ->> 'allowsGeoArea')::boolean
         and t.is_active then 'exact' else 'collision' end
      when 'player_position' then case
        when p.code is null then 'missing'
        when p.canonical_name = r.record ->> 'canonicalName'
         and p.display_order = (r.record -> 'attributes' ->> 'displayOrder')::integer
         and p.is_active then 'exact' else 'collision' end
      when 'staff_role' then case
        when sr.code is null then 'missing'
        when sr.canonical_name = r.record ->> 'canonicalName'
         and sr.display_order = (r.record -> 'attributes' ->> 'displayOrder')::integer
         and sr.is_active then 'exact' else 'collision' end
    end as state
  from records r
  left join public.gender_categories g on r.record ->> 'kind' = 'gender_category' and g.code = r.record ->> 'code'
  left join public.competition_formats f on r.record ->> 'kind' = 'competition_format' and f.code = r.record ->> 'code'
  left join public.territorial_scopes t on r.record ->> 'kind' = 'territorial_scope' and t.code = r.record ->> 'code'
  left join public.player_positions p on r.record ->> 'kind' = 'player_position' and p.code = r.record ->> 'code'
  left join public.staff_roles sr on r.record ->> 'kind' = 'staff_role' and sr.code = r.record ->> 'code'
  where r.record ->> 'kind' in ('gender_category','competition_format','territorial_scope','player_position','staff_role')
),
scope_evaluation as (
  select r.record, case
    when a.id is null then 'missing'
    when a.is_active then 'exact' else 'collision' end as state
  from records r
  left join public.player_positions p on p.code = split_part(r.record -> 'references' ->> 'position', ':', 2)
  left join public.sports s on s.code = split_part(r.record -> 'references' ->> 'sport', ':', 2)
  left join public.sport_disciplines d on d.sport_id = s.id and d.code = nullif(split_part(r.record -> 'references' ->> 'discipline', ':', 2), '')
  left join public.sport_variants v on v.discipline_id = d.id and v.code = nullif(split_part(r.record -> 'references' ->> 'variant', ':', 2), '')
  left join public.player_position_applicability a
    on a.position_id = p.id and a.sport_id = s.id
   and a.discipline_id is not distinct from d.id and a.variant_id is not distinct from v.id
  where r.record ->> 'kind' = 'player_position_applicability'
),
player_mapping_evaluation as (
  select r.record, case
    when m.id is null then 'missing'
    when m.source_value = r.record -> 'attributes' ->> 'sourceValue'
     and m.position_id = p.id and m.is_active then 'exact' else 'collision' end as state
  from records r
  left join public.player_positions p on p.code = split_part(r.record -> 'references' ->> 'position', ':', 2)
  left join public.sports s on s.code = split_part(r.record -> 'references' ->> 'sport', ':', 2)
  left join public.sport_disciplines d on d.sport_id = s.id and d.code = nullif(split_part(r.record -> 'references' ->> 'discipline', ':', 2), '')
  left join public.sport_variants v on v.discipline_id = d.id and v.code = nullif(split_part(r.record -> 'references' ->> 'variant', ':', 2), '')
  left join public.legacy_player_position_mappings m
    on m.normalized_source_value = r.record -> 'attributes' ->> 'normalizedSourceValue'
   and m.sport_id = s.id and m.discipline_id is not distinct from d.id and m.variant_id is not distinct from v.id
  where r.record ->> 'kind' = 'legacy_player_position_mapping'
),
staff_mapping_evaluation as (
  select r.record, case
    when m.id is null then 'missing'
    when m.source_value = r.record -> 'attributes' ->> 'sourceValue'
     and m.staff_role_id = sr.id and m.is_active then 'exact' else 'collision' end as state
  from records r
  left join public.staff_roles sr on sr.code = split_part(r.record -> 'references' ->> 'staffRole', ':', 2)
  left join public.legacy_staff_role_mappings m
    on m.normalized_source_value = r.record -> 'attributes' ->> 'normalizedSourceValue'
  where r.record ->> 'kind' = 'legacy_staff_role_mapping'
),
evaluation as (
  select state from catalog_evaluation union all
  select state from scope_evaluation union all
  select state from player_mapping_evaluation union all
  select state from staff_mapping_evaluation
),
payload_state as (
  select count(*)::integer as evaluated,
    count(*) filter (where state = 'exact')::integer as exact,
    count(*) filter (where state = 'missing')::integer as missing,
    count(*) filter (where state = 'collision')::integer as collisions
  from evaluation
),
summary as (
  select h.*, t.present as required_tables_present, k.present as required_keys_present, m.total as manifest_records,
    m.checksum_ok, m.counts_ok, r.missing as missing_foundation_refs,
    p.evaluated, p.exact, p.missing, p.collisions
  from history h cross join table_state t cross join key_state k cross join manifest_state m
  cross join reference_state r cross join payload_state p
)
select jsonb_build_object(
  'report', 'phase-5d-c-production-preflight-v1',
  'classification', case
    when phase_5c <> 1 or phase_5f_profile <> 1 or phase_5f_experiences <> 1 then 'BLOCKED_MIGRATION_HISTORY'
    when phase_5d_c not in (0, 1) then 'BLOCKED_5D_C_HISTORY'
    when required_tables_present <> 8 or required_keys_present <> 8 then 'BLOCKED_SCHEMA_PREREQUISITES'
    when manifest_records <> 356 or not checksum_ok or not counts_ok or evaluated <> 356 then 'BLOCKED_MANIFEST_CONTRACT'
    when missing_foundation_refs <> 0 then 'BLOCKED_FOUNDATION_REFERENCES'
    when collisions <> 0 then 'BLOCKED_NATURAL_KEY_COLLISIONS'
    when phase_5d_c = 1 and exact = 356 then 'PASS_ALREADY_APPLIED'
    when phase_5d_c = 1 then 'BLOCKED_HISTORY_PAYLOAD_MISMATCH'
    else 'PASS_READY_FOR_EXCLUSIVE_APPLY'
  end,
  'transactionReadOnly', current_setting('transaction_read_only'),
  'writesPerformed', false,
  'history', jsonb_build_object('phase5c',phase_5c,'phase5dC',phase_5d_c,'phase5fProfile',phase_5f_profile,'phase5fExperiences',phase_5f_experiences),
  'schema', jsonb_build_object('requiredTablesPresent',required_tables_present,'requiredTablesExpected',8,'requiredKeysPresent',required_keys_present,'requiredKeysExpected',8),
  'manifest', jsonb_build_object('records',manifest_records,'checksumOk',checksum_ok,'countsOk',counts_ok),
  'foundation', jsonb_build_object('missingReferences',missing_foundation_refs),
  'payload', jsonb_build_object('evaluated',evaluated,'exact',exact,'missing',missing,'collisions',collisions)
)
from summary;

rollback;
