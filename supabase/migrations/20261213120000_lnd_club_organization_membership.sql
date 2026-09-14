begin;

alter table public.profiles
  add column sports_organization_id uuid references public.sports_organizations(id) on delete restrict,
  add column sports_organization_category_id uuid references public.sports_organization_categories(id) on delete restrict;

alter table public.opportunities
  add column sports_organization_id uuid references public.sports_organizations(id) on delete restrict,
  add column sports_organization_category_id uuid references public.sports_organization_categories(id) on delete restrict;

do $$
declare prerequisite_count integer;
begin
  select count(*) into prerequisite_count
  from public.countries c
  join public.sports s on s.code = 'football' and s.is_active
  join public.sport_disciplines d on d.sport_id = s.id and d.code = 'association_football' and d.is_active
  join public.sport_variants v on v.discipline_id = d.id and v.code = 'eleven_a_side' and v.is_active
  where c.iso2 = 'IT' and c.is_active and c.is_supported;
  if prerequisite_count <> 1 then
    raise exception 'Phase 6 prerequisite mismatch: expected one active IT football/association_football/eleven_a_side chain, found %', prerequisite_count;
  end if;
end $$;

insert into public.sports_organizations (
  id, code, canonical_name, organization_type, primary_country_id,
  provider, source_record_id, source_version, source_metadata, is_active
)
select 'f10d0000-0000-4000-8000-000000000001'::uuid,
  'lega_nazionale_dilettanti', 'Lega Nazionale Dilettanti', 'league', c.id,
  'clubandplayer_internal_review',
  'IT:football:association_football:eleven_a_side:organization:lega_nazionale_dilettanti',
  '2026-09-14.phase-6.1', '{"classification":"product_owner_confirmed"}'::jsonb, true
from public.countries c where c.iso2 = 'IT'
on conflict (provider, source_record_id) do update set
  code=excluded.code, canonical_name=excluded.canonical_name,
  organization_type=excluded.organization_type, primary_country_id=excluded.primary_country_id,
  source_version=excluded.source_version, source_metadata=excluded.source_metadata,
  is_active=excluded.is_active, updated_at=now();

with scope as (
  select o.id organization_id, c.id country_id, s.id sport_id, d.id discipline_id, v.id variant_id
  from public.sports_organizations o
  join public.countries c on c.iso2='IT'
  join public.sports s on s.code='football'
  join public.sport_disciplines d on d.sport_id=s.id and d.code='association_football'
  join public.sport_variants v on v.discipline_id=d.id and v.code='eleven_a_side'
  where o.provider='clubandplayer_internal_review'
    and o.source_record_id='IT:football:association_football:eleven_a_side:organization:lega_nazionale_dilettanti'
), seed(id,code,canonical_name,source_record_id,display_order) as (values
 ('f10d0000-0000-4000-8000-000000000101'::uuid,'lnd_serie_d','Serie D','IT:football:association_football:eleven_a_side:lega_nazionale_dilettanti:category:serie_d',1),
 ('f10d0000-0000-4000-8000-000000000102'::uuid,'lnd_eccellenza','Eccellenza','IT:football:association_football:eleven_a_side:lega_nazionale_dilettanti:category:eccellenza',2),
 ('f10d0000-0000-4000-8000-000000000103'::uuid,'lnd_promozione','Promozione','IT:football:association_football:eleven_a_side:lega_nazionale_dilettanti:category:promozione',3),
 ('f10d0000-0000-4000-8000-000000000104'::uuid,'lnd_prima_categoria','Prima Categoria','IT:football:association_football:eleven_a_side:lega_nazionale_dilettanti:category:prima_categoria',4),
 ('f10d0000-0000-4000-8000-000000000105'::uuid,'lnd_seconda_categoria','Seconda Categoria','IT:football:association_football:eleven_a_side:lega_nazionale_dilettanti:category:seconda_categoria',5),
 ('f10d0000-0000-4000-8000-000000000106'::uuid,'lnd_terza_categoria','Terza Categoria','IT:football:association_football:eleven_a_side:lega_nazionale_dilettanti:category:terza_categoria',6)
)
insert into public.sports_organization_categories
 (id,organization_id,country_id,sport_id,discipline_id,variant_id,code,canonical_name,provider,source_record_id,source_version,source_metadata,is_active,display_order)
select seed.id,scope.organization_id,scope.country_id,scope.sport_id,scope.discipline_id,scope.variant_id,
 seed.code,seed.canonical_name,'clubandplayer_internal_review',seed.source_record_id,'2026-09-14.phase-6.1','{}'::jsonb,true,seed.display_order
from scope cross join seed
on conflict (provider,source_record_id) do update set
 organization_id=excluded.organization_id,country_id=excluded.country_id,sport_id=excluded.sport_id,
 discipline_id=excluded.discipline_id,variant_id=excluded.variant_id,code=excluded.code,
 canonical_name=excluded.canonical_name,source_version=excluded.source_version,is_active=excluded.is_active,
 display_order=excluded.display_order,updated_at=now();

create or replace function public.validate_sports_organization_membership()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.sports_organization_id is null and new.sports_organization_category_id is null then return new; end if;
  if new.sports_organization_id is null or new.sports_organization_category_id is null then
    raise exception using errcode='23514', message='sports_organization_and_category_required_together';
  end if;
  if not exists (
    select 1 from public.sports_organization_categories c
    join public.sports_organizations o on o.id=c.organization_id
    where c.id=new.sports_organization_category_id and o.id=new.sports_organization_id
      and c.is_active and o.is_active and c.sport_id=new.sport_id
      and c.discipline_id is not distinct from new.sport_discipline_id
      and c.variant_id is not distinct from new.sport_variant_id
  ) then raise exception using errcode='23514', message='incompatible_sports_organization_category'; end if;
  return new;
end $$;

create trigger profiles_validate_sports_organization_membership
before insert or update of sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id on public.profiles
for each row execute function public.validate_sports_organization_membership();
create trigger opportunities_validate_sports_organization_membership
before insert or update of sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id on public.opportunities
for each row execute function public.validate_sports_organization_membership();

do $$ begin
 if (select count(*) from public.sports_organizations where code='lega_nazionale_dilettanti' and organization_type='league' and is_active) <> 1 then raise exception 'LND organization postcondition mismatch'; end if;
 if (select count(*) from public.sports_organization_categories c join public.sports_organizations o on o.id=c.organization_id where o.code='lega_nazionale_dilettanti' and c.is_active) <> 6 then raise exception 'LND category postcondition mismatch'; end if;
end $$;

commit;
