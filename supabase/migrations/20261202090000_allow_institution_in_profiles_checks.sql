-- Allow Ente Istituzionale accounts in profiles constraints.

alter table if exists public.profiles
  drop constraint if exists profiles_account_type_check;

alter table if exists public.profiles
  add constraint profiles_account_type_check
  check (
    account_type is null
    or account_type in ('athlete', 'club', 'fan', 'staff', 'admin', 'institution')
  ) not valid;

alter table if exists public.profiles
  drop constraint if exists profiles_type_check;

alter table if exists public.profiles
  add constraint profiles_type_check
  check (
    type is null
    or type in ('athlete', 'club', 'fan', 'staff', 'admin', 'institution')
  ) not valid;
