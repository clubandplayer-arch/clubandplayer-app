begin;

-- Phase 6 Preview-only additive vocabulary extension. This migration creates no
-- organizations or competitions and does not modify user-owned rows.
insert into public.sport_variants
  (discipline_id, code, canonical_name, team_size, is_active, display_order)
select d.id, 'seven_a_side', '7-a-side', 7, true, 30
from public.sport_disciplines d
join public.sports s on s.id = d.sport_id
where s.code = 'football' and d.code = 'association_football'
on conflict (discipline_id, code) do update set
  canonical_name = excluded.canonical_name,
  team_size = excluded.team_size,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.legacy_sport_mappings
  (source_value, normalized_source_value, sport_id, discipline_id, variant_id,
   legacy_display_label, notes)
select 'Calcio a 7', 'calcio_a_7', s.id, d.id, v.id, 'Calcio a 7',
       'Phase 6 Preview: independently selectable 7-a-side legacy label'
from public.sports s
join public.sport_disciplines d on d.sport_id = s.id and d.code = 'association_football'
join public.sport_variants v on v.discipline_id = d.id and v.code = 'seven_a_side'
where s.code = 'football'
on conflict (normalized_source_value) do update set
  source_value = excluded.source_value,
  sport_id = excluded.sport_id,
  discipline_id = excluded.discipline_id,
  variant_id = excluded.variant_id,
  legacy_display_label = excluded.legacy_display_label,
  is_active = true,
  notes = excluded.notes;

commit;
