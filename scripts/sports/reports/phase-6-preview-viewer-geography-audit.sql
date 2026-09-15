-- READ-ONLY audit for the Who-to-follow viewerGeography stage on
-- fase6-github (jbovlevodfouwuvtdlja). No profile rows are selected.
begin transaction read only;

with dependencies(relation_name) as (
  values
    ('profile_preferences'),
    ('profile_country_interests'),
    ('profile_geo_area_interests'),
    ('countries'),
    ('geo_areas')
)
select json_build_object(
  'expectedProjectRef', 'jbovlevodfouwuvtdlja',
  'stage', 'viewerGeography',
  'authenticatedSelect', (
    select json_object_agg(
      relation_name,
      has_table_privilege('authenticated', 'public.' || relation_name, 'select')
      order by relation_name
    )
    from dependencies
  ),
  'rlsEnabled', (
    select json_object_agg(d.relation_name, c.relrowsecurity order by d.relation_name)
    from dependencies d
    join pg_class c on c.oid = to_regclass('public.' || d.relation_name)
  ),
  'ownerSelectPolicies', (
    select coalesce(json_object_agg(p.tablename, p.policy_count order by p.tablename), '{}'::json)
    from (
      select tablename, count(*)::int as policy_count
      from pg_policies
      where schemaname = 'public'
        and tablename in ('profile_preferences', 'profile_country_interests', 'profile_geo_area_interests')
        and cmd = 'SELECT'
        and ('authenticated' = any(roles) or 'public' = any(roles))
      group by tablename
    ) p
  )
) as phase_6_preview_viewer_geography_audit;

rollback;
