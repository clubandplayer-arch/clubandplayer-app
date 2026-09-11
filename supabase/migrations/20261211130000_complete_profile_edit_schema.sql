begin;

-- These columns predated the repository migration history in Production but
-- were absent from an empty branch reconstructed by the new baseline.
alter table public.profiles
  add column if not exists birth_place text,
  add column if not exists birth_country text,
  add column if not exists birth_region_id bigint references public.regions(id) on delete set null,
  add column if not exists birth_province_id bigint references public.provinces(id) on delete set null,
  add column if not exists birth_municipality_id bigint references public.municipalities(id) on delete set null,
  add column if not exists residence_region_id bigint references public.regions(id) on delete set null,
  add column if not exists residence_province_id bigint references public.provinces(id) on delete set null,
  add column if not exists residence_municipality_id bigint references public.municipalities(id) on delete set null,
  add column if not exists foot text,
  add column if not exists visibility text,
  add column if not exists notify_email_new_message boolean not null default true,
  add column if not exists club_foundation_year integer,
  add column if not exists club_stadium text,
  add column if not exists club_stadium_address text,
  add column if not exists club_stadium_lat double precision,
  add column if not exists club_stadium_lng double precision,
  add column if not exists club_league_category text,
  add column if not exists club_motto text;

comment on column public.profiles.birth_country is
  'Legacy ISO2 birth country used by the current Profile Edit compatibility contract.';
comment on column public.profiles.notify_email_new_message is
  'Current Profile Edit notification preference; defaults on for existing client compatibility.';

commit;

notify pgrst, 'reload schema';
