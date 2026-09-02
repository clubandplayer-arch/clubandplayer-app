begin;

-- Phase 3C-C3 is structural and additive. Existing Opportunities remain valid
-- with both canonical columns null; no geography is inferred or backfilled.
alter table public.opportunities
  add column if not exists country_id uuid,
  add column if not exists geo_area_id uuid;

alter table public.opportunities
  drop constraint if exists opportunities_country_fk,
  add constraint opportunities_country_fk
    foreign key (country_id)
    references public.countries(id)
    on delete restrict,
  drop constraint if exists opportunities_geo_area_fk,
  add constraint opportunities_geo_area_fk
    foreign key (geo_area_id)
    references public.geo_areas(id)
    on delete restrict,
  drop constraint if exists opportunities_geo_country_required_check,
  add constraint opportunities_geo_country_required_check
    check (geo_area_id is null or country_id is not null),
  drop constraint if exists opportunities_geo_country_fk,
  add constraint opportunities_geo_country_fk
    foreign key (geo_area_id, country_id)
    references public.geo_areas(id, country_id)
    on delete restrict;

create index if not exists opportunities_country_id_idx
  on public.opportunities (country_id);

create index if not exists opportunities_geo_area_id_idx
  on public.opportunities (geo_area_id);

-- Intentionally no UPDATE, INSERT, DELETE, default, backfill, RLS, grant,
-- trigger, function, ownership or applications change in Phase 3C-C3.
commit;
