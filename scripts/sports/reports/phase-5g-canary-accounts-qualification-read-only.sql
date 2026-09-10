-- Phase 5G: read-only technical qualification of one disposable Club and Applicant pair.
-- Emits UUIDs/counts only; no email, name, note, title or other PII.
\set ON_ERROR_STOP on
begin transaction read only;

with
input as (
  select :'club_user_id'::uuid club_user_id, :'applicant_user_id'::uuid applicant_user_id
),
auth_state as (
  select i.club_user_id, i.applicant_user_id,
    count(*) filter (where u.id=i.club_user_id)::int club_auth_count,
    count(*) filter (where u.id=i.applicant_user_id)::int applicant_auth_count,
    coalesce(bool_or(
      lower(coalesce(u.email,''))='clubandplayer@gmail.com'
      or lower(coalesce(u.raw_app_meta_data->>'role','')) in ('service_role','supabase_admin')
    ),false) has_auth_admin_signal
  from input i left join auth.users u on u.id in (i.club_user_id,i.applicant_user_id)
  group by i.club_user_id,i.applicant_user_id
),
profile_state as (
  select i.club_user_id, i.applicant_user_id,
    count(*) filter (where p.user_id=i.club_user_id)::int club_profile_count,
    count(*) filter (where p.user_id=i.applicant_user_id)::int applicant_profile_count,
    min(lower(coalesce(p.account_type,p.type,''))) filter (where p.user_id=i.club_user_id) club_type,
    min(lower(coalesce(p.account_type,p.type,''))) filter (where p.user_id=i.applicant_user_id) applicant_type,
    (min(p.id::text) filter (where p.user_id=i.club_user_id))::uuid club_profile_id,
    coalesce(bool_or(p.is_admin is true or lower(coalesce(p.account_type,''))='admin'
      or lower(coalesce(p.type,''))='admin' or lower(coalesce(p.role,''))='admin'),false) has_profile_admin_signal
  from input i left join public.profiles p on p.user_id in (i.club_user_id,i.applicant_user_id)
  group by i.club_user_id,i.applicant_user_id
),
baseline as (
  select
    (select count(*)::int from public.opportunities o, input i, profile_state p
      where o.owner_id=i.club_user_id or o.created_by=i.club_user_id or o.club_id=p.club_profile_id) club_opportunities,
    (select count(*)::int from public.opportunities o, input i
      where o.owner_id=i.applicant_user_id or o.created_by=i.applicant_user_id) applicant_opportunities,
    (select count(*)::int from public.applications a, input i
      where a.athlete_id=i.applicant_user_id) applicant_applications,
    (select count(*)::int from public.applications a join public.opportunities o on o.id=a.opportunity_id, input i, profile_state p
      where o.owner_id=i.club_user_id or o.created_by=i.club_user_id or o.club_id=p.club_profile_id) club_received_applications
),
context as (
  select s.id sport_id, d.id discipline_id, v.id variant_id, pp.id player_position_id
  from public.sports s
  join public.sport_disciplines d on d.sport_id=s.id and d.code='association_football' and d.is_active
  join public.sport_variants v on v.discipline_id=d.id and v.code='eleven_a_side' and v.is_active
  join public.player_positions pp on pp.code='association_football_goalkeeper' and pp.is_active
  join public.player_position_applicability a on a.position_id=pp.id and a.sport_id=s.id
    and a.discipline_id=d.id and a.variant_id=v.id and a.is_active
  where s.code='football' and s.is_active
),
context_state as (select count(*)::int context_count from context),
qualification as (
  select case
    when a.club_user_id=a.applicant_user_id then 'BLOCKED_IDENTITIES_NOT_DISTINCT'
    when a.club_auth_count<>1 or a.applicant_auth_count<>1 then 'BLOCKED_AUTH_CARDINALITY'
    when p.club_profile_count<>1 or p.applicant_profile_count<>1 then 'BLOCKED_PROFILE_CARDINALITY'
    when p.club_type<>'club' then 'BLOCKED_CLUB_TYPE'
    when p.applicant_type not in ('athlete','player') then 'BLOCKED_APPLICANT_TYPE'
    when a.has_auth_admin_signal or p.has_profile_admin_signal then 'BLOCKED_ADMIN_SIGNAL'
    when b.club_opportunities<>0 or b.applicant_opportunities<>0
      or b.applicant_applications<>0 or b.club_received_applications<>0 then 'BLOCKED_NON_EMPTY_BASELINE'
    when c.context_count<>1 then 'BLOCKED_CANONICAL_CONTEXT'
    else 'PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING'
  end classification
  from auth_state a cross join profile_state p cross join baseline b cross join context_state c
)
select jsonb_build_object(
  'classification',(select classification from qualification),
  'transactionReadOnly',current_setting('transaction_read_only'),
  'writesPerformed',false,'containsPii',false,
  'auth',(select jsonb_build_object('club',club_auth_count,'applicant',applicant_auth_count,'adminSignal',has_auth_admin_signal) from auth_state),
  'profiles',(select jsonb_build_object('club',club_profile_count,'applicant',applicant_profile_count,'clubType',club_type,'applicantType',applicant_type,'adminSignal',has_profile_admin_signal) from profile_state),
  'baseline',(select to_jsonb(b) from baseline b),
  'canonicalContextCount',(select context_count from context_state),
  'canonicalContext',(select to_jsonb(c) from context c),
  'disposableAttestationRequired',true
);

rollback;
