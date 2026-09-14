begin;

alter table public.sports_organization_categories
  add constraint sports_organization_categories_id_organization_country_key unique (id, organization_id, country_id);

alter table public.profiles
  add column club_country_id uuid references public.countries(id) on delete restrict,
  add column club_primary_organization_id uuid references public.sports_organizations(id) on delete restrict,
  add column club_organization_category_id uuid,
  add constraint profiles_club_affiliation_shape_check check (
    (club_country_id is null and club_primary_organization_id is null and club_organization_category_id is null)
    or (club_country_id is not null and club_primary_organization_id is not null and club_organization_category_id is not null)
  ),
  add constraint profiles_club_category_organization_fk
    foreign key (club_organization_category_id, club_primary_organization_id, club_country_id)
    references public.sports_organization_categories(id, organization_id, country_id) on delete restrict;

create function public.validate_club_primary_affiliation() returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.club_organization_category_id is null then return new; end if;
  if new.account_type is distinct from 'club' or not exists (
    select 1 from public.sports_organization_categories c
    join public.sports_organizations o on o.id=c.organization_id and o.is_active
    where c.id=new.club_organization_category_id and c.organization_id=new.club_primary_organization_id
      and c.country_id=new.club_country_id and c.sport_id=new.sport_id
      and c.discipline_id is not distinct from new.sport_discipline_id
      and c.variant_id is not distinct from new.sport_variant_id and c.is_active
      and (o.valid_from is null or o.valid_from <= current_date)
      and (o.valid_to is null or o.valid_to >= current_date)
  ) then raise exception 'Invalid canonical Club affiliation'; end if;
  return new;
end $$;

revoke execute on function public.validate_club_primary_affiliation() from public, anon, authenticated;

create trigger trg_profiles_validate_club_primary_affiliation
before insert or update of account_type,club_country_id,club_primary_organization_id,club_organization_category_id,sport_id,sport_discipline_id,sport_variant_id
on public.profiles for each row execute function public.validate_club_primary_affiliation();

create index profiles_club_primary_affiliation_idx
  on public.profiles (club_country_id, sport_id, sport_discipline_id, sport_variant_id,
    club_primary_organization_id, club_organization_category_id)
  where account_type = 'club';

-- LND must either be absent, or already match the one identity authorized by this slice.
do $$
declare matches integer;
begin
  select count(*) into matches
  from public.countries c
  join public.sports s on s.code='football' and s.is_active
  join public.sport_disciplines d on d.sport_id=s.id and d.code='association_football' and d.is_active
  join public.sport_variants v on v.discipline_id=d.id and v.code='eleven_a_side' and v.is_active
  where c.iso2='IT' and c.is_active and c.is_supported;
  if matches <> 1 then raise exception 'Phase 6 Club prerequisite mismatch: expected one active IT/football/association_football/eleven_a_side chain'; end if;
end $$;

do $$
declare matches integer;
begin
  select count(*) into matches from public.sports_organizations
  where id = 'c9626532-93e2-46a8-8d21-f83baf2d7d30'
     or code = 'lnd'
     or lower(canonical_name) in ('lnd', 'lega nazionale dilettanti')
     or (provider = 'clubandplayer_internal_review'
         and source_record_id = 'IT:football:association_football:eleven_a_side:organization:lnd');
  if matches > 1 then raise exception 'Phase 6 Club prerequisite mismatch: ambiguous LND identity'; end if;
  if matches = 1 and not exists (
    select 1 from public.sports_organizations o
    where o.id = 'c9626532-93e2-46a8-8d21-f83baf2d7d30'
      and o.code = 'lnd'
      and o.canonical_name = 'Lega Nazionale Dilettanti'
      and o.primary_country_id = (select id from public.countries where iso2='IT')
      and o.is_active
  ) then raise exception 'Phase 6 Club prerequisite mismatch: conflicting LND identity'; end if;
end $$;

insert into public.sports_organizations (
  id, code, canonical_name, organization_type, primary_country_id, provider,
  source_record_id, source_version, source_metadata, is_active
)
select 'c9626532-93e2-46a8-8d21-f83baf2d7d30', 'lnd', 'Lega Nazionale Dilettanti',
  'sports_organization', c.id, 'clubandplayer_internal_review',
  'IT:football:association_football:eleven_a_side:organization:lnd',
  '2026-09-14.phase-6-club.1',
  jsonb_build_object(
    'officialSourceUrl','https://lnd.it/comunicati/',
    'evidenceUse','organization_identity',
    'organizationTypeAssignment','schema_required_generic_value'
  ), true
from public.countries c
where c.iso2 = 'IT'
  and not exists (select 1 from public.sports_organizations where id = 'c9626532-93e2-46a8-8d21-f83baf2d7d30' or code = 'lnd' or lower(canonical_name) in ('lnd','lega nazionale dilettanti'));

do $$
declare matches integer;
begin
  select count(*) into matches from public.sports_organizations o join public.countries c on c.id=o.primary_country_id
  where (o.code='lnd' or lower(o.canonical_name) in ('lnd','lega nazionale dilettanti'))
    and c.iso2='IT' and o.is_active;
  if matches <> 1 then raise exception 'Phase 6 Club prerequisite mismatch: expected one active Italian LND'; end if;
end $$;

