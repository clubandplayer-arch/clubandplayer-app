-- FASE 5F: verify removal of one disposable canary account without writes or PII.
-- Usage: psql -X -qAt -v ON_ERROR_STOP=1 -v canary_user_id='<uuid>' -v canary_profile_id='<uuid>' -f <this-file>
begin transaction read only;

with input as (
  select
    :'canary_user_id'::uuid as user_id,
    :'canary_profile_id'::uuid as profile_id
), counts as (
  select
    (select count(*) from auth.users u join input i on u.id = i.user_id)::integer as auth_users,
    (select count(*) from public.profiles p join input i on p.user_id = i.user_id or p.id = i.profile_id)::integer as profiles,
    (select count(*) from public.athlete_experiences e join input i on e.profile_id = i.profile_id)::integer as experiences
)
select jsonb_build_object(
  'report', 'phase-5f-canary-teardown-verification-v1',
  'classification', case
    when auth_users = 0 and profiles = 0 and experiences = 0
      then 'PASS_PHASE_5F_CANARY_TEARDOWN_VERIFIED'
    else 'BLOCKED_PHASE_5F_CANARY_TEARDOWN_RESIDUE'
  end,
  'targetUserId', (select user_id from input),
  'targetProfileId', (select profile_id from input),
  'counts', to_jsonb(counts),
  'transactionReadOnly', current_setting('transaction_read_only'),
  'containsPii', false,
  'writesPerformed', false
)
from counts;

rollback;
