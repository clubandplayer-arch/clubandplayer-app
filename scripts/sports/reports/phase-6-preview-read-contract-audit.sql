-- READ-ONLY audit for fase6-github (jbovlevodfouwuvtdlja).
-- Reports privileges/configuration only; no profile values or personal data.
begin transaction read only;

select json_build_object(
  'expectedProjectRef', 'jbovlevodfouwuvtdlja',
  'authenticatedPrivileges', json_build_object(
    'profiles', has_table_privilege('authenticated', 'public.profiles', 'select'),
    'follows', has_table_privilege('authenticated', 'public.follows', 'select'),
    'playersView', has_table_privilege('authenticated', 'public.players_view', 'select'),
    'athletesView', has_table_privilege('authenticated', 'public.athletes_view', 'select'),
    'fanVoteCounts', has_table_privilege('authenticated', 'public.current_player_fan_vote_counts', 'select'),
    'regions', has_table_privilege('authenticated', 'public.regions', 'select'),
    'provinces', has_table_privilege('authenticated', 'public.provinces', 'select'),
    'municipalities', has_table_privilege('authenticated', 'public.municipalities', 'select')
  ),
  'viewSecurityInvoker', (
    select coalesce(json_object_agg(c.relname,
      coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']), '{}'::json)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('players_view', 'athletes_view')
  ),
  'referenceTableRls', (
    select coalesce(json_object_agg(c.relname, c.relrowsecurity), '{}'::json)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('regions', 'provinces', 'municipalities')
  ),
  'referenceCounts', json_build_object(
    'regions', (select count(*) from public.regions),
    'provinces', (select count(*) from public.provinces),
    'municipalities', (select count(*) from public.municipalities),
    'registryClubs', (select count(*) from public.registry_clubs_master)
  )
) as phase_6_preview_read_contract_audit;

rollback;
