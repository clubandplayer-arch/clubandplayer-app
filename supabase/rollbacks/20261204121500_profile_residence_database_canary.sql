begin;

-- Fail closed first. This rollback deliberately removes the residence RPC as
-- well as the canary table; reinstalling an unrestricted implementation is not safe.
revoke all on function public.update_my_profile_residence(uuid, uuid) from public;
revoke all on function public.update_my_profile_residence(uuid, uuid) from anon;
revoke all on function public.update_my_profile_residence(uuid, uuid) from authenticated;
drop function if exists public.update_my_profile_residence(uuid, uuid);
drop table if exists public.profile_residence_write_canary_users;

commit;
