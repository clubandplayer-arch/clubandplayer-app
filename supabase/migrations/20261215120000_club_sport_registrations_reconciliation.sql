begin;

alter table public.opportunities add column if not exists club_sport_registration_id uuid;

create table public.club_sport_registrations (
 id uuid primary key default gen_random_uuid(), club_profile_id uuid not null references public.profiles(id) on delete cascade,
 sport_id uuid not null references public.sports(id) on delete restrict, sport_discipline_id uuid, sport_variant_id uuid,
 sports_organization_id uuid not null references public.sports_organizations(id) on delete restrict,
 sports_organization_category_id uuid not null references public.sports_organization_categories(id) on delete restrict,
 is_primary boolean not null default false, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique nulls not distinct(club_profile_id,sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id),
 foreign key(sport_discipline_id,sport_id) references public.sport_disciplines(id,sport_id) on delete restrict,
 foreign key(sport_variant_id,sport_discipline_id) references public.sport_variants(id,discipline_id) on delete restrict
);
create unique index club_sport_registrations_one_primary on public.club_sport_registrations(club_profile_id) where is_active and is_primary;
create index club_sport_registrations_public_order on public.club_sport_registrations(club_profile_id,is_primary desc,created_at,id) where is_active;
alter table public.opportunities add constraint opportunities_registration_fk foreign key(club_sport_registration_id) references public.club_sport_registrations(id) on delete restrict;

-- Preserve any values written through the already-deployed single-membership model.
insert into public.club_sport_registrations(club_profile_id,sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id,is_primary,is_active)
select id,sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id,true,true from public.profiles
where account_type='club' and sport_id is not null and sports_organization_id is not null and sports_organization_category_id is not null
on conflict do nothing;

drop trigger if exists profiles_validate_sports_organization_membership on public.profiles;
alter table public.profiles drop column sports_organization_category_id, drop column sports_organization_id;

create function public.validate_club_sport_registration() returns trigger language plpgsql set search_path=public as $$ begin
 if not exists(select 1 from public.profiles p where p.id=new.club_profile_id and p.account_type='club') then raise exception 'registration_requires_club_profile'; end if;
 if not exists(select 1 from public.sports_organization_categories c join public.sports_organizations o on o.id=c.organization_id where c.id=new.sports_organization_category_id and c.organization_id=new.sports_organization_id and c.sport_id=new.sport_id and c.discipline_id is not distinct from new.sport_discipline_id and c.variant_id is not distinct from new.sport_variant_id and c.is_active and o.is_active) then raise exception 'incompatible_club_sport_registration'; end if;
 if new.is_primary and new.is_active then update public.club_sport_registrations set is_primary=false,updated_at=now() where club_profile_id=new.club_profile_id and id<>new.id and is_primary; end if;
 new.updated_at=now(); return new;
end $$;
create trigger validate_club_sport_registration before insert or update on public.club_sport_registrations for each row execute function public.validate_club_sport_registration();
alter table public.club_sport_registrations enable row level security;
create policy registrations_public_active_read on public.club_sport_registrations for select using(is_active or exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid()));
create policy registrations_club_insert on public.club_sport_registrations for insert to authenticated with check(exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid() and p.account_type='club'));
create policy registrations_club_update on public.club_sport_registrations for update to authenticated using(exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid() and p.account_type='club')) with check(exists(select 1 from public.profiles p where p.id=club_profile_id and p.user_id=auth.uid() and p.account_type='club'));
revoke all on public.club_sport_registrations from public,anon,authenticated; grant select on public.club_sport_registrations to anon,authenticated; grant insert,update on public.club_sport_registrations to authenticated;

-- Supersede the earlier provisional E.I.F.A. label without deleting referenced history.
update public.sports_organization_categories set is_active=false where code='eifa_serie_a_delite';

