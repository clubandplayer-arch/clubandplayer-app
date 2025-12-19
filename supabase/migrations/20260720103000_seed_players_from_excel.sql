-- Seed dei player di test (derivati dall'Excel) direttamente in public.profiles
-- Obiettivo: popolare players_view.full_name e rendere i player seguibili/aggiungibili alla Rosa.
-- Zona di interesse per TUTTI: Italia / Sicilia / Siracusa / Carlentini

with seed(full_name, birth_year, nationality, sport, role) as (
values
  ('Salvatore Alicata', 1985, 'Italia', 'Calcio', 'Terzino/Esterno difensivo'),
  ('Alessandro Amato', 2003, 'Italia', 'Calcio', 'Difensore centrale'),
  ('Andrea Basso', 1985, 'Italia', 'Calcio', 'Seconda Punta'),
  ('Sigismondo Bonomo', 1989, 'Italia', 'Calcio', 'Portiere'),
  ('Ferdinando Briganti', 1986, 'Italia', 'Calcio', 'Centrocampista centrale'),
  ('Andrea Carlentini', 2008, 'Italia', 'Calcio', 'Portiere'),
  ('Kevin Carpinteri', 1997, 'Italia', 'Calcio', 'Trequartista'),
  ('Sebastiano Costantino', 1987, 'Italia', 'Calcio', 'Punta Centrale'),
  ('Salvatore Crisci', 2003, 'Italia', 'Calcio', 'Trequartista'),
  ('Alessandro D''Aranno', 1984, 'Italia', 'Calcio', 'Punta Centrale'),
  ('Salvatore Di Domenico', 2003, 'Italia', 'Calcio', 'Esterno offensivo/Ala'),
  ('Ciao Di Mari', 1987, 'Italia', 'Calcio', 'Terzino/Esterno difensivo'),
  ('Marco Ganci', 1985, 'Italia', 'Calcio', 'Portiere'),
  ('Rosario Gibilisco', 2002, 'Italia', 'Calcio', 'Esterno offensivo/Ala'),
  ('Simone Londra', 2007, 'Italia', 'Calcio', 'Portiere'),
  ('Carmelo Longo', 1987, 'Italia', 'Calcio', 'Esterno offensivo/Ala'),
  ('Matteo Mangano', 2005, 'Italia', 'Calcio', 'Centrocampista centrale'),
  ('Salvatore Marchese', 2001, 'Italia', 'Calcio', 'Terzino/Esterno difensivo'),
  ('Mattia Marino', 2005, 'Italia', 'Calcio', 'Difensore centrale'),
  ('Domenico Marturana', 1989, 'Italia', 'Calcio', 'Punta Centrale'),
  ('Davide Modica', 1985, 'Italia', 'Calcio', 'Centrocampista centrale'),
  ('Stefano Nanfitò', 1982, 'Italia', 'Calcio', 'Difensore centrale'),
  ('Enrico Ricceri', 1998, 'Italia', 'Calcio', 'Centrocampista centrale'),
  ('Manlio Rossitto', 1985, 'Italia', 'Calcio', 'Difensore centrale'),
  ('Mirko Rossitto', 1987, 'Italia', 'Calcio', 'Difensore centrale'),
  ('Ibrahim Sanoh', 2007, 'Italia', 'Calcio', 'Esterno offensivo/Ala'),
  ('Sergio Scaparra', 1982, 'Italia', 'Calcio', 'Terzino/Esterno difensivo'),
  ('Samuele Sfilio', 2002, 'Italia', 'Calcio', 'Centrocampista centrale'),
  ('Anthony Sgroi', 2004, 'Italia', 'Calcio', 'Terzino/Esterno difensivo'),
  ('Lorenzo Sgroi', 2005, 'Italia', 'Calcio', 'Centrocampista centrale'),
  ('Omar Sidibe', 2008, 'Italia', 'Calcio', 'Centrocampista centrale')
)
insert into public.profiles (
  id,
  account_type,
  type,
  full_name,
  display_name,
  sport,
  role,
  country,
  birth_year,
  interest_country,
  interest_region,
  interest_province,
  interest_city,
  status,
  created_at,
  updated_at
)
select
  gen_random_uuid() as id,
  'athlete' as account_type,
  'athlete' as type,
  s.full_name,
  s.full_name as display_name,
  s.sport,
  s.role,
  s.nationality,
  s.birth_year,
  'IT' as interest_country,
  'Sicilia' as interest_region,
  'Siracusa' as interest_province,
  'Carlentini' as interest_city,
  'active' as status,
  timezone('utc'::text, now()) as created_at,
  timezone('utc'::text, now()) as updated_at
from seed s
where not exists (
  select 1
  from public.profiles p
  where lower(coalesce(p.full_name, '')) = lower(s.full_name)
    and p.account_type = 'athlete'
);

-- Verifica post-seed (esecuzione manuale consigliata):
-- select full_name from public.players_view order by full_name;
