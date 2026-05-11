-- Align birth year constraint with product requirement: allow years from 1930 onward.
alter table public.profiles
  drop constraint if exists profiles_birth_year_check;

alter table public.profiles
  add constraint profiles_birth_year_check
  check (
    birth_year is null
    or (
      birth_year >= 1930
      and birth_year <= (extract(year from now())::int - 5)
    )
  );
