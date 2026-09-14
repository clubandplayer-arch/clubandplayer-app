begin;

do $$
declare names text[];
begin
  select array_agg(c.canonical_name order by c.display_order) into names
  from public.sports_organization_categories c
  join public.sports_organizations o on o.id=c.organization_id
  where o.code='lega_nazionale_dilettanti' and c.is_active;
  if names <> array['Serie D','Eccellenza','Promozione','Prima Categoria','Seconda Categoria','Terza Categoria'] then
    raise exception 'unexpected LND categories: %', names;
  end if;
  if (select count(*) from public.sports_organizations where code='lega_calcio_a_8') <> 1 then
    raise exception 'Lega Calcio a 8 must not be duplicated';
  end if;
end $$;

create temporary table membership_probe (
  sport_id uuid, sport_discipline_id uuid, sport_variant_id uuid,
  sports_organization_id uuid, sports_organization_category_id uuid
);
create trigger membership_probe_validate before insert or update on membership_probe
for each row execute function public.validate_sports_organization_membership();

insert into membership_probe
select c.sport_id,c.discipline_id,c.variant_id,c.organization_id,c.id
from public.sports_organization_categories c
join public.sports_organizations o on o.id=c.organization_id
where o.code='lega_nazionale_dilettanti' and c.code='lnd_serie_d';

do $$ begin
  begin
    insert into membership_probe
    select c.sport_id,c.discipline_id,c.variant_id,
      '219a9b21-1a63-5d16-a477-3e1fe51368ca'::uuid,c.id
    from public.sports_organization_categories c where c.code='lnd_serie_d';
    raise exception 'incompatible combination was accepted';
  exception when check_violation then null;
  end;
end $$;

rollback;

do $$
begin
  if (select array_agg(code order by display_order) from public.sports_organizations where display_order between 1 and 12)
    is distinct from array['lega_nazionale_dilettanti','lega_calcio_a_8','eifa','csi','uisp','csen','aics','opes','asc','endas','pgs','us_acli']::text[] then
    raise exception 'unexpected organization catalog order';
  end if;
  if exists (
    select 1 from public.sports_organization_categories c
    join public.sports_organizations o on o.id = c.organization_id
    where o.code in ('csi','uisp','csen','aics','opes','asc','endas','pgs','us_acli')
  ) then
    raise exception 'unverified organization/category association materialized';
  end if;
end $$;
