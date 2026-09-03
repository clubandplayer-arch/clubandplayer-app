-- MANUAL / IRREVERSIBLE: permanently delete the four explicitly identified accounts.
-- Run in the Supabase SQL editor with an administrative database role only after
-- taking a backup. This is intentionally a runbook, not an automatic migration.

begin;

create temporary table deletion_targets (
  user_id uuid primary key,
  email text not null unique,
  expected_account_type text not null
) on commit drop;

insert into deletion_targets (user_id, email, expected_account_type)
values
  ('5369acb3-e999-4271-bb82-d5551855b011', 'margiottastefano26@gmail.com', 'institution'),
  ('5ddd5ecf-ddb3-4173-b01a-b201f0261363', 'giuseppe.aiello060987@gmail.com', 'institution'),
  ('3e06c57c-6f30-4304-99f5-f493e9e4c93f', 'luigiorlando1971@gmail.com', 'club'),
  ('cacc6137-9ee2-477d-97a2-1ceb406e2e5f', 'alfredo.stella84@gmail.com', 'club');

-- Fail closed unless every UUID, email and current profile type still matches.
-- This prevents deletion if a screenshot was transcribed incorrectly or an
-- account has since been reassigned.
do $$
declare
  mismatches text;
begin
  select string_agg(
    format('%s <%s> expected=%s actual=%s', t.user_id, t.email, t.expected_account_type,
      coalesce(lower(coalesce(p.account_type, p.type)), '<missing>')),
    E'\n'
  )
  into mismatches
  from deletion_targets t
  left join auth.users u
    on u.id = t.user_id
   and lower(u.email) = lower(t.email)
  left join public.profiles p
    on p.user_id = t.user_id
  where u.id is null
     or p.id is null
     or lower(coalesce(p.account_type, p.type, '')) <> t.expected_account_type;

  if mismatches is not null then
    raise exception 'Deletion aborted; target verification failed:%', E'\n' || mismatches;
  end if;
end $$;

-- Profile-owned rows use ON DELETE CASCADE/SET NULL in the current schema.
-- Deleting profiles first also covers installations where profiles.user_id is
-- not configured to cascade from auth.users.
delete from public.profiles p
using deletion_targets t
where p.user_id = t.user_id;

-- Auth-owned rows and OAuth identities cascade from auth.users.
delete from auth.users u
using deletion_targets t
where u.id = t.user_id
  and lower(u.email) = lower(t.email);

-- Abort and roll back the whole transaction if either identity or profile data
-- remains. A successful run returns no rows from this check and then commits.
do $$
begin
  if exists (
    select 1
    from deletion_targets t
    left join auth.users u on u.id = t.user_id
    left join public.profiles p on p.user_id = t.user_id
    where u.id is not null or p.id is not null
  ) then
    raise exception 'Deletion aborted; one or more target accounts still exist';
  end if;
end $$;

commit;
