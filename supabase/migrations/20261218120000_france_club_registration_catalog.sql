begin;

-- Product-authorized France catalogue from upload-nation-league/upload-france.md.
with france as (select id from public.countries where iso2='FR' and is_active and is_supported),
seed(code,short_name,full_name,ord) as (values
    ('fff','FFF','Fédération Française de Football',1),
    ('ffvolley','FFvolley','Fédération Française de Volley',2),
    ('ffbb','FFBB','Fédération Française de BasketBall',3),
    ('ffhandball','FFHandball','Fédération Française de Handball',4),
    ('ffr','FFR','Fédération Française de Rugby',5),
    ('ffhg','FFHG','Fédération Française de Hockey sur Glace',6),
    ('ffn','FFN','Fédération Française de Natation',7),
    ('ffh','FFH','Fédération Française de Hockey',8),
    ('ffbs','FFBS','Fédération Française de Baseball et Softball',9),
    ('fffa','FFFA','Fédération Française de Football Américain',10),
    ('france_lacrosse','France Lacrosse','Association Française de Lacrosse',11)
)
insert into public.sports_organizations(id,code,canonical_name,organization_type,primary_country_id,provider,source_record_id,source_version,source_metadata,is_active,display_order)
select md5('france-organization:'||code)::uuid,code,full_name,'federation',france.id,
 'clubandplayer_authorized_catalog','FR:organization:'||code,'2026-09-15.france.1',jsonb_build_object('shortName',short_name,'catalogSource','upload-france.md'),true,ord
from seed cross join france
on conflict(provider,source_record_id) do update set code=excluded.code,canonical_name=excluded.canonical_name,primary_country_id=excluded.primary_country_id,source_version=excluded.source_version,source_metadata=excluded.source_metadata,is_active=true,display_order=excluded.display_order,updated_at=now();

