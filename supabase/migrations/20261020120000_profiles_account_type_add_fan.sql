begin;

alter table if exists public.profiles
  drop constraint if exists profiles_account_type_check;

alter table if exists public.profiles
  add constraint profiles_account_type_check
  check (
    account_type is null
    or account_type in ('club', 'athlete', 'fan')
  );

commit;