with seed(org_code,sport_key,code,name,ord) as (values
  ('lnd','calcio','giovanili','Giovanili',1),
  ('eifa','calcio','serie_a_d_elite_lorenzo_cesari','Serie A d’Elite “Lorenzo Cesari”',1),
  ('eifa','calcio','campionato_challenge_elite','Campionato Challenge Elite',2),
  ('eifa','calcio','super_champions_elite','Super Champions Elite',3),
  ('eifa','calcio','eifa_champions_elite','EIFA Champions Elite',4),
  ('eifa','calcio','eifa_europa_elite','EIFA Europa Elite',5),
  ('eifa','calcio','eifa_conference_elite','EIFA Conference Elite',6),
  ('eifa','calcio','eifa_cup','EIFA Cup',7),
  ('eifa','calcio','eifa_national_road_to_rome','EIFA National Road to Rome',8),
  ('eifa','calcio','miv_eifa_national_league','MIV EIFA National League',9),
  ('eifa','calcio','poule_scudetto_eifa','Poule Scudetto EIFA',10),
  ('eifa','calcio','coppa_italia_eifa','Coppa Italia EIFA',11),
  ('eifa','calcio','trofeo_lorenzo_cesari','Trofeo Lorenzo Cesari',12),
  ('eifa','calcio','giovanili','Giovanili',13),
  ('csi','calcio','campionato_nazionale_csi','Campionato Nazionale CSI',1),
  ('csi','calcio','poule_scudetto_csi','Poule Scudetto CSI',2),
  ('csi','calcio','coppa_csi','Coppa CSI',3),
  ('csi','calcio','giovanili','Giovanili',4),
  ('csi','calcio_a_8','campionati_territoriali_provinciali_csi','Campionati Territoriali/Provinciali CSI',1),
  ('csi','futsal','campionato_nazionale_calcio_a_5_csi','Campionato Nazionale Calcio a 5 CSI',1),
  ('csi','futsal','tornei_paralimpici_plus','Tornei Paralimpici Plus',2),
  ('csi','futsal','tornei_paralimpici_superplus','Tornei Paralimpici SuperPlus',3),
  ('csi','futsal','giovanili','Giovanili',4),
  ('csi','pallavolo','campionato_nazionale_pallavolo_csi','Campionato Nazionale Pallavolo CSI',1),
  ('csi','pallavolo','giovanili','Giovanili',2),
  ('csi','pallacanestro','campionato_nazionale_pallacanestro_csi','Campionato Nazionale Pallacanestro CSI',1),
  ('csi','pallacanestro','pallacanestro_integrata','Pallacanestro Integrata',2),
  ('csi','pallacanestro','giovanili','Giovanili',3),
  ('csi','pallanuoto','circuiti_e_tornei_provinciali_regionali_csi','Circuiti e Tornei Provinciali/Regionali CSI',1),
  ('csi','football_americano','campionati_e_tornei_nazionali_promozionali_csi','Campionati e Tornei Nazionali/Promozionali CSI',1),
  ('csi','football_americano','flag_football','Flag Football',2),
  ('opes','calcio','campionato_amatori_opes','Campionato Amatori OPES',1),
  ('opes','calcio','finali_nazionali_opes_league','Finali Nazionali OPES League',2),
  ('opes','calcio','giovanili','Giovanili',3),
  ('opes','calcio_a_8','campionato_provinciale_calcio_a_8_opes','Campionato Provinciale Calcio a 8 OPES',1),
  ('opes','calcio_a_8','finali_regionali_calcio_a_8_opes','Finali Regionali Calcio a 8 OPES',2),
  ('opes','calcio_a_8','coppe_locali_opes','Coppe Locali OPES',3),
  ('opes','futsal','finali_nazionali_calcio_a_5_opes','Finali Nazionali Calcio a 5 OPES',1),
  ('opes','futsal','over_40','Over 40',2),
  ('opes','futsal','opes_league_c5_femminile','OPES League C5 Femminile',3),
  ('opes','futsal','campionati_locali_opes','Campionati Locali OPES',4),
  ('opes','pallavolo','opes_volley','OPES Volley',1),
  ('opes','pallavolo','trofeo_delle_regioni_opes','Trofeo delle Regioni OPES',2),
  ('opes','pallavolo','campionati_provinciali_opes','Campionati Provinciali OPES',3),
  ('opes','pallacanestro','campionati_e_tornei_amatoriali_provinciali_regionali_opes','Campionati e Tornei Amatoriali Provinciali/Regionali OPES',1),
  ('opes','football_americano','tornei_promozionali_opes','Tornei Promozionali OPES',1),
  ('opes','football_americano','flag_football','Flag Football',2),
  ('uisp','calcio','campionato_nazionale_calcio_a_11_uisp','Campionato Nazionale Calcio a 11 UISP',1),
  ('uisp','calcio','coppa_nazionale_calcio_a_11_uisp','Coppa Nazionale Calcio a 11 UISP',2),
  ('uisp','calcio','rassegna_nazionale_calcio_a_7_uisp','Rassegna Nazionale Calcio a 7 UISP',3),
  ('uisp','calcio','over_35','Over 35',4),
  ('uisp','calcio','matti_per_il_calcio','Matti per il Calcio',5),
  ('uisp','calcio_a_8','campionati_locali_territoriali_uisp','Campionati Locali/Territoriali UISP',1),
  ('uisp','futsal','campionato_nazionale_calcio_a_5_uisp','Campionato Nazionale Calcio a 5 UISP',1),
  ('uisp','futsal','campionato_nazionale_calcio_a_5_femminile_uisp','Campionato Nazionale Calcio a 5 Femminile UISP',2),
  ('uisp','futsal','coppa_nazionale_calcio_a_5_uisp','Coppa Nazionale Calcio a 5 UISP',3),
  ('uisp','pallavolo','campionato_nazionale_pallavolo_open_maschile_uisp','Campionato Nazionale Pallavolo Open Maschile UISP',1),
  ('uisp','pallavolo','campionato_nazionale_pallavolo_open_femminile_uisp','Campionato Nazionale Pallavolo Open Femminile UISP',2),
  ('uisp','pallavolo','campionato_nazionale_pallavolo_misto_uisp','Campionato Nazionale Pallavolo Misto UISP',3),
  ('uisp','pallavolo','tornei_stagionali_uisp','Tornei Stagionali UISP',4),
  ('uisp','pallavolo','giovanili','Giovanili',5),
  ('uisp','pallacanestro','campionati_territoriali_regionali_uisp','Campionati Territoriali/Regionali UISP',1),
  ('uisp','pallacanestro','summerbasket_3x3','Summerbasket 3x3',2),
  ('uisp','pallanuoto','campionato_nazionale_pallanuoto_amatori_uisp','Campionato Nazionale Pallanuoto Amatori UISP',1),
  ('uisp','pallanuoto','circuito_nazionale_pallanuoto_master_uisp','Circuito Nazionale Pallanuoto Master UISP',2),
  ('csen','calcio_a_8','tornei_amatoriali_csen','Tornei Amatoriali CSEN',1),
  ('csen','calcio_a_8','coppe_provinciali_regionali_csen','Coppe Provinciali/Regionali CSEN',2),
  ('csen','futsal','tornei_amatoriali_calcio_a_5_csen','Tornei Amatoriali Calcio a 5 CSEN',1),
  ('csen','futsal','coppe_provinciali_regionali_calcio_a_5_csen','Coppe Provinciali/Regionali Calcio a 5 CSEN',2),
  ('csen','pallavolo','csen_in_volley_open_maschile','CSEN in Volley Open Maschile',1),
  ('csen','pallavolo','csen_in_volley_open_femminile','CSEN in Volley Open Femminile',2),
  ('csen','pallavolo','csen_in_volley_misto_amatori','CSEN in Volley Misto Amatori',3),
  ('csen','pallavolo','tornei_zonali_provinciali_csen','Tornei Zonali/Provinciali CSEN',4),
  ('csen','pallavolo','giovanili','Giovanili',5),
  ('csen','pallacanestro','tornei_promozionali_csen','Tornei Promozionali CSEN',1),
  ('csen','pallacanestro','campionati_amatoriali_territoriali_csen','Campionati Amatoriali Territoriali CSEN',2),
  ('aics','calcio','campionato_nazionale_aics','Campionato Nazionale AICS',1),
  ('aics','calcio','festa_del_calcio_aics','Festa del Calcio AICS',2),
  ('aics','calcio','giovanili','Giovanili',3),
  ('aics','calcio_a_8','campionati_e_tornei_amatoriali_provinciali_locali_aics','Campionati e Tornei Amatoriali Provinciali/Locali AICS',1),
  ('aics','futsal','campionato_nazionale_aics_calcio_a_5','Campionato Nazionale AICS Calcio a 5',1),
  ('aics','futsal','tornei_amatoriali_regionali_provinciali_aics','Tornei Amatoriali Regionali/Provinciali AICS',2),
  ('aics','futsal','giovanili','Giovanili',3),
  ('aics','pallavolo','campionato_nazionale_aics_pallavolo_open','Campionato Nazionale AICS Pallavolo Open',1),
  ('aics','pallavolo','campionato_nazionale_aics_pallavolo_misto','Campionato Nazionale AICS Pallavolo Misto',2),
  ('aics','pallavolo','verdeazzurro','VerdeAzzurro',3),
  ('aics','pallavolo','giovanili','Giovanili',4),
  ('aics','pallacanestro','campionato_nazionale_aics_pallacanestro_open','Campionato Nazionale AICS Pallacanestro Open',1),
  ('aics','pallacanestro','giovanili','Giovanili',2),
  ('asc','calcio','campionati_amatoriali_territoriali_asc','Campionati Amatoriali Territoriali ASC',1),
  ('asc','calcio','over_35','Over 35',2),
  ('asc','calcio','over_40','Over 40',3),
  ('asc','calcio','giovanili','Giovanili',4),
  ('asc','calcio_a_8','campionato_nazionale_calcio_a_8_asc','Campionato Nazionale Calcio a 8 ASC',1),
  ('asc','calcio_a_8','campionato_regionale_calcio_a_8_asc','Campionato Regionale Calcio a 8 ASC',2),
  ('asc','calcio_a_8','trofei_locali_asc','Trofei Locali ASC',3),
  ('asc','futsal','campionati_provinciali_regionali_asc','Campionati Provinciali/Regionali ASC',1),
  ('asc','futsal','campionato_femminile_asc','Campionato Femminile ASC',2),
  ('asc','futsal','giovanili','Giovanili',3),
  ('asc','pallavolo','campionato_nazionale_volley_misto_asc','Campionato Nazionale Volley Misto ASC',1),
  ('asc','pallavolo','campionati_provinciali_regionali_asc_volley','Campionati Provinciali/Regionali ASC Volley',2),
  ('asc','pallacanestro','baskettando_assieme_open','Baskettando Assieme Open',1),
  ('asc','pallacanestro','basket_inclusivo','Basket Inclusivo',2),
  ('asc','pallacanestro','giovanili','Giovanili',3),
  ('endas','calcio','campionato_nazionale_calcio_a_11_endas','Campionato Nazionale Calcio a 11 ENDAS',1),
  ('endas','calcio','coppa_italia_endas','Coppa Italia ENDAS',2),
  ('endas','calcio_a_8','campionato_nazionale_endas_calcio_a_8','Campionato Nazionale ENDAS Calcio a 8',1),
  ('endas','calcio_a_8','tornei_locali_endas','Tornei Locali ENDAS',2),
  ('endas','futsal','campionati_territoriali_regionali_amatoriali_endas','Campionati Territoriali/Regionali Amatoriali ENDAS',1),
  ('endas','futsal','giovanili','Giovanili',2),
  ('endas','pallavolo','tornei_amatoriali_territoriali_endas','Tornei Amatoriali Territoriali ENDAS',1),
  ('endas','pallavolo','rassegne_promozionali_endas','Rassegne Promozionali ENDAS',2),
  ('endas','pallacanestro','campionato_nazionale_endas_basket_3vs3','Campionato Nazionale ENDAS Basket 3vs3',1),
  ('endas','pallacanestro','campionati_regionali_provinciali_amatoriali_endas','Campionati Regionali/Provinciali Amatoriali ENDAS',2),
  ('endas','pallacanestro','giovanili','Giovanili',3),
  ('pgs','calcio','don_bosco_cup_calcio_open','Don Bosco Cup Calcio Open',1),
  ('pgs','calcio','tornei_oratoriani_pgs','Tornei Oratoriani PGS',2),
  ('pgs','calcio','giovanili','Giovanili',3),
  ('pgs','calcio_a_8','tornei_e_campionati_locali_provinciali_pgs','Tornei e Campionati Locali/Provinciali PGS',1),
  ('pgs','futsal','don_bosco_cup_calcio_a_5_open','Don Bosco Cup Calcio a 5 Open',1),
  ('pgs','futsal','don_bosco_cup_calcio_a_5_amatori','Don Bosco Cup Calcio a 5 Amatori',2),
  ('pgs','futsal','giovanili','Giovanili',3),
  ('pgs','pallavolo','don_bosco_cup_pallavolo_open_maschile','Don Bosco Cup Pallavolo Open Maschile',1),
  ('pgs','pallavolo','don_bosco_cup_pallavolo_open_femminile','Don Bosco Cup Pallavolo Open Femminile',2),
  ('pgs','pallavolo','don_bosco_cup_pallavolo_misto','Don Bosco Cup Pallavolo Misto',3),
  ('pgs','pallavolo','giovanili','Giovanili',4),
  ('pgs','pallacanestro','pgs_basket_cup_5vs5','PGS Basket Cup 5vs5',1),
  ('pgs','pallacanestro','pgs_basket_cup_3vs3','PGS Basket Cup 3vs3',2),
  ('pgs','pallacanestro','pgs_basket_cup_open','PGS Basket Cup Open',3),
  ('pgs','pallacanestro','giovanili','Giovanili',4),
  ('us_acli','calcio','campionato_nazionale_calcio_a_11_open_us_acli','Campionato Nazionale Calcio a 11 Open US ACLI',1),
  ('us_acli','calcio','sport_in_tour','Sport in Tour',2),
  ('us_acli','calcio','coppa_clerici','Coppa Clerici',3),
  ('us_acli','calcio_a_8','campionati_e_tornei_amatoriali_provinciali_locali_us_acli','Campionati e Tornei Amatoriali Provinciali/Locali US ACLI',1),
  ('us_acli','futsal','campionato_nazionale_futsal_us_acli','Campionato Nazionale Futsal US ACLI',1),
  ('us_acli','futsal','finali_nazionali_futsal_us_acli','Finali Nazionali Futsal US ACLI',2),
  ('us_acli','futsal','campionati_territoriali_amatoriali_us_acli','Campionati Territoriali Amatoriali US ACLI',3),
  ('us_acli','pallavolo','campionato_nazionale_pallavolo_us_acli','Campionato Nazionale Pallavolo US ACLI',1),
  ('us_acli','pallavolo','finali_nazionali_pallavolo_us_acli','Finali Nazionali Pallavolo US ACLI',2),
  ('us_acli','pallavolo','campionati_open_pallavolo_us_acli','Campionati Open Pallavolo US ACLI',3),
  ('us_acli','pallavolo','giovanili','Giovanili',4),
  ('us_acli','pallacanestro','campionati_e_tornei_amatoriali_locali_provinciali_us_acli','Campionati e Tornei Amatoriali Locali/Provinciali US ACLI',1)), scope as (
 select seed.*,o.id organization_id,c.id country_id,s.id sport_id,d.id discipline_id,v.id variant_id from seed join public.sports_organizations o on o.code=case when seed.org_code='lnd' then 'lega_nazionale_dilettanti' else seed.org_code end cross join public.countries c join public.sports s on s.code=case when sport_key in ('calcio','calcio_a_8','futsal') then 'football' when sport_key='pallavolo' then 'volleyball' when sport_key='pallacanestro' then 'basketball' when sport_key='pallanuoto' then 'water_polo' else 'american_football' end left join public.sport_disciplines d on d.sport_id=s.id and d.code=case when sport_key in ('calcio','calcio_a_8') then 'association_football' when sport_key='futsal' then 'futsal' end left join public.sport_variants v on v.discipline_id=d.id and v.code=case when sport_key='calcio' then 'eleven_a_side' when sport_key='calcio_a_8' then 'eight_a_side' end where c.iso2='IT'
)
insert into public.sports_organization_categories(id,organization_id,country_id,sport_id,discipline_id,variant_id,code,canonical_name,provider,source_record_id,source_version,source_metadata,is_active,display_order)
select md5('phase6:cat:'||org_code||':'||sport_key||':'||code)::uuid,organization_id,country_id,sport_id,discipline_id,variant_id,org_code||'_'||sport_key||'_'||code,name,'clubandplayer_authorized_catalog','IT:'||sport_key||':'||org_code||':category:'||code,'2026-09-14.phase-6','{"evidence":"user_authorized_catalog"}',true,ord from scope
on conflict(provider,source_record_id) do update set organization_id=excluded.organization_id,country_id=excluded.country_id,sport_id=excluded.sport_id,discipline_id=excluded.discipline_id,variant_id=excluded.variant_id,code=excluded.code,canonical_name=excluded.canonical_name,is_active=true,display_order=excluded.display_order,updated_at=now();

commit;
