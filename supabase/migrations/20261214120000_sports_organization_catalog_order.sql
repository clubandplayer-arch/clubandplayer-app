begin;

alter table public.sports_organizations
  add column display_order integer not null default 0;

update public.sports_organizations
set display_order = case code
  when 'lega_nazionale_dilettanti' then 1
  when 'lega_calcio_a_8' then 2
  else display_order
end
where code in ('lega_nazionale_dilettanti', 'lega_calcio_a_8');

-- This tranche records only identities confirmed by each organization's official
-- website. Sport/category links remain absent until a stable category is proven.
with italy as (
  select id from public.countries where iso2 = 'IT' and is_active and is_supported
), seed(id, code, canonical_name, organization_type, source_record_id, display_order, source_url) as (
  values
    ('f10d0000-0000-4000-8000-000000000201'::uuid, 'eifa', 'Elite Italian Football Association', 'league', 'IT:organization:eifa', 3, 'https://www.calcioelite.it/'),
    ('f10d0000-0000-4000-8000-000000000202'::uuid, 'csi', 'Centro Sportivo Italiano', 'sports_promotion_body', 'IT:organization:csi', 4, 'https://www.csi-net.it/'),
    ('f10d0000-0000-4000-8000-000000000203'::uuid, 'uisp', 'Unione Italiana Sport Per tutti', 'sports_promotion_body', 'IT:organization:uisp', 5, 'https://www.uisp.it/nazionale/'),
    ('f10d0000-0000-4000-8000-000000000204'::uuid, 'csen', 'Centro Sportivo Educativo Nazionale', 'sports_promotion_body', 'IT:organization:csen', 6, 'https://www.csen.it/'),
    ('f10d0000-0000-4000-8000-000000000205'::uuid, 'aics', 'Associazione Italiana Cultura Sport', 'sports_promotion_body', 'IT:organization:aics', 7, 'https://www.aics.it/'),
    ('f10d0000-0000-4000-8000-000000000206'::uuid, 'opes', 'Organizzazione Per l''Educazione allo Sport', 'sports_promotion_body', 'IT:organization:opes', 8, 'https://www.opesitalia.it/'),
    ('f10d0000-0000-4000-8000-000000000207'::uuid, 'asc', 'Attivita Sportive Confederate', 'sports_promotion_body', 'IT:organization:asc', 9, 'https://www.ascsport.it/'),
    ('f10d0000-0000-4000-8000-000000000208'::uuid, 'endas', 'Ente Nazionale Democratico di Azione Sociale e Sportiva', 'sports_promotion_body', 'IT:organization:endas', 10, 'https://www.endas.it/'),
    ('f10d0000-0000-4000-8000-000000000209'::uuid, 'pgs', 'Polisportive Giovanili Salesiane', 'sports_promotion_body', 'IT:organization:pgs', 11, 'https://www.pgsitalia.org/'),
    ('f10d0000-0000-4000-8000-000000000210'::uuid, 'us_acli', 'Unione Sportiva ACLI', 'sports_promotion_body', 'IT:organization:us_acli', 12, 'https://www.usacli.it/')
)
insert into public.sports_organizations (
  id, code, canonical_name, organization_type, primary_country_id, provider,
  source_record_id, source_version, source_metadata, is_active, display_order
)
select seed.id, seed.code, seed.canonical_name, seed.organization_type, italy.id,
  'clubandplayer_official_web_review', seed.source_record_id, '2026-09-14.phase-6.2',
  jsonb_build_object(
    'officialSourceUrl', seed.source_url,
    'consultedOn', '2026-09-14',
    'evidenceUse', 'official_organization_identity_only',
    'sportCategoryAssociations', 'not_materialized_without_stable_official_evidence'
  ), true, seed.display_order
from seed cross join italy
on conflict (provider, source_record_id) do update set
  code = excluded.code,
  canonical_name = excluded.canonical_name,
  organization_type = excluded.organization_type,
  primary_country_id = excluded.primary_country_id,
  source_version = excluded.source_version,
  source_metadata = excluded.source_metadata,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

-- The official E.I.F.A. site identifies its activity as eleven-a-side football
-- and publishes Serie A d'Elite as a league. No other E.I.F.A. competition is
-- materialized here because the reviewed pages describe cups, youth classes or
-- explicitly annual editions rather than another stable Club category.
with scope as (
  select o.id organization_id, c.id country_id, s.id sport_id, d.id discipline_id, v.id variant_id
  from public.sports_organizations o
  join public.countries c on c.iso2 = 'IT'
  join public.sports s on s.code = 'football'
  join public.sport_disciplines d on d.sport_id = s.id and d.code = 'association_football'
  join public.sport_variants v on v.discipline_id = d.id and v.code = 'eleven_a_side'
  where o.provider = 'clubandplayer_official_web_review' and o.source_record_id = 'IT:organization:eifa'
)
insert into public.sports_organization_categories (
  id, organization_id, country_id, sport_id, discipline_id, variant_id, code,
  canonical_name, provider, source_record_id, source_version, source_metadata,
  is_active, display_order
)
select 'f10d0000-0000-4000-8000-000000000301'::uuid, scope.organization_id,
  scope.country_id, scope.sport_id, scope.discipline_id, scope.variant_id,
  'eifa_serie_a_delite', 'Serie A d''Elite', 'clubandplayer_official_web_review',
  'IT:football:association_football:eleven_a_side:eifa:category:serie_a_delite',
  '2026-09-14.phase-6.2', jsonb_build_object(
    'officialSourceUrl', 'https://www.calcioelite.it/league/serie-a-delite-lorenzo-cesari/',
    'consultedOn', '2026-09-14',
    'evidenceUse', 'organization_eleven_a_side_football_and_stable_league_name'
  ), true, 1
from scope
on conflict (provider, source_record_id) do update set
  organization_id = excluded.organization_id,
  country_id = excluded.country_id,
  sport_id = excluded.sport_id,
  discipline_id = excluded.discipline_id,
  variant_id = excluded.variant_id,
  code = excluded.code,
  canonical_name = excluded.canonical_name,
  source_version = excluded.source_version,
  source_metadata = excluded.source_metadata,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

do $$
begin
  if (select array_agg(code order by display_order) from public.sports_organizations where display_order between 1 and 12)
    is distinct from array['lega_nazionale_dilettanti','lega_calcio_a_8','eifa','csi','uisp','csen','aics','opes','asc','endas','pgs','us_acli']::text[] then
    raise exception 'Phase 6 organization order postcondition mismatch';
  end if;
end $$;

commit;