with scope as (
 select o.id organization_id,c.id country_id,s.id sport_id,d.id discipline_id,v.id variant_id
 from public.sports_organizations o
 join public.countries c on c.iso2='IT' and c.is_active and c.is_supported
 join public.sports s on s.code='football' and s.is_active
 join public.sport_disciplines d on d.sport_id=s.id and d.code='association_football' and d.is_active
 join public.sport_variants v on v.discipline_id=d.id and v.code='eleven_a_side' and v.is_active
 where (o.code='lnd' or lower(o.canonical_name) in ('lnd','lega nazionale dilettanti')) and o.is_active
), seed(id,code,name,source_id,display_order,metadata) as (values
 ('e0ef50b6-8556-4953-9a96-f6a8d1b32bc2'::uuid,'lnd_serie_d','Serie D','IT:LND:category:serie_d',1,jsonb_build_object('officialSourceUrl','https://lnd.it/seried/campionato-al-via-5-settembre-programma-e-arbitri-prima-giornata/','evidenceUse','category_name')),
 ('de44d84e-0523-45c9-ad72-bcdcfee9247b'::uuid,'lnd_eccellenza','Eccellenza','IT:LND:category:eccellenza',2,jsonb_build_object('productOwnerAuthorization','2026-09-14','evidenceUse','authorized_catalog_label')),
 ('6c631584-1f5f-4ca7-bba8-131fd5a4c0ce'::uuid,'lnd_promozione','Promozione','IT:LND:category:promozione',3,jsonb_build_object('productOwnerAuthorization','2026-09-14','evidenceUse','authorized_catalog_label')),
 ('bc4d383d-f447-4bb2-973c-f00258f4bca1'::uuid,'lnd_prima_categoria','Prima Categoria','IT:LND:category:prima_categoria',4,jsonb_build_object('productOwnerAuthorization','2026-09-14','evidenceUse','authorized_catalog_label')),
 ('20349b87-528c-4b9a-beeb-440a074bfba7'::uuid,'lnd_seconda_categoria','Seconda Categoria','IT:LND:category:seconda_categoria',5,jsonb_build_object('productOwnerAuthorization','2026-09-14','evidenceUse','authorized_catalog_label')),
 ('e347a551-c787-4f32-8655-2c8ed10d074e'::uuid,'lnd_terza_categoria','Terza Categoria','IT:LND:category:terza_categoria',6,jsonb_build_object('productOwnerAuthorization','2026-09-14','evidenceUse','authorized_catalog_label'))
)
insert into public.sports_organization_categories
 (id,organization_id,country_id,sport_id,discipline_id,variant_id,code,canonical_name,provider,source_record_id,source_version,source_metadata,is_active,display_order)
select seed.id,scope.organization_id,scope.country_id,scope.sport_id,scope.discipline_id,scope.variant_id,
 seed.code,seed.name,'clubandplayer_internal_review',seed.source_id,'2026-09-14.phase-6-club.1',
 seed.metadata || jsonb_build_object('productScope','club_primary_affiliation'),true,seed.display_order
from scope cross join seed;

do $$
declare matches integer;
begin
 select count(*) into matches from public.sports_organization_categories c
 join public.sports_organizations o on o.id=c.organization_id
 join public.countries country on country.id=c.country_id
 join public.sports sport on sport.id=c.sport_id
 join public.sport_disciplines discipline on discipline.id=c.discipline_id and discipline.sport_id=sport.id
 join public.sport_variants v on v.id=c.variant_id and v.discipline_id=discipline.id
 where (o.code='lnd' or lower(o.canonical_name) in ('lnd','lega nazionale dilettanti'))
   and country.iso2='IT'
   and sport.code='football'
   and discipline.code='association_football'
   and v.code='eleven_a_side' and c.is_active;
 if matches <> 6 then raise exception 'Phase 6 Club postcondition mismatch: expected six LND categories'; end if;
 if exists (
   with expected(id,code,name,display_order) as (values
    ('e0ef50b6-8556-4953-9a96-f6a8d1b32bc2'::uuid,'lnd_serie_d','Serie D',1),
    ('de44d84e-0523-45c9-ad72-bcdcfee9247b'::uuid,'lnd_eccellenza','Eccellenza',2),
    ('6c631584-1f5f-4ca7-bba8-131fd5a4c0ce'::uuid,'lnd_promozione','Promozione',3),
    ('bc4d383d-f447-4bb2-973c-f00258f4bca1'::uuid,'lnd_prima_categoria','Prima Categoria',4),
    ('20349b87-528c-4b9a-beeb-440a074bfba7'::uuid,'lnd_seconda_categoria','Seconda Categoria',5),
    ('e347a551-c787-4f32-8655-2c8ed10d074e'::uuid,'lnd_terza_categoria','Terza Categoria',6)
   )
   select id,code,name,display_order from expected
   except
   select c.id,c.code,c.canonical_name,c.display_order
   from public.sports_organization_categories c
   join public.sports_organizations o on o.id=c.organization_id
   join public.countries country on country.id=c.country_id
   join public.sports sport on sport.id=c.sport_id
   join public.sport_disciplines discipline on discipline.id=c.discipline_id and discipline.sport_id=sport.id
   join public.sport_variants variant on variant.id=c.variant_id and variant.discipline_id=discipline.id
   where o.id='c9626532-93e2-46a8-8d21-f83baf2d7d30'::uuid
     and country.iso2='IT' and sport.code='football'
     and discipline.code='association_football' and variant.code='eleven_a_side'
     and c.is_active
 ) then raise exception 'Phase 6 Club postcondition mismatch: incorrect LND category identity'; end if;
end $$;

commit;
