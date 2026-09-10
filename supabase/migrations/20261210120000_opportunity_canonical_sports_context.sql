begin;

-- Phase 5G: additive canonical context for Opportunities only. Applications keep
-- referencing the Opportunity and intentionally do not duplicate this context.
alter table public.opportunities
  add column if not exists sport_id uuid,
  add column if not exists sport_discipline_id uuid,
  add column if not exists sport_variant_id uuid,
  add column if not exists player_position_id uuid,
  add column if not exists staff_role_id uuid,
  add column if not exists gender_code text;

alter table public.opportunities
  add constraint opportunities_canonical_sport_fk
    foreign key (sport_id) references public.sports(id) on delete restrict,
  add constraint opportunities_canonical_discipline_sport_fk
    foreign key (sport_discipline_id, sport_id)
    references public.sport_disciplines(id, sport_id) on delete restrict,
  add constraint opportunities_canonical_variant_discipline_fk
    foreign key (sport_variant_id, sport_discipline_id)
    references public.sport_variants(id, discipline_id) on delete restrict,
  add constraint opportunities_player_position_fk
    foreign key (player_position_id) references public.player_positions(id) on delete restrict,
  add constraint opportunities_staff_role_fk
    foreign key (staff_role_id) references public.staff_roles(id) on delete restrict,
  add constraint opportunities_gender_code_fk
    foreign key (gender_code) references public.gender_categories(code) on delete restrict,
  add constraint opportunities_canonical_sport_shape_check check (
    (sport_discipline_id is null or sport_id is not null)
    and (sport_variant_id is null or sport_discipline_id is not null)
  ),
  add constraint opportunities_canonical_role_shape_check check (
    not (player_position_id is not null and staff_role_id is not null)
    and (player_position_id is null or coalesce(role_group, 'player') = 'player')
    and (staff_role_id is null or role_group = 'staff')
  );

create index if not exists opportunities_canonical_sport_idx
  on public.opportunities(sport_id, sport_discipline_id, sport_variant_id);
create index if not exists opportunities_player_position_idx
  on public.opportunities(player_position_id) where player_position_id is not null;
create index if not exists opportunities_staff_role_idx
  on public.opportunities(staff_role_id) where staff_role_id is not null;

commit;