with seed(org_code,sport_key,code,name,ord) as (values
    ('fff','calcio','ligue_3','Ligue 3',1),
    ('fff','calcio','national_2','National 2',2),
    ('fff','calcio','national_3','National 3',3),
    ('fff','calcio','regional_1_r1','Régional 1 (R1)',4),
    ('fff','calcio','regional_2_r2','Régional 2 (R2)',5),
    ('fff','calcio','regional_3_r3','Régional 3 (R3)',6),
    ('fff','calcio','district_1_d1','District 1 (D1)',7),
    ('fff','calcio','district_2_d2_et_niveaux_inferieurs','District 2 (D2) et niveaux inférieurs',8),
    ('fff','calcio','arkema_premiere_ligue','Arkema Première Ligue',9),
    ('fff','calcio','seconde_ligue','Seconde Ligue',10),
    ('fff','calcio','giovanili','Giovanili',11),
    ('fff','calcio_a_8','pratique_territoriale','Pratique territoriale',1),
    ('fff','futsal','d1_futsal','D1 Futsal',1),
    ('fff','futsal','d2_futsal','D2 Futsal',2),
    ('fff','futsal','competition_nationale_feminine_de_futsal','Compétition nationale féminine de futsal',3),
    ('fff','futsal','regional_futsal','Régional Futsal',4),
    ('fff','futsal','district_futsal','District Futsal',5),
    ('ffvolley','volleyball','marmara_spikeligue','Marmara SpikeLigue',1),
    ('ffvolley','volleyball','saforelle_power_6','Saforelle Power 6',2),
    ('ffvolley','volleyball','ligue_b_masculine','Ligue B Masculine',3),
    ('ffvolley','volleyball','elite_masculine','Élite Masculine',4),
    ('ffvolley','volleyball','elite_feminine','Élite Féminine',5),
    ('ffvolley','volleyball','nationale_2_masculine','Nationale 2 Masculine',6),
    ('ffvolley','volleyball','nationale_2_feminine','Nationale 2 Féminine',7),
    ('ffvolley','volleyball','nationale_3_masculine','Nationale 3 Masculine',8),
    ('ffvolley','volleyball','nationale_3_feminine','Nationale 3 Féminine',9),
    ('ffvolley','volleyball','pre_nationale','Pré-Nationale',10),
    ('ffvolley','volleyball','regionale','Régionale',11),
    ('ffvolley','volleyball','departementale','Départementale',12),
    ('ffbb','basketball','betclic_elite','Betclic ÉLITE',1),
    ('ffbb','basketball','elite_2_pro_b','ÉLITE 2 (Pro B)',2),
    ('ffbb','basketball','nationale_masculine_1_nm1','Nationale Masculine 1 (NM1)',3),
    ('ffbb','basketball','nationale_masculine_2_nm2','Nationale Masculine 2 (NM2)',4),
    ('ffbb','basketball','nationale_masculine_3_nm3','Nationale Masculine 3 (NM3)',5),
    ('ffbb','basketball','la_boulangere_wonderligue','La Boulangère Wonderligue',6),
    ('ffbb','basketball','ligue_feminine_2_lf2','Ligue Féminine 2 (LF2)',7),
    ('ffbb','basketball','nationale_feminine_1_nf1','Nationale Féminine 1 (NF1)',8),
    ('ffbb','basketball','nationale_feminine_2_nf2','Nationale Féminine 2 (NF2)',9),
    ('ffbb','basketball','nationale_feminine_3_nf3','Nationale Féminine 3 (NF3)',10),
    ('ffbb','basketball','regionale_1','Régionale 1',11),
    ('ffbb','basketball','regionale_2','Régionale 2',12),
    ('ffbb','basketball','regionale_3','Régionale 3',13),
    ('ffbb','basketball','pre_regionale','Pré-Régionale',14),
    ('ffbb','basketball','departementale','Départementale',15),
    ('ffhandball','handball','liqui_moly_starligue','Liqui Moly StarLigue',1),
    ('ffhandball','handball','proligue','ProLigue',2),
    ('ffhandball','handball','d1f_ligue_butagaz_energie','D1F (Ligue Butagaz Énergie)',3),
    ('ffhandball','handball','d2f','D2F',4),
    ('ffhandball','handball','nationale_1_masculine_n1m','Nationale 1 Masculine (N1M)',5),
    ('ffhandball','handball','nationale_2_masculine_n2m','Nationale 2 Masculine (N2M)',6),
    ('ffhandball','handball','nationale_3_masculine_n3m','Nationale 3 Masculine (N3M)',7),
    ('ffhandball','handball','nationale_1_feminine_n1f','Nationale 1 Féminine (N1F)',8),
    ('ffhandball','handball','nationale_2_feminine_n2f','Nationale 2 Féminine (N2F)',9),
    ('ffhandball','handball','nationale_3_feminine_n3f','Nationale 3 Féminine (N3F)',10),
    ('ffhandball','handball','prenationale','Prénationale',11),
    ('ffhandball','handball','regionale','Régionale',12),
    ('ffhandball','handball','departementale','Départementale',13),
    ('ffr','rugby','top_14','Top 14',1),
    ('ffr','rugby','pro_d2','Pro D2',2),
    ('ffr','rugby','nationale','Nationale',3),
    ('ffr','rugby','nationale_2','Nationale 2',4),
    ('ffr','rugby','federale_1','Fédérale 1',5),
    ('ffr','rugby','federale_2','Fédérale 2',6),
    ('ffr','rugby','federale_3','Fédérale 3',7),
    ('ffr','rugby','elite_1_feminine','Élite 1 Féminine',8),
    ('ffr','rugby','elite_2_feminine','Élite 2 Féminine',9),
    ('ffr','rugby','federale_1_feminine','Fédérale 1 Féminine',10),
    ('ffr','rugby','federale_2_feminine','Fédérale 2 Féminine',11),
    ('ffr','rugby','regionale_1','Régionale 1',12),
    ('ffr','rugby','regionale_2','Régionale 2',13),
    ('ffr','rugby','regionale_3','Régionale 3',14),
    ('ffhg','ice_hockey','synerglace_ligue_magnus','Synerglace Ligue Magnus',1),
    ('ffhg','ice_hockey','division_1','Division 1',2),
    ('ffhg','ice_hockey','division_2','Division 2',3),
    ('ffhg','ice_hockey','division_3','Division 3',4),
    ('ffhg','ice_hockey','championnat_feminin','Championnat Féminin',5),
    ('ffhg','ice_hockey','giovanili','Giovanili',6),
    ('ffn','water_polo','elite_masculine','Élite Masculine',1),
    ('ffn','water_polo','elite_feminine','Élite Féminine',2),
    ('ffn','water_polo','nationale_1','Nationale 1',3),
    ('ffn','water_polo','nationale_2','Nationale 2',4),
    ('ffn','water_polo','nationale_3','Nationale 3',5),
    ('ffn','water_polo','regionale','Régionale',6),
    ('ffh','field_hockey','elite_masculine','Elite Masculine',1),
    ('ffh','field_hockey','elite_feminine','Elite Féminine',2),
    ('ffh','field_hockey','nationale_1','Nationale 1',3),
    ('ffh','field_hockey','nationale_2','Nationale 2',4),
    ('ffbs','baseball','division_1_baseball','Division 1 (Baseball)',1),
    ('ffbs','baseball','division_2_baseball','Division 2 (Baseball)',2),
    ('ffbs','baseball','nationale_1_baseball','Nationale 1 (Baseball)',3),
    ('ffbs','baseball','regionale','Régionale',4),
    ('ffbs','softball','division_1_softball','Division 1 (Softball)',1),
    ('ffbs','softball','regionale','Régionale',2),
    ('fffa','american_football','division_1_casque_de_diamant','Division 1 (Casque de Diamant)',1),
    ('fffa','american_football','division_2_casque_dor','Division 2 (Casque d''Or)',2),
    ('fffa','american_football','division_3_casque_dargent','Division 3 (Casque d''Argent)',3),
    ('fffa','american_football','regionale','Régionale',4),
    ('france_lacrosse','lacrosse','championnat_de_france_de_lacrosse','Championnat de France de Lacrosse',1)
), scope as (
 select seed.*,o.id organization_id,c.id country_id,s.id sport_id,d.id discipline_id,v.id variant_id
 from seed join public.sports_organizations o on o.code=seed.org_code
 join public.countries c on c.iso2='FR' and c.is_active and c.is_supported
 join public.sports s on s.code=case when sport_key in ('calcio','calcio_a_8','futsal') then 'football' else sport_key end and s.is_active
 left join public.sport_disciplines d on d.sport_id=s.id and d.code=case when sport_key in ('calcio','calcio_a_8') then 'association_football' when sport_key='futsal' then 'futsal' end
 left join public.sport_variants v on v.discipline_id=d.id and v.code=case when sport_key='calcio' then 'eleven_a_side' when sport_key='calcio_a_8' then 'eight_a_side' end
)
insert into public.sports_organization_categories(id,organization_id,country_id,sport_id,discipline_id,variant_id,code,canonical_name,provider,source_record_id,source_version,source_metadata,is_active,display_order)
select md5('france-category:'||org_code||':'||sport_key||':'||code)::uuid,organization_id,country_id,sport_id,discipline_id,variant_id,
 org_code||'_'||sport_key||'_'||code,name,'clubandplayer_authorized_catalog','FR:'||sport_key||':'||org_code||':category:'||code,'2026-09-15.france.1',
 jsonb_build_object('catalogSource','upload-france.md','historicalAlias',case when sport_key='calcio' and code='ligue_3' then 'National' end),true,ord
