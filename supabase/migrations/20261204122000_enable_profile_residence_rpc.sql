begin;

-- Deliberately separate capability activation from function installation.
-- Apply only after the UI and server write gates have been explicitly approved.
revoke all on function public.update_my_profile_residence(uuid, uuid) from public;
revoke all on function public.update_my_profile_residence(uuid, uuid) from anon;
grant execute on function public.update_my_profile_residence(uuid, uuid) to authenticated;

commit;
