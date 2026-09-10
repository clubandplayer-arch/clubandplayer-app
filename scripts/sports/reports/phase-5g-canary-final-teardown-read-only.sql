begin transaction read only;

with target as (
  select
    '870bb095-9f8b-4800-a8b9-3e137714e8d0'::uuid as club_user_id,
    '2c988bc3-5245-45dc-8184-8582ab3b0e5a'::uuid as applicant_user_id,
    '00cfbc21-5afe-4e7d-92da-f2cce239da4c'::uuid as opportunity_id,
    '7e165c40-d620-4d09-8305-69b0a923af1c'::uuid as application_id
), counts as (
  select
    (select count(*) from auth.users u, target t
      where u.id in (t.club_user_id, t.applicant_user_id))::integer as auth_users,
    (select count(*) from public.profiles p, target t
      where p.user_id in (t.club_user_id, t.applicant_user_id))::integer as profiles,
    (select count(*) from public.opportunities o, target t
      where o.id = t.opportunity_id
        or o.owner_id in (t.club_user_id, t.applicant_user_id)
        or o.created_by in (t.club_user_id, t.applicant_user_id))::integer as opportunities,
    (select count(*) from public.applications a, target t
      where a.id = t.application_id
        or a.opportunity_id = t.opportunity_id
        or a.athlete_id in (t.club_user_id, t.applicant_user_id)
        or a.club_id in (t.club_user_id, t.applicant_user_id))::integer as applications
)
select jsonb_build_object(
  'report', 'phase-5g-canary-final-teardown-v1',
  'classification', case
    when auth_users = 0 and profiles = 0 and opportunities = 0 and applications = 0
      then 'PASS_PHASE_5G_CANARY_FINAL_TEARDOWN'
    else 'BLOCKED_PHASE_5G_CANARY_FINAL_TEARDOWN_RESIDUE'
  end,
  'counts', to_jsonb(counts),
  'transactionReadOnly', current_setting('transaction_read_only'),
  'writesPerformed', false,
  'containsPii', false
)
from counts;

rollback;