from scope
on conflict(provider,source_record_id) do update set organization_id=excluded.organization_id,country_id=excluded.country_id,sport_id=excluded.sport_id,discipline_id=excluded.discipline_id,variant_id=excluded.variant_id,code=excluded.code,canonical_name=excluded.canonical_name,source_version=excluded.source_version,source_metadata=excluded.source_metadata,is_active=true,display_order=excluded.display_order,updated_at=now();

do $$ begin
 if (select count(*) from public.sports_organizations o join public.countries c on c.id=o.primary_country_id where c.iso2='FR' and o.provider='clubandplayer_authorized_catalog' and o.is_active) <> 11 then raise exception 'France organization count mismatch'; end if;
 if (select count(*) from public.sports_organization_categories sc join public.countries c on c.id=sc.country_id where c.iso2='FR' and sc.provider='clubandplayer_authorized_catalog' and sc.is_active) <> 98 then raise exception 'France category count mismatch'; end if;
end $$;

-- Prefer canonical geography, but keep pre-canonical Clubs scoped through the
-- persisted legacy country. A Club with neither a recognized legacy country nor
-- canonical geography must choose a country before it can register.
create or replace function public.validate_club_sport_registration() returns trigger language plpgsql set search_path=public as $$ begin
 if not exists(select 1 from public.profiles p where p.id=new.club_profile_id and p.account_type='club') then raise exception 'registration_requires_club_profile'; end if;
 if not exists(select 1 from public.sports_organization_categories c join public.sports_organizations o on o.id=c.organization_id join public.profiles p on p.id=new.club_profile_id left join public.profile_preferences pp on pp.profile_id=p.id left join public.legacy_country_mappings lcm on lcm.normalized_source_value=lower(trim(p.country)) and lcm.is_active where c.id=new.sports_organization_category_id and c.organization_id=new.sports_organization_id and c.sport_id=new.sport_id and c.discipline_id is not distinct from new.sport_discipline_id and c.variant_id is not distinct from new.sport_variant_id and c.is_active and o.is_active and c.country_id=coalesce(pp.residence_country_id,lcm.country_id)) then raise exception 'incompatible_club_sport_registration'; end if;
 if new.is_primary and new.is_active then update public.club_sport_registrations set is_primary=false,updated_at=now() where club_profile_id=new.club_profile_id and id<>new.id and is_primary; end if;
 new.updated_at=now(); return new;
end $$;

commit;
