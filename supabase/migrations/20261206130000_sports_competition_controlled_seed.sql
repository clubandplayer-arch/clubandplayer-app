begin;

-- Phase 5D seeds only platform-controlled vocabularies already represented by
-- legacy Web/API values. It does not seed organizations, competitions, seasons,
-- user relations or canonical references on user data.
create table if not exists public.legacy_player_role_mappings (
  id uuid primary key default gen_random_uuid(),
  normalized_source_value text not null,
  player_role_id uuid not null references public.player_roles(id) on delete cascade,
  legacy_display_label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint legacy_player_role_mappings_source_key unique (normalized_source_value, player_role_id),
  constraint legacy_player_role_mappings_value_check check (btrim(normalized_source_value) <> '')
);
create index if not exists legacy_player_role_mappings_role_idx on public.legacy_player_role_mappings(player_role_id);

create table if not exists public.legacy_staff_role_mappings (
  id uuid primary key default gen_random_uuid(),
  normalized_source_value text not null unique,
  staff_role_id uuid not null references public.staff_roles(id) on delete cascade,
  legacy_display_label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint legacy_staff_role_mappings_value_check check (btrim(normalized_source_value) <> '')
);
create index if not exists legacy_staff_role_mappings_role_idx on public.legacy_staff_role_mappings(staff_role_id);

insert into public.gender_classes(code, canonical_name) values
  ('male', 'Male'), ('female', 'Female'), ('mixed', 'Mixed')
on conflict (code) do update set canonical_name = excluded.canonical_name, is_active = true, updated_at = now();

insert into public.competition_formats(code, canonical_name) values
  ('league', 'League'), ('cup', 'Cup'), ('tournament', 'Tournament'),
  ('playoff', 'Play-off'), ('friendly', 'Friendly')
on conflict (code) do update set canonical_name = excluded.canonical_name, is_active = true, updated_at = now();

with seed(code, canonical_name, display_order, legacy_label) as (values
  ('president', 'President', 10, 'Presidente'),
  ('vice_president', 'Vice President', 20, 'Vicepresidente'),
  ('sporting_director', 'Sporting Director', 30, 'Direttore Sportivo'),
  ('general_manager', 'General Manager', 40, 'Direttore Generale'),
  ('secretary', 'Secretary', 50, 'Segretario'),
  ('team_manager', 'Team Manager', 60, 'Team manager'),
  ('team_official', 'Team Official', 70, 'Dirigente Accompagnatore'),
  ('head_coach', 'Head Coach', 80, 'Allenatore'),
  ('assistant_coach', 'Assistant Coach', 90, 'Vice Allenatore'),
  ('technical_assistant', 'Technical Assistant', 100, 'Collaboratore Tecnico'),
  ('match_analyst', 'Match Analyst', 110, 'Match Analyst'),
  ('video_analyst', 'Video Analyst', 120, 'Video Analyst'),
  ('fitness_coach', 'Fitness Coach', 130, 'Preparatore Atletico'),
  ('goalkeeping_coach', 'Goalkeeping Coach', 140, 'Preparatore Portieri'),
  ('team_doctor', 'Team Doctor', 150, 'Medico Sociale'),
  ('physiotherapist', 'Physiotherapist', 160, 'Fisioterapista'),
  ('osteopath', 'Osteopath', 170, 'Osteopata'),
  ('massage_therapist', 'Massage Therapist', 180, 'Massaggiatore'),
  ('mental_coach', 'Mental Coach', 190, 'Mental Coach'),
  ('nutritionist', 'Nutritionist', 200, 'Nutrizionista'),
  ('scout', 'Scout', 210, 'Scout'),
  ('talent_scout', 'Talent Scout', 220, 'Talent Scout'),
  ('press_officer', 'Press Officer', 230, 'Addetto Stampa'),
  ('social_media_manager', 'Social Media Manager', 240, 'Social Media Manager'),
  ('photographer', 'Photographer', 250, 'Fotografo'),
  ('content_creator', 'Content Creator', 260, 'Content Creator')
), upserted as (
  insert into public.staff_roles(code, canonical_name, display_order)
  select code, canonical_name, display_order from seed
  on conflict (code) do update set canonical_name=excluded.canonical_name, display_order=excluded.display_order, is_active=true, updated_at=now()
  returning id, code
)
insert into public.legacy_staff_role_mappings(normalized_source_value, staff_role_id, legacy_display_label)
select lower(regexp_replace(s.legacy_label, '[^a-zA-Z0-9]+', '_', 'g')), r.id, s.legacy_label
from seed s join public.staff_roles r on r.code=s.code
on conflict (normalized_source_value) do update set staff_role_id=excluded.staff_role_id, legacy_display_label=excluded.legacy_display_label, is_active=true;

