-- Ensure the skills column exists on public.profiles for PROFILE-01
alter table public.profiles
  add column if not exists skills jsonb default '[]'::jsonb;

comment on column public.profiles.skills is 'Elenco di competenze (array di oggetti {name, endorsements_count})';

-- Ensure the JSON value is an array when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_skills_is_array'
      AND table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_skills_is_array
      CHECK (skills IS NULL OR jsonb_typeof(skills) = 'array');
  END IF;
END $$;
