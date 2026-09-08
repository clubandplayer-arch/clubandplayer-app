begin;

-- Phase 5F-A is schema-only. The legacy text remains the compatibility field;
-- nullable canonical columns permit old clients and legacy-only rows unchanged.
alter table public.profiles
  add column if not exists sport_id uuid,
  add column if not exists sport_discipline_id uuid,
  add column if not exists sport_variant_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_primary_sport_fk'
  ) then
    alter table public.profiles
      add constraint profiles_primary_sport_fk
      foreign key (sport_id) references public.sports(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_primary_sport_discipline_sport_fk'
  ) then
    alter table public.profiles
      add constraint profiles_primary_sport_discipline_sport_fk
      foreign key (sport_discipline_id, sport_id)
      references public.sport_disciplines(id, sport_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_primary_sport_variant_discipline_fk'
  ) then
    alter table public.profiles
      add constraint profiles_primary_sport_variant_discipline_fk
      foreign key (sport_variant_id, sport_discipline_id)
      references public.sport_variants(id, discipline_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_primary_sport_shape_check'
  ) then
    alter table public.profiles
      add constraint profiles_primary_sport_shape_check check (
        (sport_discipline_id is null or sport_id is not null)
        and (sport_variant_id is null or sport_discipline_id is not null)
      );
  end if;
end
$$;

comment on column public.profiles.sport_id is
  'Nullable canonical primary sport; profiles.sport remains the legacy compatibility value.';
comment on column public.profiles.sport_discipline_id is
  'Nullable canonical primary discipline, coherent with profiles.sport_id.';
comment on column public.profiles.sport_variant_id is
  'Nullable canonical primary variant, coherent with profiles.sport_discipline_id.';

commit;
