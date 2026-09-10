-- FASE 5F-F: technical qualification of one proposed Production canary owner.
-- Usage: psql -X -v ON_ERROR_STOP=1 -v canary_user_id='<uuid>' -f <this-file>
-- One JSON cell; no PII fields, DDL, DML, locks, function calls, or migration work.
begin transaction read only;

with
input as (
  select :'canary_user_id'::uuid as user_id
),
auth_state as (
  select
    count(*)::integer as user_count,
    coalesce(bool_or(
      lower(coalesce(u.email, '')) = 'clubandplayer@gmail.com'
      or lower(coalesce(u.raw_app_meta_data ->> 'role', '')) in ('service_role', 'supabase_admin')
    ), false) as has_auth_admin_signal
  from auth.users u
  join input i on i.user_id = u.id
),
profile_rows as (
  select p.*
  from public.profiles p
  join input i on i.user_id = p.user_id
),
profile_state as (
  select
    count(*)::integer as profile_count,
    coalesce(bool_or(
      p.is_admin is true
      or lower(coalesce(p.account_type, '')) = 'admin'
      or lower(coalesce(p.type, '')) = 'admin'
      or lower(coalesce(p.role, '')) = 'admin'
    ), false) as has_profile_admin_signal,
    min(lower(coalesce(p.account_type, p.type, ''))) as account_type,
    min(p.role) as legacy_role,
    min(p.sport) as legacy_sport,
    min(p.sport_id::text)::uuid as sport_id,
    min(p.sport_discipline_id::text)::uuid as sport_discipline_id,
    min(p.sport_variant_id::text)::uuid as sport_variant_id
  from profile_rows p
),
experience_state as (
  select
    count(e.id)::integer as experience_count,
    count(e.id) filter (
      where e.sport_id is not null
         or e.sport_discipline_id is not null
         or e.sport_variant_id is not null
    )::integer as canonical_non_null_rows,
    count(e.id) filter (where nullif(btrim(e.sport), '') is not null)::integer as legacy_sport_rows,
    min(e.start_year) as earliest_start_year,
    max(e.end_year) as latest_end_year
  from profile_rows p
  left join public.athlete_experiences e on e.profile_id = p.id
),
mapping_state as (
  select
    count(m.id)::integer as active_mapping_count,
    count(m.id) filter (
      where s.is_active
        and (d.id is null or d.is_active)
        and (v.id is null or v.is_active)
        and (d.id is null or d.sport_id = s.id)
        and (v.id is null or v.discipline_id = d.id)
    )::integer as active_coherent_mapping_count
  from profile_rows p
  left join public.legacy_sport_mappings m
    on lower(btrim(m.source_value)) = lower(btrim(p.sport))
   and m.is_active
  left join public.sports s on s.id = m.sport_id
  left join public.sport_disciplines d on d.id = m.discipline_id
  left join public.sport_variants v on v.id = m.variant_id
),
qualification as (
  select case
    when a.user_count <> 1 then 'BLOCKED_AUTH_USER_CARDINALITY'
    when p.profile_count <> 1 then 'BLOCKED_PROFILE_CARDINALITY'
    when p.account_type <> 'staff' then 'BLOCKED_NOT_STAFF'
    when lower(coalesce(p.legacy_role, '')) <> 'fotografo' then 'BLOCKED_ROLE_MISMATCH'
    when a.has_auth_admin_signal or p.has_profile_admin_signal then 'BLOCKED_ADMIN_SIGNAL'
    when nullif(btrim(p.legacy_sport), '') is null then 'BLOCKED_MISSING_LEGACY_SPORT'
    when p.sport_id is not null or p.sport_discipline_id is not null or p.sport_variant_id is not null
      then 'BLOCKED_PROFILE_CANONICAL_BASELINE_NOT_NULL'
    when e.canonical_non_null_rows <> 0 then 'BLOCKED_EXPERIENCE_CANONICAL_BASELINE_NOT_NULL'
    when m.active_mapping_count <> 1 or m.active_coherent_mapping_count <> 1
      then 'BLOCKED_LEGACY_SPORT_MAPPING'
    else 'PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING'
  end as status
  from auth_state a
  cross join profile_state p
  cross join experience_state e
  cross join mapping_state m
)
select jsonb_pretty(jsonb_build_object(
  'report', 'phase-5f-canary-account-qualification-v1',
  'checkedAt', statement_timestamp(),
  'transactionReadOnly', current_setting('transaction_read_only'),
  'classification', (select status from qualification),
  'targetUserId', (select user_id from input),
  'auth', (select to_jsonb(a) from auth_state a),
  'profile', (select to_jsonb(p) from profile_state p),
  'experiences', (select to_jsonb(e) from experience_state e),
  'legacySportMapping', (select to_jsonb(m) from mapping_state m),
  'expectedAccountType', 'staff',
  'expectedLegacyRole', 'Fotografo',
  'disposableAttestationRequired', true,
  'containsPii', false,
  'writesPerformed', false
)) as phase_5f_canary_account_qualification;

rollback;
