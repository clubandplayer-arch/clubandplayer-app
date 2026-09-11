begin;

-- Private viewer preferences remain owner-scoped by the existing RLS policy.
-- Restore only the authenticated SELECT grant omitted by the replay baseline.
do $guard$
begin
  if to_regclass('public.profile_geo_area_interests') is null then
    raise exception 'required table public.profile_geo_area_interests is missing';
  end if;
  if not exists (
    select 1 from pg_class c
    where c.oid = 'public.profile_geo_area_interests'::regclass
      and c.relrowsecurity
  ) then
    raise exception 'public.profile_geo_area_interests must keep RLS enabled';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_geo_area_interests'
      and policyname = 'profile_geo_area_interests_select_own_or_admin'
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
  ) then
    raise exception 'owner-scoped SELECT policy is missing';
  end if;
end
$guard$;

grant select on table public.profile_geo_area_interests to authenticated;

commit;
notify pgrst, 'reload schema';
