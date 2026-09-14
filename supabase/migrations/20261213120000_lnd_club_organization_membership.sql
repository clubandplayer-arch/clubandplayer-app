begin;

alter table public.opportunities
  add column club_sport_registration_id uuid,
  add column sports_organization_id uuid references public.sports_organizations(id) on delete restrict,
  add column sports_organization_category_id uuid references public.sports_organization_categories(id) on delete restrict;

-- Initial authorized LND catalogue; the following local migration extends it.
insert into public.sports_organizations(id,code,canonical_name,organization_type,primary_country_id,provider,source_record_id,is_active)
select md5('phase6:org:lnd')::uuid,'lega_nazionale_dilettanti','Lega Nazionale Dilettanti','league',c.id,'clubandplayer_authorized_catalog','IT:organization:lnd',true from public.countries c where c.iso2='IT'
on conflict(provider,source_record_id) do update set is_active=true;

with scope as (
 select o.id organization_id,c.id country_id,s.id sport_id,d.id discipline_id,v.id variant_id
 from public.countries c join public.sports s on s.code='football'
 join public.sport_disciplines d on d.sport_id=s.id and d.code='association_football'
 join public.sport_variants v on v.discipline_id=d.id and v.code='eleven_a_side'
 cross join public.sports_organizations o where c.iso2='IT' and o.code='lega_nazionale_dilettanti'
), seed(code,name,ord) as (values ('serie_d','Serie D',1),('eccellenza','Eccellenza',2),('promozione','Promozione',3),('prima_categoria','Prima Categoria',4),('seconda_categoria','Seconda Categoria',5),('terza_categoria','Terza Categoria',6))
insert into public.sports_organization_categories(id,organization_id,country_id,sport_id,discipline_id,variant_id,code,canonical_name,provider,source_record_id,is_active,display_order)
select md5('phase6:lnd:'||code)::uuid,organization_id,country_id,sport_id,discipline_id,variant_id,'lnd_'||code,name,'clubandplayer_authorized_catalog','IT:calcio:lnd:category:'||code,true,ord from scope cross join seed;

create table public.club_sport_registrations (
 id uuid primary key default gen_random_uuid(),
 club_profile_id uuid not null references public.profiles(id) on delete cascade,
 sport_id uuid not null references public.sports(id) on delete restrict,
 sport_discipline_id uuid,
 sport_variant_id uuid,
 sports_organization_id uuid not null references public.sports_organizations(id) on delete restrict,
 sports_organization_category_id uuid not null references public.sports_organization_categories(id) on delete restrict,
 is_primary boolean not null default false,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique nulls not distinct(club_profile_id,sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id),
 foreign key(sport_discipline_id,sport_id) references public.sport_disciplines(id,sport_id) on delete restrict,
 foreign key(sport_variant_id,sport_discipline_id) references public.sport_variants(id,discipline_id) on delete restrict
);
create unique index club_sport_registrations_one_primary on public.club_sport_registrations(club_profile_id) where is_active and is_primary;
create index club_sport_registrations_public_order on public.club_sport_registrations(club_profile_id,is_primary desc,created_at,id) where is_active;
alter table public.opportunities add constraint opportunities_registration_fk foreign key(club_sport_registration_id) references public.club_sport_registrations(id) on delete restrict;

create function public.validate_club_sport_registration() returns trigger language plpgsql set search_path=public as $$ begin
 if not exists(select 1 from public.profiles p where p.id=new.club_profile_id and p.account_type='club') then raise exception 'registration_requires_club_profile'; end if;
 if not exists(select 1 from public.sports_organization_categories c where c.id=new.sports_organization_category_id and c.organization_id=new.sports_organization_id and c.sport_id=new.sport_id and c.discipline_id is not distinct from new.sport_discipline_id and c.variant_id is not distinct from new.sport_variant_id and c.is_active) then raise exception 'incompatible_club_sport_registration'; end if;
 if new.is_primary and new.is_active then update public.club_sport_registrations set is_primary=false,updated_at=now() where club_profile_id=new.club_profile_id and id<>new.id and is_primary; end if;
 new.updated_at=now(); return new;
end $$;
create trigger validate_club_sport_registration before insert or update on public.club_sport_registrations for each row execute function public.validate_club_sport_registration();

alter table public.club_sport_registrations enable row level security;
create policy registrations_public_active_read on public.club_sport_registrations for select using (is_active or exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid()));
create policy registrations_club_insert on public.club_sport_registrations for insert to authenticated with check(exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid() and p.account_type='club'));
create policy registrations_club_update on public.club_sport_registrations for update to authenticated using(exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid() and p.account_type='club')) with check(exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid() and p.account_type='club'));
revoke all on public.club_sport_registrations from public,anon,authenticated;
grant select on public.club_sport_registrations to anon,authenticated;
grant insert,update on public.club_sport_registrations to authenticated;

commit;
