begin;

-- Stable organization membership categories. These are deliberately independent
-- from competitions, competition editions, seasons, territories and sporting rank.
create table public.sports_organization_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.sports_organizations(id) on delete restrict,
  country_id uuid not null references public.countries(id) on delete restrict,
  sport_id uuid not null references public.sports(id) on delete restrict,
  discipline_id uuid,
  variant_id uuid,
  code text not null,
  canonical_name text not null,
  provider text not null,
  source_record_id text not null,
  source_version text,
  source_metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_organization_categories_organization_country_fk
    foreign key (organization_id, country_id)
    references public.sports_organization_countries(organization_id, country_id) on delete restrict,
  constraint sports_organization_categories_discipline_sport_fk
    foreign key (discipline_id, sport_id)
    references public.sport_disciplines(id, sport_id) on delete restrict,
  constraint sports_organization_categories_variant_discipline_fk
    foreign key (variant_id, discipline_id)
    references public.sport_variants(id, discipline_id) on delete restrict,
  constraint sports_organization_categories_scope_shape_check
    check (discipline_id is not null or variant_id is null),
  constraint sports_organization_categories_code_check
    check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint sports_organization_categories_name_check
    check (btrim(canonical_name) <> ''),
  constraint sports_organization_categories_source_check
    check (btrim(provider) <> '' and btrim(source_record_id) <> ''),
  constraint sports_organization_categories_provider_source_key
    unique (provider, source_record_id),
  constraint sports_organization_categories_scope_code_key
    unique nulls not distinct (organization_id, country_id, sport_id, discipline_id, variant_id, code)
);

create index sports_organization_categories_selector_idx
  on public.sports_organization_categories
    (country_id, sport_id, discipline_id, variant_id, organization_id, is_active, display_order);

create trigger trg_sports_organization_categories_updated_at
before update on public.sports_organization_categories
for each row execute function public.set_current_timestamp_updated_at();

alter table public.sports_organization_categories enable row level security;

create policy sports_organization_categories_catalog_read
on public.sports_organization_categories for select to anon, authenticated using (true);

create policy sports_organization_categories_admin_insert
on public.sports_organization_categories for insert to authenticated
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

create policy sports_organization_categories_admin_update
on public.sports_organization_categories for update to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

create policy sports_organization_categories_admin_delete
on public.sports_organization_categories for delete to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

revoke all on table public.sports_organization_categories from public, anon, authenticated;
grant select on table public.sports_organization_categories to anon, authenticated;
grant insert, update, delete on table public.sports_organization_categories to authenticated;
grant all on table public.sports_organization_categories to service_role;

-- Fail closed instead of silently producing an empty materialization when the
-- canonical prerequisite chain is missing, inactive or ambiguous.
do $$
declare
  prerequisite_count integer;
begin
  select count(*) into prerequisite_count
  from public.countries c
  join public.sports s on s.code = 'football' and s.is_active = true
  join public.sport_disciplines d
    on d.sport_id = s.id and d.code = 'association_football' and d.is_active = true
  join public.sport_variants v
    on v.discipline_id = d.id and v.code = 'eight_a_side' and v.is_active = true
  where c.iso2 = 'IT' and c.is_active = true and c.is_supported = true;

  if prerequisite_count <> 1 then
    raise exception 'Phase 6D prerequisite mismatch: expected one active IT/football/association_football/eight_a_side chain, found %', prerequisite_count;
  end if;
end
$$;

-- UUIDv5 values are generated offline from the documented canonical keys using
-- the standard URL namespace. No environment-specific database UUID is copied.
insert into public.sports_organizations (
  id, code, canonical_name, organization_type, primary_country_id,
  provider, source_record_id, source_version, source_metadata, is_active
)
select
  '219a9b21-1a63-5d16-a477-3e1fe51368ca'::uuid,
  'lega_calcio_a_8',
  'Lega Calcio a 8',
  -- Deliberately generic: the available evidence establishes an organization,
  -- not a controlled federation/league subtype.
  'sports_organization',
  c.id,
  'clubandplayer_internal_review',
  'IT:football:association_football:eight_a_side:organization:lega_calcio_a_8',
  '2026-09-14.phase-6d.1',
  jsonb_build_object(
    'evidence', 'user_supplied_source',
    'canonicalKey', 'clubandplayer:sports_organization:clubandplayer_internal_review:lega_calcio_a_8'
  ),
  true
from public.countries c
where c.iso2 = 'IT'
on conflict (provider, source_record_id) do update set
  code = excluded.code,
  canonical_name = excluded.canonical_name,
  organization_type = excluded.organization_type,
  primary_country_id = excluded.primary_country_id,
  source_version = excluded.source_version,
  source_metadata = excluded.source_metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.sports_organization_countries (organization_id, country_id)
select o.id, c.id
from public.sports_organizations o
join public.countries c on c.iso2 = 'IT'
where o.provider = 'clubandplayer_internal_review'
  and o.source_record_id = 'IT:football:association_football:eight_a_side:organization:lega_calcio_a_8'
on conflict (organization_id, country_id) do nothing;

