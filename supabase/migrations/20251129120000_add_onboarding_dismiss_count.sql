alter table public.profiles
  add column if not exists onboarding_dismiss_count integer not null default 0;
