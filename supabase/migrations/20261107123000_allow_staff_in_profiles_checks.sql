-- Allow staff account type in profiles constraints (retrocompatible)

alter table if exists public.profiles
  drop constraint if exists profiles_account_type_check;

alter table if exists public.profiles
  add constraint profiles_account_type_check
  check (
    account_type is null
    or account_type in ('athlete', 'club', 'fan', 'staff')
  ) not valid;

alter table if exists public.profiles
  drop constraint if exists profiles_type_check;

alter table if exists public.profiles
  add constraint profiles_type_check
  check (
    type is null
    or type in ('athlete', 'club', 'fan', 'staff')
  ) not valid;