with scope as (
  select
    o.id as organization_id,
    c.id as country_id,
    s.id as sport_id,
    d.id as discipline_id,
    v.id as variant_id
  from public.sports_organizations o
  join public.countries c on c.iso2 = 'IT'
  join public.sports s on s.code = 'football'
  join public.sport_disciplines d on d.sport_id = s.id and d.code = 'association_football'
  join public.sport_variants v on v.discipline_id = d.id and v.code = 'eight_a_side'
  where o.provider = 'clubandplayer_internal_review'
    and o.source_record_id = 'IT:football:association_football:eight_a_side:organization:lega_calcio_a_8'
), seed(id, code, canonical_name, source_record_id, display_order, source_url, canonical_key) as (
  values
    ('d0f2c15e-925f-522b-84a4-aedd51fa61e3'::uuid, 'c8_serie_a', 'Serie A',
      'IT:football:association_football:eight_a_side:lega_calcio_a_8:category:serie_a', 1,
      'https://www.legacalcioa8.it/it/tournament/122/serie-a-renovalo-2627/stream/',
      'clubandplayer:sports_organization_category:clubandplayer_internal_review:lega_calcio_a_8:c8_serie_a'),
    ('8b37979c-07d4-5b59-8d5b-8180d1562287'::uuid, 'c8_serie_a2', 'Serie A2',
      'IT:football:association_football:eight_a_side:lega_calcio_a_8:category:serie_a2', 2,
      'https://www.legacalcioa8.it/it/tournament/123/serie-a2-2627/stream/',
      'clubandplayer:sports_organization_category:clubandplayer_internal_review:lega_calcio_a_8:c8_serie_a2'),
    ('c0b29110-46a3-5ea4-927e-890721ca2865'::uuid, 'c8_serie_b', 'Serie B',
      'IT:football:association_football:eight_a_side:lega_calcio_a_8:category:serie_b', 3,
      'https://www.legacalcioa8.it/it/tournament/124/serie-b-2627/stream/',
      'clubandplayer:sports_organization_category:clubandplayer_internal_review:lega_calcio_a_8:c8_serie_b')
)
insert into public.sports_organization_categories (
  id, organization_id, country_id, sport_id, discipline_id, variant_id,
  code, canonical_name, provider, source_record_id, source_version,
  source_metadata, is_active, display_order
)
select
  seed.id, scope.organization_id, scope.country_id, scope.sport_id, scope.discipline_id, scope.variant_id,
  seed.code, seed.canonical_name, 'clubandplayer_internal_review', seed.source_record_id,
  '2026-09-14.phase-6d.1',
  jsonb_build_object(
    'evidence', 'user_supplied_source',
    'sourceUrl', seed.source_url,
    'canonicalKey', seed.canonical_key,
    'identityPolicy', 'stable_organization_category_not_season_or_tournament'
  ),
  true, seed.display_order
from scope cross join seed
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

-- Assert the complete, exact postcondition inside the same transaction.
do $$
declare
  organization_count integer;
  category_count integer;
begin
  select count(*) into organization_count
  from public.sports_organizations o
  join public.countries c on c.id = o.primary_country_id
  join public.sports_organization_countries oc
    on oc.organization_id = o.id and oc.country_id = c.id
  where o.id = '219a9b21-1a63-5d16-a477-3e1fe51368ca'::uuid
    and o.provider = 'clubandplayer_internal_review'
    and o.source_record_id = 'IT:football:association_football:eight_a_side:organization:lega_calcio_a_8'
    and o.code = 'lega_calcio_a_8'
    and o.canonical_name = 'Lega Calcio a 8'
    and o.organization_type = 'sports_organization'
    and o.is_active = true
    and c.iso2 = 'IT';

  if organization_count <> 1 then
    raise exception 'Phase 6D postcondition mismatch: Lega Calcio a 8 organization';
  end if;

  select count(*) into category_count
  from public.sports_organization_categories category
  join public.sports_organizations o on o.id = category.organization_id
  join public.countries c on c.id = category.country_id
  join public.sports s on s.id = category.sport_id
  join public.sport_disciplines d on d.id = category.discipline_id and d.sport_id = s.id
  join public.sport_variants v on v.id = category.variant_id and v.discipline_id = d.id
  where o.id = '219a9b21-1a63-5d16-a477-3e1fe51368ca'::uuid
    and c.iso2 = 'IT'
    and s.code = 'football'
    and d.code = 'association_football'
    and v.code = 'eight_a_side'
    and category.provider = 'clubandplayer_internal_review'
    and category.source_record_id in (
      'IT:football:association_football:eight_a_side:lega_calcio_a_8:category:serie_a',
      'IT:football:association_football:eight_a_side:lega_calcio_a_8:category:serie_a2',
      'IT:football:association_football:eight_a_side:lega_calcio_a_8:category:serie_b'
    )
    and (category.code, category.canonical_name, category.display_order) in (
      ('c8_serie_a', 'Serie A', 1),
      ('c8_serie_a2', 'Serie A2', 2),
      ('c8_serie_b', 'Serie B', 3)
    )
    and category.is_active = true;

  if category_count <> 3 then
    raise exception 'Phase 6D postcondition mismatch: expected three active C8 categories, found %', category_count;
  end if;
end
$$;

commit;
