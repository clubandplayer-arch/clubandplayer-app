-- Aggiunge il campo skills ai profili per gestire competenze ed endorsement futuri
alter table public.profiles
  add column if not exists skills jsonb default '[]'::jsonb;

comment on column public.profiles.skills is 'Elenco di competenze (array di oggetti {name, endorsements_count})';

-- Garantisce che il campo sia un array o nullo
alter table public.profiles
  add constraint profiles_skills_is_array
  check (skills is null or jsonb_typeof(skills) = 'array');