-- Codes are stable English wire keys. legacy_label is preserved exactly as the
-- current Web/API value and is never used as the canonical identity.
with seed(sport_code, code, canonical_name, display_order, legacy_label) as (values
  ('football','goalkeeper','Goalkeeper',10,'Portiere'),
  ('football','centre_back','Centre-back',20,'Difensore centrale'),
  ('football','full_back','Full-back / Wing-back',30,'Terzino/Esterno difensivo'),
  ('football','defensive_midfielder','Defensive Midfielder',40,'Mediano'),
  ('football','central_midfielder','Central Midfielder',50,'Centrocampista centrale'),
  ('football','attacking_midfielder','Attacking Midfielder',60,'Trequartista'),
  ('football','winger','Winger',70,'Esterno offensivo/Ala'),
  ('football','second_striker','Second Striker',80,'Seconda punta'),
  ('football','centre_forward','Centre-forward',90,'Punta centrale'),
  ('football','eight_a_side_centre_back','8-a-side Centre-back',91,'Difensore Centrale'),
  ('football','eight_a_side_deep_winger','8-a-side Defensive Winger',92,'Esterno Basso'),
  ('football','eight_a_side_playmaker','8-a-side Playmaker',93,'Regista'),
  ('football','eight_a_side_advanced_winger','8-a-side Attacking Winger',94,'Esterno Alto'),
  ('football','eight_a_side_centre_forward','8-a-side Centre-forward',95,'Punta Centrale'),
  ('football','futsal_fixo','Fixo',100,'Fixo'),
  ('football','futsal_ala','Futsal Winger',110,'Ala'),
  ('football','futsal_pivot','Futsal Pivot',120,'Pivot'),
  ('football','futsal_universal','Futsal Universal',130,'Universale'),
  ('volleyball','setter','Setter',10,'Palleggiatore'),
  ('volleyball','opposite','Opposite',20,'Opposto'),
  ('volleyball','outside_hitter','Outside Hitter',30,'Schiacciatore'),
  ('volleyball','middle_blocker','Middle Blocker',40,'Centrale'),
  ('volleyball','libero','Libero',50,'Libero'),
  ('basketball','point_guard','Point Guard',10,'Playmaker (PG)'),
  ('basketball','shooting_guard','Shooting Guard',20,'Guardia (SG)'),
  ('basketball','small_forward','Small Forward',30,'Ala piccola (SF)'),
  ('basketball','power_forward','Power Forward',40,'Ala grande (PF)'),
  ('basketball','center','Center',50,'Centro (C)'),
  ('water_polo','goalkeeper','Goalkeeper',10,'Portiere'),
  ('water_polo','center_forward','Center Forward',20,'Centroboa'),
  ('water_polo','center_back','Center Back',30,'Marcatore (Hole-D)'),
  ('water_polo','driver','Driver',40,'Driver/Perimetrale'),
  ('water_polo','wing','Wing',50,'Ala'),
  ('water_polo','point','Point',60,'Punto/Regista'),
  ('handball','goalkeeper','Goalkeeper',10,'Portiere'),
  ('handball','left_wing','Left Wing',20,'Ala sinistra'),
  ('handball','left_back','Left Back',30,'Terzino sinistro'),
  ('handball','centre_back','Centre Back',40,'Centrale'),
  ('handball','right_back','Right Back',50,'Terzino destro'),
  ('handball','right_wing','Right Wing',60,'Ala destra'),
  ('handball','pivot','Pivot',70,'Pivot'),
  ('rugby','prop','Prop',10,'Pilone'),
  ('rugby','hooker','Hooker',20,'Tallonatore'),
  ('rugby','lock','Lock',30,'Seconda linea'),
  ('rugby','flanker','Flanker',40,'Flanker'),
  ('rugby','number_eight','Number Eight',50,'Numero 8'),
  ('rugby','scrum_half','Scrum-half',60,'Mediano di mischia'),
  ('rugby','fly_half','Fly-half',70,'Apertura'),
  ('rugby','centre','Centre',80,'Centro'),
  ('rugby','wing','Wing',90,'Ala'),
  ('rugby','full_back','Full-back',100,'Estremo'),
  ('field_hockey','goalkeeper','Goalkeeper',10,'Portiere'),
  ('field_hockey','defender','Defender',20,'Difensore'),
  ('field_hockey','midfielder','Midfielder',30,'Centrocampista'),
  ('field_hockey','forward','Forward',40,'Attaccante'),
  ('ice_hockey','goalie','Goaltender',10,'Portiere'),
  ('ice_hockey','defenceman','Defenceman',20,'Difensore'),
  ('ice_hockey','left_wing','Left Wing',30,'Ala sinistra'),
  ('ice_hockey','center','Center',40,'Centro'),
  ('ice_hockey','right_wing','Right Wing',50,'Ala destra'),
  ('baseball','pitcher','Pitcher',10,'Pitcher'),
  ('baseball','catcher','Catcher',20,'Catcher'),
  ('baseball','first_base','First Base',30,'Prima base'),
  ('baseball','second_base','Second Base',40,'Seconda base'),
  ('baseball','third_base','Third Base',50,'Terza base'),
  ('baseball','shortstop','Shortstop',60,'Interbase'),
  ('baseball','left_fielder','Left Fielder',70,'Esterno sinistro'),
  ('baseball','center_fielder','Center Fielder',80,'Esterno centro'),
  ('baseball','right_fielder','Right Fielder',90,'Esterno destro'),
  ('baseball','designated_hitter','Designated Hitter',100,'Battitore designato'),
  ('softball','pitcher','Pitcher',10,'Pitcher'),
  ('softball','catcher','Catcher',20,'Catcher'),
  ('softball','first_base','First Base',30,'Prima base'),
  ('softball','second_base','Second Base',40,'Seconda base'),
  ('softball','third_base','Third Base',50,'Terza base'),
  ('softball','shortstop','Shortstop',60,'Interbase'),
  ('softball','left_fielder','Left Fielder',70,'Esterno sinistro'),
  ('softball','center_fielder','Center Fielder',80,'Esterno centro'),
  ('softball','right_fielder','Right Fielder',90,'Esterno destro'),
  ('lacrosse','goalkeeper','Goalkeeper',10,'Portiere'),
  ('lacrosse','defender','Defender',20,'Difensore'),
  ('lacrosse','midfielder','Midfielder',30,'Centrocampista'),
  ('lacrosse','attacker','Attacker',40,'Attaccante'),
  ('lacrosse','long_stick_midfielder','Long-stick Midfielder',50,'LSM'),
  ('lacrosse','faceoff_specialist','Faceoff Specialist',60,'Faceoff specialist'),
  ('american_football','quarterback','Quarterback',10,'Quarterback'),
  ('american_football','running_back','Running Back',20,'Running back'),
  ('american_football','wide_receiver','Wide Receiver',30,'Wide receiver'),
  ('american_football','tight_end','Tight End',40,'Tight end'),
  ('american_football','offensive_lineman','Offensive Lineman',50,'Offensive lineman'),
  ('american_football','defensive_lineman','Defensive Lineman',60,'Defensive lineman'),
  ('american_football','linebacker','Linebacker',70,'Linebacker'),
  ('american_football','cornerback','Cornerback',80,'Cornerback'),
  ('american_football','safety','Safety',90,'Safety'),
  ('american_football','kicker_punter','Kicker / Punter',100,'Kicker/Punter')
), role_upsert as (
  insert into public.player_roles(sport_id, code, canonical_name, display_order)
  select sp.id, seed.code, seed.canonical_name, seed.display_order
  from seed join public.sports sp on sp.code=seed.sport_code
  on conflict (sport_id, code) do update set canonical_name=excluded.canonical_name, display_order=excluded.display_order, is_active=true, updated_at=now()
  returning id
)
insert into public.legacy_player_role_mappings(normalized_source_value, player_role_id, legacy_display_label)
select lower(regexp_replace(seed.legacy_label, '[^a-zA-Z0-9]+', '_', 'g')), pr.id, seed.legacy_label
from seed join public.sports sp on sp.code=seed.sport_code
join public.player_roles pr on pr.sport_id=sp.id and pr.code=seed.code
on conflict (normalized_source_value, player_role_id) do update
set legacy_display_label=excluded.legacy_display_label, is_active=true;

-- Compatibility mappings are authenticated-only; catalogue values remain public.
do $$
declare mapping_table text;
begin
  foreach mapping_table in array array['legacy_player_role_mappings','legacy_staff_role_mappings'] loop
    execute format('alter table public.%I enable row level security', mapping_table);
    execute format('drop policy if exists %I on public.%I', mapping_table || '_authenticated_read', mapping_table);
    execute format('create policy %I on public.%I for select to authenticated using (true)', mapping_table || '_authenticated_read', mapping_table);
    execute format('drop policy if exists %I on public.%I', mapping_table || '_admin_all', mapping_table);
    execute format('create policy %I on public.%I for all to authenticated using (exists (select 1 from public.profiles p where p.user_id=auth.uid() and p.is_admin=true)) with check (exists (select 1 from public.profiles p where p.user_id=auth.uid() and p.is_admin=true))', mapping_table || '_admin_all', mapping_table);
    execute format('revoke all on table public.%I from anon', mapping_table);
    execute format('grant select, insert, update, delete on table public.%I to authenticated, service_role', mapping_table);
  end loop;
end
$$;

-- No organizations/competitions/seasons are seeded without an approved official
-- source/provenance package. No user data is read or modified.
commit;
